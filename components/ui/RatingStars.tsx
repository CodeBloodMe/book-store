// ============================================================
// RatingStars — Displays filled/half/empty stars for a rating.
// Pure presentational — no interactivity required.
// Server Component safe.
// ============================================================

interface RatingStarsProps {
  rating: number | null;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

export default function RatingStars({
  rating,
  maxStars = 5,
  size = 'sm',
  showValue = false,
}: RatingStarsProps) {
  if (rating === null || rating === undefined) {
    return <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No rating</span>;
  }

  const sizeMap = { sm: 14, md: 18, lg: 22 };
  const px = sizeMap[size];

  const stars = Array.from({ length: maxStars }, (_, i) => {
    const filled = rating >= i + 1;
    const half   = !filled && rating > i;
    return { filled, half, idx: i };
  });

  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center">
        {stars.map(({ filled, half, idx }) => (
          <svg
            key={idx}
            width={px}
            height={px}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {/* Background star (always gray) */}
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill="var(--border-strong)"
            />
            {/* Filled or half overlay */}
            {(filled || half) && (
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill="var(--gold-400)"
                clipPath={half ? 'inset(0 50% 0 0)' : undefined}
              />
            )}
          </svg>
        ))}
      </span>
      {showValue && (
        <span
          className="text-xs font-semibold ml-1"
          style={{ color: 'var(--gold-400)' }}
        >
          {rating.toFixed(1)}
        </span>
      )}
    </span>
  );
}
