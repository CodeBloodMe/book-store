'use client';

import { useState, useEffect } from 'react';
import BookCard from '@/components/ui/BookCard';
import type { Book } from '@/types/database';

interface SimilarBook extends Book {
  similarity: number;
}

interface SimilarBooksSectionProps {
  bookId: string;
  bookTitle: string;
  /** If a manually curated next_book exists, we show it first */
  nextBook?: Pick<Book, 'id' | 'title' | 'author' | 'cover_image_url' | 'expert_rating' | 'difficulty_level' | 'isbn'> | null;
}

export default function SimilarBooksSection({ bookId, bookTitle, nextBook }: SimilarBooksSectionProps) {
  const [books, setBooks] = useState<SimilarBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchSimilar() {
      try {
        const res = await fetch(`/api/similar-books?bookId=${bookId}&count=8`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (!cancelled) {
          // Filter out the next_book if it's already shown separately
          const filtered = nextBook
            ? (data.books || []).filter((b: SimilarBook) => b.id !== nextBook.id)
            : data.books || [];
          setBooks(filtered);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSimilar();
    return () => { cancelled = true; };
  }, [bookId, nextBook]);

  // Don't render the section at all if there's nothing to show
  if (!loading && books.length === 0 && !nextBook) return null;

  return (
    <section className="w-full">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            className="font-black text-[#0a0a0a] mb-1"
            style={{
              fontFamily: 'var(--font-bebas)',
              fontSize: 'clamp(24px, 4vw, 36px)',
              letterSpacing: '0.02em',
            }}
          >
            Because You Liked This
          </h2>
          <p className="text-sm text-[#777]">

          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[20px] sm:rounded-[24px] overflow-hidden animate-pulse"
              style={{ backgroundColor: '#e5e5e5', aspectRatio: '2/3' }}
            >
              <div className="w-full h-full bg-gradient-to-t from-[#d5d5d5] to-transparent" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="py-8 text-center">
          <p className="text-gray-500 font-medium">Couldn't load similar books right now.</p>
        </div>
      )}

      {/* Results Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
          {books.map((book) => (
            <BookCard key={book.id} book={book as Book} />
          ))}
        </div>
      )}
    </section>
  );
}
