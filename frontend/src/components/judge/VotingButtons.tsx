/**
 * VOTING BUTTONS COMPONENT
 * 1 Green circle (VALID) on top + 3 colored circles (INVALID) below
 * 
 * Invalid reasons:
 * - ROM (red): Range of Motion - insufficient depth/height
 * - Discesa (blue): Descent - incorrect lowering phase
 * - Altro (yellow): Other reasons
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

  // Common button styles for touch-friendly experience
  const baseButtonClass = `
    flex items-center justify-center
    rounded-full
    transition-all duration-200
    font-bold text-2xl
    shadow-lg
    active:scale-95
    disabled:opacity-40 disabled:cursor-not-allowed
  `;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* VALID Section - 1 Green Circle (TOP) */}
      <div className="text-center">
        <p className="text-sm text-dark-text-secondary mb-3 uppercase tracking-wider font-medium">
          Valida
        </p>
        <button
          onClick={handleVoteValid}
          disabled={disabled || hasVoted}
          className={`${baseButtonClass} 
            w-28 h-28 sm:w-32 sm:h-32
            bg-green-500/20 border-2 border-green-500/50 text-green-400
            hover:bg-green-500/30 hover:border-green-500
            ${hasVoted && lastVote === true ? 'ring-4 ring-green-500 bg-green-500/40' : ''}
          `}
          title="Valida"
        >
          <Check className="w-14 h-14" />
        </button>
      </div>

      {/* Divider */}
      <div className="w-full max-w-xs border-t border-dark-border"></div>

      {/* INVALID Section - 3 Colored Circles (BOTTOM) */}
      <div className="text-center">
        <p className="text-sm text-dark-text-secondary mb-3 uppercase tracking-wider font-medium">
          Non Valida
        </p>
        <div className="flex justify-center gap-6 sm:gap-8">
          {/* Button 1 - ROM (Red) - Range of Motion */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleVoteInvalid('ROM')}
              disabled={disabled || hasVoted}
              className={`${baseButtonClass} 
                w-28 h-28 sm:w-32 sm:h-32
                bg-red-500/20 border-2 border-red-500/50 text-red-400
                hover:bg-red-500/30 hover:border-red-500
                ${hasVoted && lastVote === false ? 'ring-4 ring-red-500 bg-red-500/40' : ''}
              `}
              title="ROM - Range of Motion"
            >
              <ArrowUpDown className="w-14 h-14" />
            </button>
            <span className="mt-2 text-xs text-red-400 font-medium">ROM</span>
          </div>

          {/* Button 2 - Discesa (Blue) */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleVoteInvalid('DISCESA')}
              disabled={disabled || hasVoted}
              className={`${baseButtonClass} 
                w-28 h-28 sm:w-32 sm:h-32
                bg-blue-500/20 border-2 border-blue-500/50 text-blue-400
                hover:bg-blue-500/30 hover:border-blue-500
                ${hasVoted && lastVote === false ? 'ring-4 ring-blue-500 bg-blue-500/40' : ''}
              `}
              title="Discesa"
            >
              <ArrowDown className="w-14 h-14" />
            </button>
            <span className="mt-2 text-xs text-blue-400 font-medium">Discesa</span>
          </div>

          {/* Button 3 - Altro (Yellow) */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleVoteInvalid('ALTRO')}
              disabled={disabled || hasVoted}
              className={`${baseButtonClass} 
                w-28 h-28 sm:w-32 sm:h-32
                bg-yellow-500/20 border-2 border-yellow-500/50 text-yellow-400
                hover:bg-yellow-500/30 hover:border-yellow-500
                ${hasVoted && lastVote === false ? 'ring-4 ring-yellow-500 bg-yellow-500/40' : ''}
              `}
              title="Altro"
            >
              <HelpCircle className="w-14 h-14" />
            </button>
            <span className="mt-2 text-xs text-yellow-400 font-medium">Altro</span>
          </div>
        </div>
      </div>

      {/* Feedback after voting */}
      {hasVoted && !voteResult && (
        <div className="mt-4 px-6 py-3 rounded-lg text-center font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
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
          mt-4 px-6 py-4 rounded-xl text-center font-bold text-xl
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
