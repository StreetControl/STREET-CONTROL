/**
 * VOTING BUTTONS COMPONENT
 * Vertical layout with rectangular buttons for instant voting
 * 
 * Layout:
 * - VALIDA (green rectangle) - top
 * - Divider
 * - ROM (red rectangle)
 * - DISCESA (blue rectangle)
 * - ALTRO (yellow rectangle)
 * 
 * Touch-friendly design for mobile devices
 */

import { Check, ArrowUpDown, ArrowDown, HelpCircle } from 'lucide-react';

export type InvalidReason = 'ROM' | 'DISCESA' | 'ALTRO';

interface VotingButtonsProps {
  onVote: (isValid: boolean, reason?: InvalidReason) => void;
  disabled?: boolean;
  hasVoted?: boolean;
  lastVote?: boolean | null;  // true = valid, false = invalid, null = no vote yet
  voteResult?: string | null;  // 'VALID' | 'INVALID' | null
  votesReceived?: number;
}

export default function VotingButtons({
  onVote,
  disabled = false,
  hasVoted = false,
  lastVote = null,
  voteResult = null,
  votesReceived = 0
}: VotingButtonsProps) {
  const handleVoteValid = () => {
    if (!disabled && !hasVoted) {
      onVote(true);
    }
  };

  const handleVoteInvalid = (reason: InvalidReason) => {
    if (!disabled && !hasVoted) {
      onVote(false, reason);
    }
  };

  // Common button styles for rectangular buttons
  const baseButtonClass = `
    w-full flex items-center justify-center gap-3
    rounded-xl
    transition-all duration-200
    font-bold text-lg
    shadow-lg
    active:scale-[0.98]
    disabled:opacity-40 disabled:cursor-not-allowed
  `;

  return (
    <div className="flex flex-col gap-3 w-full max-w-md mx-auto">
      {/* VALID Button - Green Rectangle */}
      <button
        onClick={handleVoteValid}
        disabled={disabled || hasVoted}
        className={`${baseButtonClass} 
          py-7
          bg-green-500/20 border-2 border-green-500/50 text-green-400
          hover:bg-green-500/30 hover:border-green-500
          ${hasVoted && lastVote === true ? 'ring-4 ring-green-500 bg-green-500/40' : ''}
        `}
      >
        <Check className="w-8 h-8" />
        <span className="text-xl">VALIDA</span>
      </button>

      {/* ROM - Red */}
      <button
        onClick={() => handleVoteInvalid('ROM')}
        disabled={disabled || hasVoted}
        className={`${baseButtonClass} 
          py-6
          bg-red-500/20 border-2 border-red-500/50 text-red-400
          hover:bg-red-500/30 hover:border-red-500
          ${hasVoted && lastVote === false ? 'ring-4 ring-red-500 bg-red-500/40' : ''}
        `}
      >
        <span>NON VALIDA</span>
        <ArrowUpDown className="w-6 h-6" />
        <span className="font-normal opacity-80">ROM</span>
      </button>

      {/* DISCESA - Blue */}
      <button
        onClick={() => handleVoteInvalid('DISCESA')}
        disabled={disabled || hasVoted}
        className={`${baseButtonClass} 
          py-6
          bg-blue-500/20 border-2 border-blue-500/50 text-blue-400
          hover:bg-blue-500/30 hover:border-blue-500
          ${hasVoted && lastVote === false ? 'ring-4 ring-blue-500 bg-blue-500/40' : ''}
        `}
      >
        <span>NON VALIDA</span>
        <ArrowDown className="w-6 h-6" />
        <span className="font-normal opacity-80">DISCESA</span>
      </button>

      {/* ALTRO - Yellow */}
      <button
        onClick={() => handleVoteInvalid('ALTRO')}
        disabled={disabled || hasVoted}
        className={`${baseButtonClass} 
          py-6
          bg-yellow-500/20 border-2 border-yellow-500/50 text-yellow-400
          hover:bg-yellow-500/30 hover:border-yellow-500
          ${hasVoted && lastVote === false ? 'ring-4 ring-yellow-500 bg-yellow-500/40' : ''}
        `}
      >
        <span>NON VALIDA</span>
        <HelpCircle className="w-6 h-6" />
        <span className="font-normal opacity-80">ALTRO</span>
      </button>

      {/* Feedback after voting */}
      {hasVoted && !voteResult && (
        <div className="mt-2 px-4 py-3 rounded-lg text-center font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span>Voto registrato ({votesReceived}/3)</span>
          </div>
          <p className="text-xs opacity-75 mt-1">In attesa degli altri giudici...</p>
        </div>
      )}

      {/* Final Result */}
      {voteResult && (
        <div className={`
          mt-2 px-4 py-3 rounded-xl text-center font-bold text-lg
          ${voteResult === 'VALID' 
            ? 'bg-green-500/20 text-green-400 border-2 border-green-500' 
            : 'bg-red-500/20 text-red-400 border-2 border-red-500'}
        `}>
          {voteResult === 'VALID' ? '✓ PROVA VALIDA' : '✗ PROVA NON VALIDA'}
        </div>
      )}
    </div>
  );
}
