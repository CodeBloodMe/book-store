import { BookCardSkeletonGrid } from '@/components/ui/BookCardSkeleton';

export default function Loading() {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', paddingTop: 48, paddingBottom: 48 }}>
      {/* Header skeleton */}
      <div style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', padding: '48px 32px' }}>
        <div className="max-w-7xl mx-auto">
          <div className="skeleton h-4 w-32 rounded mb-4" />
          <div className="skeleton h-10 w-72 rounded mb-3" />
          <div className="skeleton h-4 w-96 rounded" />
        </div>
      </div>
      {/* Grid skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <BookCardSkeletonGrid count={8} />
      </div>
    </div>
  );
}
