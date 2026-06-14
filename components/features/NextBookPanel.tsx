// ============================================================
// NextBookPanel — "What to Read Next" widget on Book Detail page.
// Shows the single recommended follow-up book with a clear CTA.
// Server Component safe (receives data as props).
// ============================================================

import Link from 'next/link';
// Using plain <img> for covers — Next.js Image requires remotePatterns allowlist
import type { Book } from '@/types/database';
import RatingStars from '@/components/ui/RatingStars';
import DifficultyBadge from '@/components/ui/DifficultyBadge';
import BookCover from '@/components/ui/BookCover';

type NextBook = NonNullable<Book['next_book']>;

interface NextBookPanelProps {
  nextBook: NextBook;
}

export default function NextBookPanel({ nextBook }: NextBookPanelProps) {
  const cleanIsbn = nextBook.isbn?.replace(/[-\s]/g, '');
  const coverUrl = nextBook.cover_image_url
    ?? (cleanIsbn ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg` : '');

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{
        background: 'linear-gradient(135deg, var(--indigo-500)15 0%, var(--bg-card) 100%)',
        border: '1px solid var(--indigo-500)44',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span
          className="w-1 h-5 rounded-full"
          style={{ background: 'var(--indigo-500)' }}
        />
        <h3 className="font-bold text-sm" style={{ color: 'var(--indigo-400)' }}>
          What to Read Next
        </h3>
      </div>

      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        Finished this book? Our experts recommend continuing with:
      </p>

      {/* Book preview */}
      <div className="flex gap-4 items-start">
        {/* Cover */}
        <div
          className="relative flex-shrink-0 rounded-lg overflow-hidden"
          style={{ width: 72, height: 100 }}
        >
          <BookCover
            src={coverUrl}
            alt={`Cover of ${nextBook.title}`}
            fallbackGradient="var(--indigo-600)"
            fallbackText={nextBook.title}
          />
        </div>

        {/* Info */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <h4
            className="font-bold text-sm leading-snug line-clamp-2"
            style={{ color: 'var(--text-primary)' }}
          >
            {nextBook.title}
          </h4>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {nextBook.author}
          </p>
          {nextBook.expert_rating !== null && (
            <RatingStars rating={nextBook.expert_rating} showValue size="sm" />
          )}
          <DifficultyBadge level={nextBook.difficulty_level} />
        </div>
      </div>

      {/* CTA */}
      <Link
        href={`/books/${nextBook.id}`}
        className="btn-primary text-sm justify-center"
      >
        Read About This Book →
      </Link>
    </div>
  );
}
