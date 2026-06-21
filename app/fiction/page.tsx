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
      <div className="py-16 bg-[#f5f5f0] border-b-[3px] border-[#0a0a0a]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
          <h1 className="font-black mb-3 text-[#0a0a0a]" style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(40px, 8vw, 72px)', letterSpacing: '0.02em' }}>
            Fiction Finder
          </h1>
          <p className="text-lg font-medium max-w-lg text-[#555]">
            Tell us your mood and we'll find the perfect novel — curated from the best
            fiction books across all genres.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* ── Questionnaire ────────────────────────────────── */}
        <div className="mb-16">
          <FictionQuestionnaire />
        </div>

        {/* ── Results ──────────────────────────────────────── */}
        {hasFilters && (
          <div>
            {/* Active Filters Display */}
            <div className="flex items-center gap-3 mb-8 flex-wrap">
              <span className="text-sm font-black uppercase tracking-widest text-[#0a0a0a]">
                Filtered by:
              </span>
              {filters.vibe && (
                <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 bg-[#f5e642] text-[#0a0a0a] border-[2px] border-[#0a0a0a]">
                  Vibe: {filters.vibe}
                </span>
              )}
              {filters.plot_type && (
                <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 bg-[#f5e642] text-[#0a0a0a] border-[2px] border-[#0a0a0a]">
                  Plot: {filters.plot_type}
                </span>
              )}
              {filters.length_category && (
                <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 bg-[#f5e642] text-[#0a0a0a] border-[2px] border-[#0a0a0a]">
                  Length: {filters.length_category}
                </span>
              )}
              <Link href="/fiction" className="text-xs font-bold uppercase tracking-widest ml-2 text-[#777] hover:text-[#0a0a0a]">
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
