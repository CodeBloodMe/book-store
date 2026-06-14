// ============================================================
// app/fiction/page.tsx — Fiction Taste-Maker Page
// Server Component wrapper. Shows questionnaire if no filters,
// shows filtered results if URL params are present.
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { getFictionBooks } from '@/lib/queries';
import FictionQuestionnaire from '@/components/features/FictionQuestionnaire';
import BookCard from '@/components/ui/BookCard';
import type { FictionFilters, LengthCategory, Book } from '@/types/database';

export const metadata: Metadata = {
  title: 'Fiction Finder — Find Your Perfect Novel',
  description:
    'Answer 3 questions about your vibe, plot preference, and reading length. ' +
    'We\'ll find the best fiction book for you right now.',
};

interface PageProps {
  searchParams: Promise<{ vibe?: string; plot?: string; length?: string }>;
}

export default async function FictionPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const hasFilters = Boolean(params.vibe || params.plot || params.length);

  // Build filters from URL params
  const filters: FictionFilters = {
    vibe: params.vibe ?? null,
    plot_type: params.plot ?? null,
    length_category: (params.length as LengthCategory) ?? null,
  };

  // Fetch results only when user has submitted the form
  let books: Book[] = [];
  if (hasFilters) {
    books = await getFictionBooks(filters).catch(() => []);
  }

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>

      {/* ── Page Header ──────────────────────────────────── */}
      <div
        className="relative overflow-hidden py-12"
        style={{
          background: 'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-base) 100%)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <span className="text-5xl block mb-4" role="img" aria-label="Drama masks">🎭</span>
          <h1 className="font-extrabold mb-3" style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}>
            Fiction Finder
          </h1>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            Tell us your mood and we&apos;ll find the perfect novel — curated from the best
            fiction books across all genres.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Questionnaire ────────────────────────────────── */}
        <div className="mb-12">
          <FictionQuestionnaire />
        </div>

        {/* ── Results ──────────────────────────────────────── */}
        {hasFilters && (
          <div>
            {/* Active Filters Display */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                Filtered by:
              </span>
              {filters.vibe && (
                <span className="badge" style={{
                  background: 'var(--indigo-500)22',
                  color: 'var(--indigo-400)',
                  border: '1px solid var(--indigo-500)44',
                }}>
                  Vibe: {filters.vibe}
                </span>
              )}
              {filters.plot_type && (
                <span className="badge" style={{
                  background: 'var(--indigo-500)22',
                  color: 'var(--indigo-400)',
                  border: '1px solid var(--indigo-500)44',
                }}>
                  Plot: {filters.plot_type}
                </span>
              )}
              {filters.length_category && (
                <span className="badge" style={{
                  background: 'var(--indigo-500)22',
                  color: 'var(--indigo-400)',
                  border: '1px solid var(--indigo-500)44',
                }}>
                  Length: {filters.length_category}
                </span>
              )}
              <Link href="/fiction" className="text-xs" style={{ color: 'var(--text-muted)' }}>
                ✕ Clear all
              </Link>
            </div>

            {books.length === 0 ? (
              <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                <p className="text-4xl mb-4">🔍</p>
                <h2 className="text-xl font-bold mb-2">No matches found</h2>
                <p className="text-sm mb-5">
                  Try different preferences — the best book might be hiding with a different vibe!
                </p>
                <Link href="/fiction" className="btn-ghost text-sm">Try Again</Link>
              </div>
            ) : (
              <>
                <h2 className="section-title mb-2">
                  {books.length} Book{books.length !== 1 ? 's' : ''} for You
                </h2>
                <p className="section-subtitle mb-7">
                  Sorted by expert rating — the best match is shown first.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
                  {books.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
