// ============================================================
// app/search/page.tsx — Search Results Page
// Server Component: full-text PostgreSQL search.
// ============================================================

import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { searchBooks } from '@/lib/queries';
import BookCard from '@/components/ui/BookCard';
import SearchBar from '@/components/ui/SearchBar';

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: "${q}"` : 'Search Books',
    description: q ? `ChapterOne search results for "${q}".` : 'Search across 150+ expert-curated books.',
  };
}

async function SearchResults({ query }: { query: string }) {
  if (!query) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
        <p className="text-4xl mb-3"></p>
        <p className="font-semibold">Start typing to find books across all genres.</p>
      </div>
    );
  }

  const books = await searchBooks(query).catch(() => []);

  if (books.length === 0) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
        <p className="text-4xl mb-3"></p>
        <h2 className="font-bold text-lg mb-2">No results for &quot;{query}&quot;</h2>
        <p className="text-sm mb-5">Try a different keyword, author name, or topic.</p>
        <Link href="/" className="btn-ghost text-sm">Browse All Genres</Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Found <strong style={{ color: 'var(--text-primary)' }}>{books.length}</strong> books
        matching your search sorted by relevance.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 stagger-children">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </>
  );
}

function SearchResultsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-[280px] sm:h-[420px] rounded-[20px] sm:rounded-[24px] bg-[#222222]"></div>
      ))}
    </div>
  );
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Search Header */}
        <div className="mb-8">
          <SearchBar hero initialValue={query} placeholder="Search books, authors, topics…" />
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="font-extrabold" style={{ fontSize: 'clamp(24px, 3.5vw, 36px)' }}>
            {query ? (
              <>Results for <span className="inline-block bg-[#f5e642] px-3 py-1 rounded-lg text-[#0a0a0a] border-2 border-[#0a0a0a] shadow-[3px_3px_0_#0a0a0a] rotate-1 mx-2">&quot;{query}&quot;</span></>
            ) : (
              'Search Books'
            )}
          </h1>
        </div>

        {/* Results */}
        <Suspense key={query} fallback={<SearchResultsSkeleton />}>
          <SearchResults query={query} />
        </Suspense>

      </div>
    </div>
  );
}
