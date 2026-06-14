// ============================================================
// app/genres/[slug]/page.tsx — Genre Page
// Server Component: fetches genre + all books server-side.
// Passes books to GenreBookList (client) for filtering/sorting.
// ============================================================

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getGenreBySlug, getBooksByGenre } from '@/lib/queries';
import GenreBookList from '@/components/features/GenreBookList';

export const revalidate = 0; // Force Next.js to always fetch fresh data from the database

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate page-level metadata from the genre data
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const genre = await getGenreBySlug(slug);
    return {
      title: `Best ${genre.name} Books`,
      description:
        `Expert-curated list of the best ${genre.name} books. ` +
        `Ranked by field experts and thousands of reader reviews.`,
    };
  } catch {
    return { title: 'Genre Not Found' };
  }
}

export default async function GenrePage({ params }: PageProps) {
  const { slug } = await params;

// Fetch genre and books in parallel — abort with 404 if genre not found
let genre, books;
try {
  genre = await getGenreBySlug(slug);
  books = await getBooksByGenre(genre.id);
} catch {
  notFound();
  return null;
}

  // Separate books by difficulty for summary stats
  const beginnerCount     = books.filter((b) => b.difficulty_level === 'Beginner').length;
  const intermediateCount = books.filter((b) => b.difficulty_level === 'Intermediate').length;
  const advancedCount     = books.filter((b) => b.difficulty_level === 'Advanced').length;
  const avgRating         = books.reduce((s, b) => s + (b.expert_rating ?? 0), 0) / (books.length || 1);

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>

      {/* ── Genre Header ──────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-subtle)',
          paddingTop: 48,
          paddingBottom: 48,
        }}
      >
        {/* Color accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: genre.color || 'var(--indigo-500)' }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs mb-5"
            style={{ color: 'var(--text-muted)' }} aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>›</span>
            <Link href="/#genres" className="hover:text-white transition-colors">Genres</Link>
            <span>›</span>
            <span style={{ color: 'var(--text-primary)' }}>{genre.name}</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl" role="img" aria-hidden="true">{genre.icon}</span>
                <h1 className="font-extrabold" style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>
                  Best {genre.name} Books
                </h1>
              </div>
              {genre.description && (
                <p className="text-base max-w-xl" style={{ color: 'var(--text-secondary)' }}>
                  {genre.description}
                </p>
              )}
            </div>

            {/* Stats */}
            <div
              className="flex gap-4 p-4 rounded-xl flex-shrink-0"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="text-center">
                <p className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  {books.length}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Books</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold" style={{ color: 'var(--gold-500)' }}>
                  {avgRating.toFixed(1)}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg Rating</p>
              </div>
              {genre.is_learning && (
                <>
                  <div className="text-center">
                    <p className="text-xl font-bold" style={{ color: 'var(--beginner-text)' }}>
                      {beginnerCount}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Beginner</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold" style={{ color: 'var(--intermediate-text)' }}>
                      {intermediateCount}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Intermediate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold" style={{ color: 'var(--advanced-text)' }}>
                      {advancedCount}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Advanced</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Book List ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {books.length === 0 ? (
          <div className="text-center py-24" style={{ color: 'var(--text-muted)' }}>
            <p className="text-5xl mb-4">📭</p>
            <h2 className="text-xl font-bold mb-2">No books yet in this genre.</h2>
            <p className="text-sm">We&apos;re adding new titles regularly — check back soon!</p>
          </div>
        ) : (
          <GenreBookList books={books} isLearning={genre.is_learning} />
        )}
      </div>
    </div>
  );
}
