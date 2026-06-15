import Link from 'next/link';
import BookCover from '@/components/ui/BookCover';
import { getSimilarBooks } from '@/lib/queries';

interface SimilarBooksProps {
  genreId: string;
  currentBookId: string;
  genreColor?: string;
}

export default async function SimilarBooks({ genreId, currentBookId, genreColor = '#6366f1' }: SimilarBooksProps) {
  const books = await getSimilarBooks(genreId, currentBookId);

  if (books.length === 0) {
    return (
      <div className="p-6 border-2 border-dashed border-gray-200 rounded-2xl text-center">
        <p className="text-gray-500 font-medium">No other books in this genre yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {books.map((book) => {
        const cleanIsbn = book.isbn?.replace(/[-\s]/g, '');
        const coverUrl = book.cover_image_url
          ?? (cleanIsbn ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-S.jpg` : null);

        return (
          <Link
            key={book.id}
            href={`/books/${book.id}`}
            className="group flex gap-4 p-3 rounded-xl bg-white border-2 border-gray-900 shadow-[2px_2px_0_#0a0a0a] hover:-translate-y-1 hover:shadow-[4px_4px_0_#0a0a0a] transition-all"
          >
            <div 
              className="relative rounded-lg overflow-hidden flex-shrink-0 bg-gray-100"
              style={{ width: 60, height: 90 }}
            >
              <BookCover
                src={coverUrl}
                alt={book.title}
                fallbackGradient={`linear-gradient(135deg, ${genreColor} 0%, #cbd5e1 100%)`}
                fallbackText={book.title}
              />
            </div>
            
            <div className="flex flex-col justify-center">
              <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                {book.title}
              </h4>
              <p className="text-sm text-gray-500">{book.author}</p>
              {book.expert_rating && (
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-yellow-400 text-xs">★</span>
                  <span className="text-xs font-bold text-gray-700">{book.expert_rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
