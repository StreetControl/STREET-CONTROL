/**
 * VOTING SERVICE
 * 
 * Manages judge votes IN MEMORY (not persisted in DB).
 * Implements 2/3 voting logic: 2 valid votes = VALID, 2 invalid = INVALID
 * 
 * REALTIME BROADCAST:
 * When a judge votes, we broadcast the vote to all display screens
 * using Supabase Realtime Broadcast - no DB storage needed.
 * 
 * Flow:
 * 1. Judge submits vote via submitVote()
 * 2. Vote stored in memory Map
 * 3. BROADCAST vote to display screens immediately
 * 4. When 3 votes received → calculate result
 * 5. Update attempts.status in DB
 * 6. Advance to next athlete (update current_state)
 * 7. Clear votes from memory
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
  advanced?: boolean;  // true if we advanced to next athlete
  nextAthleteId?: number | null;
  message?: string;
  error?: string;
}

// In-memory storage for pending votes
// Key: `${groupId}-${liftId}` (current attempt context)
const pendingVotesMap = new Map<string, PendingVotes>();

// Timeout for cleaning orphan votes (60 seconds)
const VOTE_TIMEOUT_MS = 60000;

/**
 * BROADCAST a vote to display screens
 * Uses Supabase Realtime Broadcast - no DB storage
 */
async function broadcastVote(
  meetId: number,
  groupId: number,
  liftId: string,
  judgePosition: JudgePosition,
  vote: boolean,
  votesReceived: number,
  allVotes: Map<JudgePosition, boolean>
): Promise<void> {
  const channelName = `display_votes_${meetId}`;

  const votesObject: Record<JudgePosition, boolean | null> = {
    HEAD: allVotes.has('HEAD') ? allVotes.get('HEAD')! : null,
    LEFT: allVotes.has('LEFT') ? allVotes.get('LEFT')! : null,
    RIGHT: allVotes.has('RIGHT') ? allVotes.get('RIGHT')! : null
  };

  const channel = supabaseAdmin.channel(channelName);

  await channel.send({
    type: 'broadcast',
    event: 'judge_vote',
    payload: {
      groupId,
      liftId,
      judgePosition,
      vote,
      votesReceived,
      totalExpected: 3,
      votes: votesObject,
      timestamp: new Date().toISOString()
    }
  });

  console.log(`[VotingService] Broadcasted vote: ${judgePosition} = ${vote ? 'VALID' : 'INVALID'}`);
}

/**
 * BROADCAST timer started event
 */
export async function broadcastTimerStarted(
  meetId: number,
  groupId: number,
  liftId: string,
  seconds: number
): Promise<void> {
  const channelName = `display_votes_${meetId}`;
  const channel = supabaseAdmin.channel(channelName);

  await channel.send({
    type: 'broadcast',
    event: 'timer_started',
    payload: {
      groupId,
      liftId,
      seconds,
      startedAt: new Date().toISOString()
    }
  });

  console.log(`[VotingService] Broadcasted timer started: ${seconds}s`);
}

/**
 * BROADCAST final result
 */
async function broadcastFinalResult(
  meetId: number,
  groupId: number,
  liftId: string,
  result: VoteResult,
  votes: Map<JudgePosition, boolean>
): Promise<void> {
  const channelName = `display_votes_${meetId}`;

  const votesObject: Record<JudgePosition, boolean | null> = {
    HEAD: votes.has('HEAD') ? votes.get('HEAD')! : null,
    LEFT: votes.has('LEFT') ? votes.get('LEFT')! : null,
    RIGHT: votes.has('RIGHT') ? votes.get('RIGHT')! : null
  };

  const channel = supabaseAdmin.channel(channelName);

  await channel.send({
    type: 'broadcast',
    event: 'final_result',
    payload: {
      groupId,
      liftId,
      result,
      votes: votesObject,
      timestamp: new Date().toISOString()
    }
  });

  console.log(`[VotingService] Broadcasted final result: ${result}`);
}

/**
 * Generate unique key for vote context
 */
function getVoteKey(groupId: number, liftId: string): string {
  return `${groupId}-${liftId}`;
}

/**
 * Sort athletes by attempt weight (for determining next athlete)
 */
function sortAthletesByAttemptWeight(athletes: any[], attemptNo: number): any[] {
  return [...athletes].sort((a, b) => {
    const attemptKey = `attempt${attemptNo}` as 'attempt1' | 'attempt2' | 'attempt3';
    const attemptA = a[attemptKey];
    const attemptB = b[attemptKey];

    const weightA = attemptA?.weight_kg;
    const weightB = attemptB?.weight_kg;

    // null/undefined weights go last
    if (weightA === null || weightA === undefined) return 1;
    if (weightB === null || weightB === undefined) return -1;

    // Sort by weight ascending
    if (weightA !== weightB) return weightA - weightB;

    // Tie-breaker: higher bodyweight goes first
    return (b.bodyweight_kg || 0) - (a.bodyweight_kg || 0);
  });
}

/**
 * Find next athlete who needs to attempt
 */
function findNextAthleteForRound(athletes: any[], attemptNo: number): any | null {
  const attemptKey = `attempt${attemptNo}` as 'attempt1' | 'attempt2' | 'attempt3';
  const sorted = sortAthletesByAttemptWeight(athletes, attemptNo);

  for (const athlete of sorted) {
    const attempt = athlete[attemptKey];
    if (!attempt || attempt.status === 'PENDING') {
      return athlete;
    }
  }
  return null;
}

/**
 * Advance to next athlete after voting is complete
 * Returns the next athlete's weight_in_info_id or null if group completed
 */
async function advanceToNextAthleteInternal(groupId: number, liftId: string): Promise<{
  advanced: boolean;
  nextAthleteId: number | null;
  currentRound: number;
}> {
  try {
    // Get current state
    const { data: currentState } = await supabaseAdmin
      .from('current_state')
      .select('*')
      .eq('group_id', groupId)
      .eq('lift_id', liftId)
      .maybeSingle();

    if (!currentState) {
      return { advanced: false, nextAthleteId: null, currentRound: 1 };
    }

    // Get nominations for this group
    const { data: nominations } = await supabaseAdmin
      .from('nomination')
      .select('id')
      .eq('group_id', groupId);

    if (!nominations || nominations.length === 0) {
      return { advanced: false, nextAthleteId: null, currentRound: currentState.current_attempt_no };
    }

    const nomIds = nominations.map(n => n.id);

    // Get weight_in_info for all nominations
    const { data: weighInInfos } = await supabaseAdmin
      .from('weight_in_info')
      .select('id, nomination_id, bodyweight_kg')
      .in('nomination_id', nomIds);

    if (!weighInInfos || weighInInfos.length === 0) {
      return { advanced: false, nextAthleteId: null, currentRound: currentState.current_attempt_no };
    }

    // Get all attempts for this lift
    const wiiIds = weighInInfos.map(w => w.id);
    const { data: allAttempts } = await supabaseAdmin
      .from('attempts')
      .select('id, weight_in_info_id, attempt_no, weight_kg, status')
      .in('weight_in_info_id', wiiIds)
      .eq('lift_id', liftId);

    // Build athlete data
    const athleteData = weighInInfos.map(wii => {
      const attempts = (allAttempts || []).filter(a => a.weight_in_info_id === wii.id);
      const attemptsMap: Record<number, any> = {};
      attempts.forEach(att => {
        attemptsMap[att.attempt_no] = {
          id: att.id,
          weight_kg: Number(att.weight_kg),
          status: att.status
        };
      });

      return {
        weight_in_info_id: wii.id,
        bodyweight_kg: wii.bodyweight_kg,
        attempt1: attemptsMap[1] || null,
        attempt2: attemptsMap[2] || null,
        attempt3: attemptsMap[3] || null
      };
    });

    // Find next athlete
    let currentRound = currentState.current_attempt_no;
    let nextAthlete = findNextAthleteForRound(athleteData, currentRound);

    // If no athlete found in current round, try next rounds
    if (!nextAthlete && currentRound < 3) {
      currentRound++;
      nextAthlete = findNextAthleteForRound(athleteData, currentRound);
    }
    if (!nextAthlete && currentRound < 3) {
      currentRound = 3;
      nextAthlete = findNextAthleteForRound(athleteData, currentRound);
    }

    // Update current_state
    const { error: updateError } = await supabaseAdmin
      .from('current_state')
      .update({
        current_attempt_no: currentRound,
        current_weight_in_info_id: nextAthlete?.weight_in_info_id || null,
        completed: !nextAthlete,
        updated_at: new Date().toISOString()
      })
      .eq('group_id', groupId)
      .eq('lift_id', liftId);

    if (updateError) {
      console.error('[VotingService] Failed to update current_state:', updateError);
      return { advanced: false, nextAthleteId: null, currentRound };
    }

    console.log(`[VotingService] Advanced to next athlete: ${nextAthlete?.weight_in_info_id || 'GROUP COMPLETED'}`);

    return {
      advanced: true,
      nextAthleteId: nextAthlete?.weight_in_info_id || null,
      currentRound
    };

  } catch (error) {
    console.error('[VotingService] Error advancing:', error);
    return { advanced: false, nextAthleteId: null, currentRound: 1 };
  }
}

/**
 * Submit a judge vote
 * 
 * @param attemptId - The attempt being judged
 * @param judgePosition - HEAD, LEFT, or RIGHT
 * @param vote - true for VALID, false for INVALID
 * @param groupId - Current group ID
 * @param liftId - Current lift ID
 * @param meetId - Meet ID (for broadcast)
 */
export async function submitVote(
  attemptId: number,
  judgePosition: JudgePosition,
  vote: boolean,
  groupId: number,
  liftId: string,
  meetId: number
): Promise<VoteResponse> {
  try {
    const voteKey = getVoteKey(groupId, liftId);

    // Get or create pending votes for this context
    let pending = pendingVotesMap.get(voteKey);

    if (!pending) {
      // Create new pending votes entry
      const timeout = setTimeout(() => {
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

    // BROADCAST the vote to display screens immediately
    try {
      await broadcastVote(meetId, groupId, liftId, judgePosition, vote, pending.votes.size, pending.votes);
    } catch (broadcastError) {
      console.error('[VotingService] Broadcast error (non-fatal):', broadcastError);
    }

    // Check if we have all 3 votes
    if (pending.votes.size === 3) {
      // Calculate result (2/3 majority)
      const validVotes = Array.from(pending.votes.values()).filter(v => v === true).length;
      const invalidVotes = 3 - validVotes;

      const finalResult: VoteResult = validVotes >= 2 ? 'VALID' : 'INVALID';

      console.log(`[VotingService] All votes received! Valid: ${validVotes}, Invalid: ${invalidVotes} → Result: ${finalResult}`);

      // BROADCAST final result to display screens
      try {
        await broadcastFinalResult(meetId, groupId, liftId, finalResult, pending.votes);
      } catch (broadcastError) {
        console.error('[VotingService] Broadcast error (non-fatal):', broadcastError);
      }

      // Update attempt status in database
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

      // ADVANCE TO NEXT ATHLETE
      const advanceResult = await advanceToNextAthleteInternal(groupId, liftId);

      // Clear pending votes
      clearTimeout(pending.timeout);
      pendingVotesMap.delete(voteKey);

      return {
        success: true,
        votesReceived: 3,
        totalExpected: 3,
        finalResult,
        advanced: advanceResult.advanced,
        nextAthleteId: advanceResult.nextAthleteId,
        message: `Attempt marked as ${finalResult}. ${advanceResult.nextAthleteId ? 'Next athlete ready.' : 'Group completed!'}`
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
 * FORCE INVALID - Called by HEAD judge X button
 * Immediately marks attempt as INVALID and advances
 */
export async function forceInvalid(
  attemptId: number,
  groupId: number,
  liftId: string,
  meetId: number
): Promise<VoteResponse> {
  try {
    console.log(`[VotingService] HEAD JUDGE FORCE INVALID for attempt ${attemptId}`);

    // Clear any pending votes for this context
    const voteKey = getVoteKey(groupId, liftId);
    const pending = pendingVotesMap.get(voteKey);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingVotesMap.delete(voteKey);
    }

    // Update attempt status to INVALID
    const { error: updateError } = await supabaseAdmin
      .from('attempts')
      .update({ status: 'INVALID' })
      .eq('id', attemptId);

    if (updateError) {
      console.error('[VotingService] Failed to update attempt:', updateError);
      return {
        success: false,
        votesReceived: 0,
        totalExpected: 3,
        finalResult: null,
        error: 'Failed to save result to database'
      };
    }

    // BROADCAST force invalid result to display screens
    try {
      const forceInvalidVotes = new Map<JudgePosition, boolean>();
      forceInvalidVotes.set('HEAD', false);
      forceInvalidVotes.set('LEFT', false);
      forceInvalidVotes.set('RIGHT', false);
      await broadcastFinalResult(meetId, groupId, liftId, 'INVALID', forceInvalidVotes);
    } catch (broadcastError) {
      console.error('[VotingService] Broadcast error (non-fatal):', broadcastError);
    }

    // ADVANCE TO NEXT ATHLETE
    const advanceResult = await advanceToNextAthleteInternal(groupId, liftId);

    return {
      success: true,
      votesReceived: 3,  // Fake 3/3 for UI consistency
      totalExpected: 3,
      finalResult: 'INVALID',
      advanced: advanceResult.advanced,
      nextAthleteId: advanceResult.nextAthleteId,
      message: `HEAD JUDGE: Attempt marked as INVALID. ${advanceResult.nextAthleteId ? 'Next athlete ready.' : 'Group completed!'}`
    };

  } catch (error: any) {
    console.error('[VotingService] Force invalid error:', error);
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
 * Clear all pending votes for a context
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
 * Reset a judge's vote
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
  forceInvalid,
  getVoteStatus,
  clearVotes,
  resetJudgeVote
};
