
// app/fiction/page.tsx — Fiction Finder Page (redesigned)
// Reads genre slugs + length from URL, passes to getFictionBooks.

import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { getFictionBooks } from '@/lib/queries';
import FictionQuestionnaire from '@/components/features/FictionQuestionnaire';
import BookCard from '@/components/ui/BookCard';
import AILoadingAnimation from '@/components/ui/AILoadingAnimation';
import type { FictionFilters, LengthCategory, Book } from '@/types/database';

export const metadata: Metadata = {
  title: 'Fiction Finder — Find Your Perfect Novel',
  description:
    'Pick your favourite genres and book length. ' +
    'We\'ll find the perfect fiction books for you every time.',
};

const GENRE_LABELS: Record<string, string> = {
  'horror':             'Horror',
  'comedy-humor':       'Comedy',
  'fantasy':            'Fantasy',
  'science-fiction':    'Sci-Fi',
  'mystery-thriller':   'Mystery',
  'romance':            'Romance',
  'historical-fiction': 'History',
  'literary-fiction':   'Literary',
};

const LENGTH_LABELS: Record<string, string> = {
  'Quick Read': 'Short & Fast',
  'Standard':   'Normal Size',
  'Epic':       'Super Long',
};

interface PageProps {
  searchParams: Promise<{ genres?: string; length?: string }>;
}

export default async function FictionPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Parse multi-genre slug list from comma-separated string
  const genre_slugs = params.genres
    ? params.genres.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const length_category = (params.length ?? null) as LengthCategory | null;
  const hasFilters = genre_slugs.length > 0 || Boolean(length_category);

  const filters: FictionFilters = { genre_slugs, length_category };

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>

      {/* ── Page Header ──────────────────────────────────── */}
      <div className="py-16 bg-[#f5f5f0] border-b-[3px] border-[#0a0a0a]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
          <h1 className="font-black mb-3 text-[#0a0a0a]" style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(40px, 8vw, 72px)', letterSpacing: '0.02em' }}>
            Fiction Finder
          </h1>
          <p className="text-lg font-medium max-w-lg text-[#555]">
            Pick your genres — mix Horror and Comedy, or anything you like. We&apos;ll find the right books every time.
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
          <Suspense 
            fallback={
              <div className="py-24">
                <AILoadingAnimation />
              </div>
            }
          >
            <FictionResults filters={filters} genre_slugs={genre_slugs} length_category={length_category} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

// ── Suspense Wrapper for Fetching ──

async function FictionResults({ filters, genre_slugs, length_category }: { filters: FictionFilters, genre_slugs: string[], length_category: string | null }) {
  const books = await getFictionBooks(filters).catch(() => []);

  return (
    <div>
      {/* Active Filters Display */}
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <span className="text-sm font-black uppercase tracking-widest text-[#0a0a0a]">
          Showing:
        </span>
        {genre_slugs.map(slug => (
          <span key={slug} className="text-xs font-bold uppercase tracking-widest px-3 py-1 bg-[#f5e642] text-[#0a0a0a] border-[2px] border-[#0a0a0a]">
            {GENRE_LABELS[slug] ?? slug}
          </span>
        ))}
        {length_category && (
          <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 bg-[#f5e642] text-[#0a0a0a] border-[2px] border-[#0a0a0a]">
            {LENGTH_LABELS[length_category] ?? length_category}
          </span>
        )}
        <Link href="/fiction" className="text-xs font-bold uppercase tracking-widest ml-2 text-[#777] hover:text-[#0a0a0a]">
          ✕ Start Over
        </Link>
      </div>

      {books.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <h2 className="text-xl font-bold mb-2">No matches found</h2>
          <p className="text-sm mb-5">
            Try removing the length filter, or picking a different genre combination.
          </p>
          <Link href="/fiction" className="btn-ghost text-sm">Try Again</Link>
        </div>
      ) : (
        <>
          <h2 className="section-title mb-2">
            {books.length} Book{books.length !== 1 ? 's' : ''} for You
          </h2>
          <p className="section-subtitle mb-7">
            Sorted by rating — best match first.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
