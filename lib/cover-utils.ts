// ============================================================
// ChapterOne — Centralized Cover URL Resolution
//
// SINGLE SOURCE OF TRUTH for all book cover URL logic.
// Import this everywhere instead of duplicating cover URL
// construction across BookCard, BookCover, SimilarBooks, etc.
//
// Strategy (in priority order):
//   1. PC server (localhost:4000 or configured URL) — always preferred.
//      It caches every cover locally so it serves in <50ms after first hit.
//   2. cover_image_url from DB — direct CDN URL (Apple Books, Google, etc.)
//   3. OpenLibrary by ISBN — free, reliable for classic books
//   4. Components fall back to GeneratedCover if everything fails
// ============================================================

export interface CoverUrls {
  /** The primary URL to try first */
  primary: string;
  /** The fallback URL if primary fails (e.g., original URL from DB) */
  fallback: string;
}

interface BookCoverInput {
  cover_image_url?: string | null;
  isbn?: string | null;
  title?: string;
  author?: string;
}

/**
 * Returns the best cover URLs for a book.
 *
 * When the PC server is configured, it is ALWAYS the primary source —
 * even if the book already has a cover_image_url in the DB. This ensures
 * covers are served locally (fast, cached) rather than from unreliable CDNs.
 *
 * The PC server internally uses Google Books → OpenLibrary → Apple Books
 * and saves every successful fetch to disk permanently.
 */
export function getCoverUrl(book: BookCoverInput): CoverUrls {
  const pcServerBase = (
    typeof process !== 'undefined'
      ? (process.env.NEXT_PUBLIC_PC_SERVER_URL || '')
      : ''
  ).replace(/\/$/, '');

  const hasPcServer = pcServerBase.length > 0;
  const cleanIsbn = book.isbn?.replace(/[-\s]/g, '') || '';
  const hasIsbn = cleanIsbn.length > 0;
  const coverUrl = book.cover_image_url || '';
  const hasCoverUrl = coverUrl.length > 0;

  // ── Case 1: PC server is available → always use it as primary ──
  // The server caches covers locally so subsequent loads are instant.
  // We pass title+author so it can search by name if ISBN fails.
  if (hasPcServer) {
    if (hasIsbn) {
      // ISBN-based lookup: most reliable match
      return {
        primary: `${pcServerBase}/covers/isbn/${cleanIsbn}/L`,
        fallback: hasCoverUrl ? coverUrl
          : `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`,
      };
    }

    if (book.title && book.author) {
      // Title+author lookup: used when no ISBN is stored
      const titleEnc = encodeURIComponent(book.title);
      const authorEnc = encodeURIComponent(book.author);
      return {
        primary: `${pcServerBase}/covers/title/${titleEnc}/${authorEnc}`,
        fallback: hasCoverUrl ? coverUrl : '',
      };
    }

    // PC server configured but no ISBN or title — fall through
  }

  // ── Case 2: No PC server — use DB cover_image_url directly ──
  if (hasCoverUrl) {
    return {
      primary: coverUrl,
      fallback: hasIsbn
        ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`
        : '',
    };
  }

  // ── Case 3: No PC server, no DB URL, but have ISBN ──
  if (hasIsbn) {
    return {
      primary: `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`,
      fallback: '',
    };
  }

  // ── Case 4: Nothing available — components will show GeneratedCover ──
  return { primary: '', fallback: '' };
}
