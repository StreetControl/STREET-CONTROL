/**
 * ATHLETE INFO CARD
 * Displays current athlete name for judges (simplified)
 */

interface AthleteInfoCardProps {
  firstName: string;
  lastName: string;
  isLoading?: boolean;
}

export default function AthleteInfoCard({
  firstName,
  lastName,
  isLoading = false
}: AthleteInfoCardProps) {
  if (isLoading) {
    return (
      <div className="bg-dark-bg-secondary border border-dark-border rounded-xl p-4 animate-pulse">
        <div className="h-8 bg-dark-border rounded w-3/4 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="bg-dark-bg-secondary border border-dark-border rounded-xl p-4">
      {/* Athlete Name Only */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-dark-text">
          {firstName} {lastName}
        </h2>
      </div>
    </div>
  );
}
