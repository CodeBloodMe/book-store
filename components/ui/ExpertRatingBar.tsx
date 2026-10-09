interface ExpertRatingBarProps {
  rating: number | null;
  /** Label to show (e.g., "Expert Rating", "AI Score") */
  label?: string;
}

export default function ExpertRatingBar({ rating, label = 'Expert Score' }: ExpertRatingBarProps) {
  if (!rating || rating <= 0) return null;

  // Clamp rating to 0-100
  const clampedRating = Math.min(100, Math.max(0, rating));

  // Color gradient: red (0) → yellow (50) → green (100)
  const getColor = (value: number) => {
    if (value >= 80) return { bg: '#059669', text: '#fff', track: '#d1fae5', label: 'Exceptional' };
    if (value >= 65) return { bg: '#0284c7', text: '#fff', track: '#e0f2fe', label: 'Very Good' };
    if (value >= 50) return { bg: '#d97706', text: '#fff', track: '#fef3c7', label: 'Good' };
    if (value >= 30) return { bg: '#ea580c', text: '#fff', track: '#ffedd5', label: 'Mixed' };
    return { bg: '#dc2626', text: '#fff', track: '#fee2e2', label: 'Poor' };
  };

  const colors = getColor(clampedRating);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.bg }}>
            {colors.label}
          </span>
          <span
            className="text-sm font-black px-2 py-0.5 rounded-md"
            style={{
              background: colors.bg,
              color: colors.text,
            }}
          >
            {clampedRating}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-2.5 rounded-full overflow-hidden"
        style={{ background: colors.track }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${clampedRating}%`,
            background: colors.bg,
          }}
        />
      </div>
    </div>
  );
}
