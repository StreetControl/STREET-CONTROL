/**
 * VOTING SERVICE
 * 
 * Manages judge votes IN MEMORY (not persisted in DB).
 * Implements 2/3 voting logic: 2 valid votes = VALID, 2 invalid = INVALID
 * 
 * Flow:
 * 1. Judge submits vote via submitVote()
 * 2. Vote stored in memory Map
 * 3. When 3 votes received → calculate result
 * 4. Update attempts.status in DB
 * 5. Clear votes from memory
 */

import { supabaseAdmin } from './supabase.js';

// Types
type JudgePosition = 'HEAD' | 'LEFT' | 'RIGHT';
type VoteResult = 'VALID' | 'INVALID' | 'PENDING';

interface PendingVotes {
  votes: Map<JudgePosition, boolean>;  // true = valid, false = invalid
  attemptId: number;
  groupId: number;
  liftId: string;
  createdAt: Date;
  timeout: NodeJS.Timeout;
}

interface VoteResponse {
  success: boolean;
  votesReceived: number;
  totalExpected: number;
  finalResult: VoteResult | null;
  message?: string;
  error?: string;
}

// In-memory storage for pending votes
// Key: `${groupId}-${liftId}` (current attempt context)
const pendingVotesMap = new Map<string, PendingVotes>();

// Timeout for cleaning orphan votes (60 seconds)
const VOTE_TIMEOUT_MS = 60000;

/**
 * Generate unique key for vote context
 */
function getVoteKey(groupId: number, liftId: string): string {
  return `${groupId}-${liftId}`;
}

/**
 * Submit a judge vote
 * 
 * @param attemptId - The attempt being judged
 * @param judgePosition - HEAD, LEFT, or RIGHT
 * @param vote - true for VALID, false for INVALID
 * @param groupId - Current group ID
 * @param liftId - Current lift ID
 */
export async function submitVote(
  attemptId: number,
  judgePosition: JudgePosition,
  vote: boolean,
  groupId: number,
  liftId: string
): Promise<VoteResponse> {
  try {
    const voteKey = getVoteKey(groupId, liftId);
    
    // Get or create pending votes for this context
    let pending = pendingVotesMap.get(voteKey);
    
    if (!pending) {
      // Create new pending votes entry
      const timeout = setTimeout(() => {
        // Clean up orphan votes after timeout
        pendingVotesMap.delete(voteKey);
        console.log(`[VotingService] Cleaned up orphan votes for ${voteKey}`);
      }, VOTE_TIMEOUT_MS);

      pending = {
        votes: new Map(),
        attemptId,
        groupId,
        liftId,
        createdAt: new Date(),
        timeout
      };
      pendingVotesMap.set(voteKey, pending);
    }

    // Check if voting for different attempt (new athlete)
    if (pending.attemptId !== attemptId) {
      // Clear old votes and start fresh
      clearTimeout(pending.timeout);
      const newTimeout = setTimeout(() => {
        pendingVotesMap.delete(voteKey);
      }, VOTE_TIMEOUT_MS);

      pending = {
        votes: new Map(),
        attemptId,
        groupId,
        liftId,
        createdAt: new Date(),
        timeout: newTimeout
      };
      pendingVotesMap.set(voteKey, pending);
    }

    // Check if this judge already voted
    if (pending.votes.has(judgePosition)) {
      return {
        success: false,
        votesReceived: pending.votes.size,
        totalExpected: 3,
        finalResult: null,
        error: `Judge ${judgePosition} has already voted for this attempt`
      };
    }

    // Record the vote
    pending.votes.set(judgePosition, vote);
    
    console.log(`[VotingService] Vote received: ${judgePosition} = ${vote ? 'VALID' : 'INVALID'} for attempt ${attemptId}`);
    console.log(`[VotingService] Votes so far: ${pending.votes.size}/3`);

    // Check if we have all 3 votes
    if (pending.votes.size === 3) {
      // Calculate result (2/3 majority)
      const validVotes = Array.from(pending.votes.values()).filter(v => v === true).length;
      const invalidVotes = 3 - validVotes;
      
      const finalResult: VoteResult = validVotes >= 2 ? 'VALID' : 'INVALID';
      
      console.log(`[VotingService] All votes received! Valid: ${validVotes}, Invalid: ${invalidVotes} → Result: ${finalResult}`);

      // Update database
      const { error: updateError } = await supabaseAdmin
        .from('attempts')
        .update({ status: finalResult })
        .eq('id', attemptId);

      if (updateError) {
        console.error('[VotingService] Failed to update attempt:', updateError);
        return {
          success: false,
          votesReceived: 3,
          totalExpected: 3,
          finalResult: null,
          error: 'Failed to save result to database'
        };
      }

      // Clear pending votes
      clearTimeout(pending.timeout);
      pendingVotesMap.delete(voteKey);

      return {
        success: true,
        votesReceived: 3,
        totalExpected: 3,
        finalResult,
        message: `Attempt marked as ${finalResult}`
      };
    }

    // Not all votes yet
    return {
      success: true,
      votesReceived: pending.votes.size,
      totalExpected: 3,
      finalResult: null,
      message: `Vote recorded. Waiting for ${3 - pending.votes.size} more vote(s)`
    };

  } catch (error: any) {
    console.error('[VotingService] Error:', error);
    return {
      success: false,
      votesReceived: 0,
      totalExpected: 3,
      finalResult: null,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Get current vote status for a context
 */
export function getVoteStatus(groupId: number, liftId: string): {
  hasVotes: boolean;
  votesReceived: number;
  judges: JudgePosition[];
} {
  const voteKey = getVoteKey(groupId, liftId);
  const pending = pendingVotesMap.get(voteKey);
  
  if (!pending) {
    return {
      hasVotes: false,
      votesReceived: 0,
      judges: []
    };
  }

  return {
    hasVotes: true,
    votesReceived: pending.votes.size,
    judges: Array.from(pending.votes.keys())
  };
}

/**
 * Clear all pending votes for a context (called when advancing to next athlete)
 */
export function clearVotes(groupId: number, liftId: string): void {
  const voteKey = getVoteKey(groupId, liftId);
  const pending = pendingVotesMap.get(voteKey);
  
  if (pending) {
    clearTimeout(pending.timeout);
    pendingVotesMap.delete(voteKey);
    console.log(`[VotingService] Cleared votes for ${voteKey}`);
  }
}

/**
 * Reset a judge's vote (if they made a mistake before all votes are in)
 */
export function resetJudgeVote(
  groupId: number,
  liftId: string,
  judgePosition: JudgePosition
): boolean {
  const voteKey = getVoteKey(groupId, liftId);
  const pending = pendingVotesMap.get(voteKey);
  
  if (!pending || !pending.votes.has(judgePosition)) {
    return false;
  }

  pending.votes.delete(judgePosition);
  console.log(`[VotingService] Reset vote for ${judgePosition} in ${voteKey}`);
  return true;
}

export default {
  submitVote,
  getVoteStatus,
  clearVotes,
  resetJudgeVote
};
