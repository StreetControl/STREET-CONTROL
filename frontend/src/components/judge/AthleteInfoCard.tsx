/**
 * ATHLETE INFO CARD
 * Displays current athlete information for judges
 */

interface AthleteInfoCardProps {
  firstName: string;
  lastName: string;
  weightCategory: string;
  liftName: string;
  attemptNumber: number;
  weightKg: number | null;
  isLoading?: boolean;
}

export default function AthleteInfoCard({
  firstName,
  lastName,
  weightCategory,
  liftName,
  attemptNumber,
  weightKg,
  isLoading = false
}: AthleteInfoCardProps) {
  if (isLoading) {
    return (
      <div className="bg-dark-bg-secondary border border-dark-border rounded-xl p-6 animate-pulse">
        <div className="h-8 bg-dark-border rounded w-3/4 mx-auto mb-3"></div>
        <div className="h-5 bg-dark-border rounded w-1/2 mx-auto mb-4"></div>
        <div className="flex justify-center gap-4">
          <div className="h-10 bg-dark-border rounded w-24"></div>
          <div className="h-10 bg-dark-border rounded w-24"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-bg-secondary border border-dark-border rounded-xl p-6">
      {/* Athlete Name */}
      <div className="text-center mb-3">
        <h2 className="text-2xl sm:text-3xl font-bold text-dark-text">
          {firstName} {lastName}
        </h2>
      </div>

      {/* Weight Category */}
      <div className="text-center mb-4">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary font-medium">
          {weightCategory}
        </span>
      </div>

      {/* Lift Info */}
      <div className="flex justify-center items-center gap-4 text-center">
        <div className="bg-dark-bg rounded-lg px-4 py-2 border border-dark-border">
          <span className="block text-xs text-dark-text-secondary uppercase tracking-wider">Alzata</span>
          <span className="text-lg font-bold text-dark-text">{liftName} #{attemptNumber}</span>
        </div>
        
        <div className="bg-dark-bg rounded-lg px-4 py-2 border border-dark-border">
          <span className="block text-xs text-dark-text-secondary uppercase tracking-wider">Peso</span>
          <span className="text-lg font-bold text-primary">
            {weightKg !== null ? `${weightKg} kg` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
