import type { Metadata } from 'next';
import { getFreeBooks } from '@/lib/queries';
import BookCard from '@/components/ui/BookCard';

export const metadata: Metadata = {
  title: 'Free Books to Read Online',
  description: 'Explore our collection of free books you can read directly in your browser.',
};

export const revalidate = 3600; // Cache for 1 hour

export default async function FreeBooksPage() {
  const books = await getFreeBooks().catch(() => []);

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="py-16 bg-[#f5f5f0] border-b-[3px] border-[#0a0a0a]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
          <h1 className="font-black mb-3 text-[#0a0a0a]" style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(40px, 8vw, 72px)', letterSpacing: '0.02em' }}>
            Free Books
          </h1>
          <p className="text-lg font-medium max-w-lg text-[#555]">
            Read these books instantly in our immersive e-reader without leaving the site.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {books.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
            <h2 className="text-xl font-bold mb-2">No free books found</h2>
            <p className="text-sm mb-5">
              Check back later for new additions to our free library.
            </p>
          </div>
        ) : (
          <>
            <h2 className="section-title mb-2">
              {books.length} Free Book{books.length !== 1 ? 's' : ''} Available
            </h2>
            <p className="section-subtitle mb-7">
              Click on a book to start reading immediately.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 stagger-children">
              {books.map((book: any) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
