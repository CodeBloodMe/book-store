import { BookCardSkeletonGrid } from '@/components/ui/BookCardSkeleton';

export default function Loading() {
  return (
    <div style={{ background: '#ffffff', minHeight: '100vh' }}>
      {/* Hero skeleton — matches actual centered layout */}
      <div style={{ background: '#f5f5f0', padding: '64px 16px' }}>
        <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
          {/* Badge skeleton */}
          <div className="skeleton h-8 w-56 rounded-full mb-4" />
          {/* Subtitle skeleton */}
          <div className="skeleton h-8 w-80 rounded mb-2" />
          {/* Main title skeleton */}
          <div className="skeleton h-20 w-[70%] rounded mb-10" />
          {/* Search box skeleton */}
          <div className="skeleton h-14 w-full max-w-3xl rounded-2xl mb-6" />
          {/* Divider skeleton */}
          <div className="skeleton h-4 w-64 rounded mb-10" />
          {/* Wizard card skeleton */}
          <div className="skeleton h-48 w-full max-w-3xl rounded-3xl" style={{ border: '3px solid #e5e5e5' }} />
        </div>
      </div>

      {/* Top Rated Books skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" style={{ borderTop: '3px solid #0a0a0a' }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="skeleton h-10 w-72 rounded mb-2" />
            <div className="skeleton h-4 w-96 rounded" />
          </div>
          <div className="skeleton h-10 w-32 rounded-full" />
        </div>
        <BookCardSkeletonGrid count={8} />
      </div>

      {/* Genre grid skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" style={{ background: '#f5f5f0' }}>
        <div className="skeleton h-10 w-56 rounded mb-2" />
        <div className="skeleton h-4 w-80 rounded mb-6" />
        {/* Category badge */}
        <div className="skeleton h-10 w-32 rounded-full mb-6" />
        {/* Genre cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton h-64 rounded-none" style={{ border: '5px solid #e5e5e5' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
