// ============================================================
// BookCardSkeleton — Loading placeholder that mirrors BookCard layout.
// Uses the shimmer animation defined in globals.css.
// ============================================================

export default function BookCardSkeleton() {
  return (
    <div
      className="glass-card p-5 flex flex-col gap-3"
      aria-hidden="true"
    >
      {/* Cover image placeholder */}
      <div className="skeleton w-full h-44 rounded-lg" />

      {/* Badge row */}
      <div className="flex gap-2">
        <div className="skeleton h-5 w-20 rounded" />
        <div className="skeleton h-5 w-14 rounded" />
      </div>

      {/* Title */}
      <div className="skeleton h-5 w-4/5 rounded" />
      <div className="skeleton h-4 w-3/5 rounded" />

      {/* Author */}
      <div className="skeleton h-3 w-2/5 rounded" />

      {/* Stars */}
      <div className="skeleton h-4 w-24 rounded" />

      {/* Expert quote */}
      <div className="skeleton h-3 w-full rounded mt-1" />
      <div className="skeleton h-3 w-3/4 rounded" />

      {/* Button */}
      <div className="skeleton h-9 w-full rounded-lg mt-2" />
    </div>
  );
}

/** Grid of skeleton cards for list pages */
export function BookCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: count }, (_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  );
}
