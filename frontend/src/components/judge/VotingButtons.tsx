/**
 * VOTING BUTTONS COMPONENT
 * 1 Green circle (VALID) + 3 Red circles (INVALID)
 * 
 * Touch-friendly design for mobile devices
 */

import { Check, X, HelpCircle, AlertTriangle } from 'lucide-react';

interface VotingButtonsProps {
  onVote: (isValid: boolean) => void;
  disabled?: boolean;
  hasVoted?: boolean;
  lastVote?: boolean | null;  // true = valid, false = invalid, null = no vote yet
}

export default function VotingButtons({
  onVote,
  disabled = false,
  hasVoted = false,
  lastVote = null
}: VotingButtonsProps) {
  const handleVoteValid = () => {
    if (!disabled && !hasVoted) {
      onVote(true);
    }
  };

  const handleVoteInvalid = () => {
    if (!disabled && !hasVoted) {
      onVote(false);
    }
  };

  // Common button styles for touch-friendly experience
  const baseButtonClass = `
    flex items-center justify-center
    w-20 h-20 sm:w-24 sm:h-24
    rounded-full
    transition-all duration-200
    font-bold text-2xl
    shadow-lg
    active:scale-95
    disabled:opacity-40 disabled:cursor-not-allowed
  `;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* INVALID Section - 3 Red Circles */}
      <div className="text-center">
        <p className="text-sm text-dark-text-secondary mb-3 uppercase tracking-wider font-medium">
          Non Valida
        </p>
        <div className="flex justify-center gap-4">
          {/* Time Out */}
          <button
            onClick={handleVoteInvalid}
            disabled={disabled || hasVoted}
            className={`${baseButtonClass} 
              bg-red-500/20 border-2 border-red-500/50 text-red-400
              hover:bg-red-500/30 hover:border-red-500
              ${hasVoted && lastVote === false ? 'ring-4 ring-red-500 bg-red-500/40' : ''}
            `}
            title="Fuori tempo"
          >
            <X className="w-10 h-10" />
          </button>

          {/* Technical Error */}
          <button
            onClick={handleVoteInvalid}
            disabled={disabled || hasVoted}
            className={`${baseButtonClass} 
              bg-red-500/20 border-2 border-red-500/50 text-red-400
              hover:bg-red-500/30 hover:border-red-500
              ${hasVoted && lastVote === false ? 'ring-4 ring-red-500 bg-red-500/40' : ''}
            `}
            title="Errore tecnico"
          >
            <AlertTriangle className="w-10 h-10" />
          </button>

          {/* Doubtful */}
          <button
            onClick={handleVoteInvalid}
            disabled={disabled || hasVoted}
            className={`${baseButtonClass} 
              bg-red-500/20 border-2 border-red-500/50 text-red-400
              hover:bg-red-500/30 hover:border-red-500
              ${hasVoted && lastVote === false ? 'ring-4 ring-red-500 bg-red-500/40' : ''}
            `}
            title="Dubbia"
          >
            <HelpCircle className="w-10 h-10" />
          </button>
        </div>
        <div className="flex justify-center gap-4 mt-2">
          <span className="w-20 sm:w-24 text-xs text-dark-text-secondary text-center">Tempo</span>
          <span className="w-20 sm:w-24 text-xs text-dark-text-secondary text-center">Tecnica</span>
          <span className="w-20 sm:w-24 text-xs text-dark-text-secondary text-center">Dubbia</span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full max-w-xs border-t border-dark-border"></div>

      {/* VALID Section - 1 Green Circle */}
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

      {/* Feedback after voting */}
      {hasVoted && (
        <div className={`
          mt-4 px-6 py-3 rounded-lg text-center font-medium
          ${lastVote ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}
        `}>
          {lastVote 
            ? '✓ Hai votato: VALIDA' 
            : '✗ Hai votato: NON VALIDA'}
          <p className="text-xs opacity-75 mt-1">In attesa degli altri giudici...</p>
        </div>
      )}
    </div>
  );
}
