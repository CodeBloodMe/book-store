// ============================================================
// app/search/page.tsx — Search Results Page
// Server Component: full-text PostgreSQL search.
// ============================================================

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

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  const books = query
    ? await searchBooks(query).catch(() => [])
    : [];

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Search Header */}
        <div className="mb-8">
          <h1 className="font-extrabold mb-4" style={{ fontSize: 'clamp(24px, 3.5vw, 36px)' }}>
            {query ? (
              <>Results for <span className="gradient-text">&quot;{query}&quot;</span></>
            ) : (
              'Search Books'
            )}
          </h1>
          <SearchBar hero initialValue={query} placeholder="Search books, authors, topics…" />
        </div>

        {/* Results */}
        {!query ? (
          <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold">Start typing to find books across all genres.</p>
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
            <p className="text-4xl mb-3">😔</p>
            <h2 className="font-bold text-lg mb-2">No results for &quot;{query}&quot;</h2>
            <p className="text-sm mb-5">Try a different keyword, author name, or topic.</p>
            <Link href="/" className="btn-ghost text-sm">Browse All Genres</Link>
          </div>
        ) : (
          <>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Found <strong style={{ color: 'var(--text-primary)' }}>{books.length}</strong> books
              matching your search — sorted by expert rating.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 stagger-children">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
