// ============================================================
// app/books/[id]/page.tsx — Book Detail Page
// ============================================================

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getBookById, getAllGenres } from '@/lib/queries';
import RatingStars from '@/components/ui/RatingStars';
import NextBookPanel from '@/components/features/NextBookPanel';
import AIReviewPanel from '@/components/features/AIReviewPanel';
import BookCover from '@/components/ui/BookCover';
import { fetchAndImportExternalBook } from '@/lib/external-books';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const book = await getBookById(id);
    return {
      title: `${book.title} by ${book.author}`,
      description: book.description?.slice(0, 155) ?? undefined,
    };
  } catch {
    return { title: 'Book Not Found' };
  }
}

export default async function BookDetailPage({ params }: PageProps) {
  const { id } = await params;

  if (id.startsWith('ext_')) {
    const newId = await fetchAndImportExternalBook(id);
    if (newId) {
      redirect(`/books/${newId}`);
    } else {
      notFound();
      return null;
    }
  }

  let book;
  let allGenres;
  try {
    book = await getBookById(id);
    allGenres = await getAllGenres();
  } catch {
    notFound();
    return null;
  }

  const genre = book.genres;
  const cleanIsbn = book.isbn?.replace(/[-\s]/g, '');
  const coverUrl = book.cover_image_url
    ?? (cleanIsbn ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg` : null);

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', paddingBottom: '80px' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        
        {/* ── Top Section: Cover & Info ──────────────────────── */}
        <div className="grid md:grid-cols-12 gap-12 mb-16 items-start">
          
          {/* Cover */}
          <div className="md:col-span-4 flex justify-center md:justify-start">
            <div 
              className="relative rounded-2xl overflow-hidden shadow-2xl"
              style={{ width: 280, height: 400 }}
            >
              <BookCover
                src={coverUrl}
                alt={`Cover of ${book.title}`}
                fallbackGradient={`linear-gradient(135deg, ${genre?.color ?? '#6366f1'} 0%, #cbd5e1 100%)`}
                fallbackText={book.title}
              />
            </div>
          </div>

          {/* Info */}
          <div className="md:col-span-8 flex flex-col pt-4">
            {/* Tags */}
            <div className="flex gap-2 flex-wrap mb-4">
              {genre && (
                <Link 
                  href={`/genres/${genre.slug}`}
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: '#eff6ff', color: 'var(--indigo-600)' }}
                >
                  {genre.name}
                </Link>
              )}
              {book.is_bestseller && (
                <span 
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: '#eff6ff', color: 'var(--indigo-600)' }}
                >
                  Bestseller
                </span>
              )}
              {book.tags?.slice(0, 2).map((tag) => (
                <Link 
                  key={tag}
                  href={`/search?q=${encodeURIComponent(tag)}`}
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: '#eff6ff', color: 'var(--indigo-600)' }}
                >
                  {tag}
                </Link>
              ))}
            </div>

            {/* Title & Author */}
            <h1 
              className="font-bold leading-tight mb-2"
              style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontFamily: 'var(--font-serif)', color: 'var(--text-primary)' }}
            >
              {book.title}
            </h1>
            <p className="text-lg text-gray-500 mb-6">
              by <span className="font-semibold text-gray-700">{book.author}</span>
            </p>

            {/* Description */}
            <p className="text-gray-600 leading-relaxed mb-6 max-w-2xl">
              {book.description || "A profound exploration that challenges the boundaries of its subject matter, offering a starting perspective that is highly recommended for readers seeking intellectual stimulation."}
            </p>

            {/* Anti-Recommendations (Not Recommended For) */}
            {book.not_recommended_for && book.not_recommended_for.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-8 max-w-2xl flex items-start gap-3">
                <span className="text-red-500 mt-0.5 flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                </span>
                <div>
                  <h4 className="text-sm font-bold text-red-800 mb-1">Not recommended for readers who:</h4>
                  <ul className="flex flex-col gap-1">
                    {book.not_recommended_for.map((reason, i) => (
                      <li key={i} className="text-sm text-red-700 flex gap-2">
                        <span>•</span> {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4">
              <a 
                href={book.amazon_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary rounded-xl px-6 py-3"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                Read overview
              </a>
              <button className="btn-ghost rounded-xl px-6 py-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>
                Save for later
              </button>
            </div>
          </div>
        </div>

        {/* ── Middle Section: AI Consensus & Next Book ──────── */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          <div className="lg:col-span-2">
            <AIReviewPanel book={book} />
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
              <h3 className="font-bold text-gray-900 mb-6 font-serif text-lg">Because you liked this</h3>
              {book.next_book ? (
                <NextBookPanel nextBook={book.next_book} />
              ) : (
                <div className="text-sm text-gray-500 italic">No recommendations available.</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom Section: Community Resonance ───────────── */}
        <div>
          <h3 className="font-bold text-gray-900 mb-6 font-serif text-xl">Community Resonance</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Mocking Community Resonance Cards since we don't have this in DB directly */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center text-white text-xs font-bold">Y</div>
                <span className="text-xs font-semibold text-gray-700">HackerNews Discussion</span>
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                "The interpretation in chapter 4 is surprisingly accurate for a work of its kind. It doesn't rely on the usual tropes to resolve the plot, but rather leans into the complexity..."
              </p>
              <div className="flex gap-4 text-xs text-gray-400 font-medium">
                <span>↑ 132 pts</span>
                <span>💬 128 comments</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                </div>
                <span className="text-xs font-semibold text-gray-700">r/books</span>
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                "I finished it in one sitting. The existential dread is palpable. If you liked 'Dune Messiah', you need to read this immediately. The ending left me staring at the wall for an hour."
              </p>
              <div className="flex gap-4 text-xs text-gray-400 font-medium">
                <span>↑ 1.2k pts</span>
                <span>💬 342 comments</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
