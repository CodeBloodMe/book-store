import { BookCardSkeletonGrid } from '@/components/ui/BookCardSkeleton';

export default function Loading() {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      {/* Hero skeleton */}
      <div style={{ background: 'var(--bg-primary)', padding: '80px 32px' }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-4">
            <div className="skeleton h-6 w-56 rounded-full" />
            <div className="skeleton h-14 w-full rounded" />
            <div className="skeleton h-14 w-3/4 rounded" />
            <div className="skeleton h-5 w-full rounded" />
            <div className="skeleton h-13 w-full rounded-xl" />
            <div className="flex gap-3">
              <div className="skeleton h-11 w-36 rounded-lg" />
              <div className="skeleton h-11 w-36 rounded-lg" />
            </div>
          </div>
          <div className="skeleton hidden lg:block h-72 rounded-2xl" />
        </div>
      </div>
      {/* Genre grid skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="skeleton h-8 w-56 rounded mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-12">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="skeleton h-36 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-8 w-56 rounded mb-4" />
        <BookCardSkeletonGrid count={6} />
      </div>
    </div>
  );
}
