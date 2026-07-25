

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getBookById, getAllGenres } from '@/lib/queries';
import RatingStars from '@/components/ui/RatingStars';
import AIReviewPanel from '@/components/features/AIReviewPanel';
import UserReviews from '@/components/features/UserReviews';
import BookCover from '@/components/ui/BookCover';
import { fetchAndImportExternalBook } from '@/lib/external-books';
import { getCoverUrl } from '@/lib/cover-utils';
import { getReviewsForBook } from '@/app/actions/reviews';
import { createClient } from '@/lib/supabase/server';
import SaveToBookshelfButton from '@/components/features/SaveToBookshelfButton';
import SimilarBooksSection from '@/components/features/SimilarBooksSection';
import SeriesPanel from '@/components/features/SeriesPanel';
import DynamicBackground from '@/components/ui/DynamicBackground';
import GoodreadsScrapeTrigger from '@/components/features/GoodreadsScrapeTrigger';
import ReactMarkdown from 'react-markdown';


interface PageProps {
  // In Next.js 15, `params` is a Promise that must be awaited
  params: Promise<{ id: string }>;
}


export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const book = await getBookById(id);
    return {
      title: `${book.title} by ${book.author}`,
      description: book.description?.slice(0, 155) ?? undefined,
      openGraph: {
        title: `${book.title} by ${book.author} | ChapterOne`,
        description: book.description?.slice(0, 155) ?? 'Discover this book on ChapterOne.',
        images: book.cover_image_url ? [book.cover_image_url] : [],
      }
    };
  } catch {
    return { title: 'Book Not Found' };
  }
}


export default async function BookDetailPage({ params }: PageProps) {
  // 1. Get the ID from the URL
  const { id } = await params;

  // 2. Handle "External" Books (OpenLibrary Import)
  // If the ID starts with 'ext_', it means this book isn't in our database yet.
  // We need to fetch it from the OpenLibrary API, save it to our database, and then
  // redirect the user to the newly created real database ID.
  if (id.startsWith('ext_')) {
    const newDatabaseId = await fetchAndImportExternalBook(id);
    
    if (newDatabaseId) {
      redirect(`/books/${newDatabaseId}`); // Success! Reload page with real ID
    } else {
      notFound(); // Failed to import, show 404 page
      return null;
    }
  }

  // 3. Fetch the Book Data
  let book;
  let allGenres;
  
  try {
    book = await getBookById(id);
    allGenres = await getAllGenres();
  } catch (err) {
    // If the database query crashes (e.g., ID doesn't exist), show a 404 page
    console.error('[BookDetailPage] Error for id:', id, err);
    notFound();
    return null;
  }

  // Fetch community reviews for this specific book
  const reviews = await getReviewsForBook(book.id);

  // 4. Check if the User is Logged In (For the "Save to Bookshelf" button)
  const supabase = await createClient(); // Connect to database securely on the server
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  
  let initialShelfStatus = null;
  
  // If they are logged in, check if they already saved this book
  if (user) {
    const { data: shelf } = await supabase
      .from('user_shelves')
      .select('status')
      .eq('user_id', user.id)
      .eq('book_id', book.id)
      .single();
      
    if (shelf) {
      initialShelfStatus = shelf.status;
    }
  }

  // 5. Data Prep for Rendering
  const genre = book.genres;
  const cleanIsbn = book.isbn?.replace(/[-\s]/g, ''); // Remove dashes from ISBN
  
  // Use centralized cover URL resolution
  const { primary: coverUrl, fallback: coverFallback } = getCoverUrl(book);

  // --- External Store Links Logic ---
  
  // Amazon Link Builder
  let amazonLink = "";
  const amz = book.amazon_url?.trim() || '';
  if (amz.includes('amazon.com')) {
    amazonLink = amz.startsWith('http') ? amz : `https://${amz}`;
  } else {
    // If no direct link exists, build a search URL using ISBN or Title+Author
    const isValidIsbn = cleanIsbn && cleanIsbn !== '0000000000';
    const searchQuery = isValidIsbn ? cleanIsbn : `${book.title} ${book.author}`;
    amazonLink = `https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}`;
  }

  // General Search Query (used for B&N)
  const genericSearchQuery = (cleanIsbn && cleanIsbn !== '0000000000') ? cleanIsbn : `${book.title} ${book.author}`;
  const barnesAndNobleLink = `https://www.barnesandnoble.com/search?q=${encodeURIComponent(genericSearchQuery)}`;


  // 6. JSON-LD for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    author: {
      '@type': 'Person',
      name: book.author,
    },
    url: `https://book-store-eight-zeta.vercel.app/books/${book.id}`,
    image: coverUrl || undefined,
    description: book.description || undefined,
    isbn: (cleanIsbn && cleanIsbn !== '0000000000') ? cleanIsbn : undefined,
    aggregateRating: book.total_reviews > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: book.expert_rating || book.community_rating || 0,
      reviewCount: book.total_reviews,
    } : undefined,
  };

  // 7. Render the UI
  return (
    <div className="relative min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Background that magically extracts colors from the cover image! */}
      <DynamicBackground coverUrl={coverUrl} />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 relative z-10">
        
        {/* Top Section */}
        <div className="grid md:grid-cols-12 gap-12 mb-16 items-start">
          
          {/* Left Column (4/12 width): Book Cover */}
          <div className="md:col-span-4 flex justify-center md:justify-start">
            <div 
              id="main-book-cover"
              className="relative rounded-2xl overflow-hidden shadow-2xl w-full max-w-[280px] aspect-[2/3] mx-auto md:mx-0"
            >
              <BookCover
                src={coverUrl}
                fallbackSrc={coverFallback}
                alt={`Cover of ${book.title}`}
                fallbackGradient={`linear-gradient(135deg, ${genre?.color ?? '#1f2937'} 0%, #cbd5e1 100%)`}
                fallbackText={book.title}
                fallbackAuthor={book.author}
              />
            </div>
          </div>

          {/* Right Column (8/12 width): Info & Buttons */}
          <div className="md:col-span-8 flex flex-col pt-4 relative z-10">
            
            {/* Tag Pills (Genre, Bestseller, Custom Tags) */}
            <div className="flex gap-2 flex-wrap mb-4">
              {genre && (
                <Link href={`/genres/${genre.slug}`} className="px-3 py-1 rounded-full text-xs font-bold bg-[#f3f4f6] text-gray-600">
                  {genre.name}
                </Link>
              )}
              
              {book.is_bestseller && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#f3f4f6] text-gray-600">
                  Bestseller
                </span>
              )}
              
              {book.tags?.slice(0, 2).map((tag) => (
                <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`} className="px-3 py-1 rounded-full text-xs font-bold bg-[#f3f4f6] text-gray-600">
                  {tag}
                </Link>
              ))}
            </div>

            {/* Title & Author */}
            {book.series_name && (
              <p className="text-gray-600 font-bold uppercase tracking-wider text-sm mb-1">
                {book.series_name} {book.series_number ? `#${book.series_number}` : ''}
              </p>
            )}
            
            <h1 className="font-bold leading-tight mb-2 text-[#0a0a0a]" style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontFamily: 'var(--font-serif)' }}>
              {book.title}
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-500 font-medium tracking-wide">
              by <Link href={`/authors/${encodeURIComponent(book.author)}`} className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors">{book.author}</Link>
            </p>

            {/* Description Paragraph */}
            <div className="text-gray-600 leading-relaxed mb-6 max-w-2xl mt-4">
              <ReactMarkdown 
                components={{
                  a: ({node, ...props}) => <a {...props} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" />
                }}
              >
                {book.description || ''}
              </ReactMarkdown>
            </div>

            {/* Anti-Recommendations (Warning box if a book isn't for everyone) */}
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

            {/* Action Buttons Row */}
            <div className="flex flex-col gap-4 mt-4">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Get this book</h4>
              
              <div className="flex flex-wrap items-center gap-3">
                {book.free_reading_url && (
                  <Link 
                    href={`/books/${book.id}/read`}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-transform hover:-translate-y-0.5 shadow-sm hover:shadow-md bg-[#1f2937]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                    Read for Free
                  </Link>
                )}

                {/* Amazon Button */}
                <a 
                  href={amazonLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[#0f1111] transition-transform hover:-translate-y-0.5 shadow-sm hover:shadow-md bg-[#FF9900] border border-[#F3A847]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                  Amazon
                </a>
                
                {/* Barnes & Noble Button */}
                <a 
                  href={barnesAndNobleLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-transform hover:-translate-y-0.5 shadow-sm hover:shadow-md bg-[#1C4A3A]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
                  Barnes & Noble
                </a>



                {/* Save to profile button (Requires user to be logged in) */}
                <SaveToBookshelfButton 
                  bookId={book.id} 
                  coverUrl={coverUrl || ''}
                  initialStatus={initialShelfStatus as any} 
                  isAuthenticated={!!user} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* AI Review — Full Width */}
        <div className="mb-16">
          <AIReviewPanel book={book} />
        </div>

        {/* ML-Powered Similar Books — Full Width */}
        <div className="mb-16">
          <SimilarBooksSection
            bookId={book.id}
            bookTitle={book.title}
            nextBook={book.next_book}
          />
        </div>

        {/* Series Info */}
        <div className="mb-16">
          <SeriesPanel title={book.title} author={book.author} />
        </div>

        {/* Bottom Section */}
        <div className="mb-16">
          <GoodreadsScrapeTrigger 
            bookId={book.id} 
            isbn={cleanIsbn ?? null} 
            needsDescription={!book.description} 
          />
          <UserReviews bookId={book.id} initialReviews={reviews} currentUserId={user?.id ?? null} />
        </div>

      </div>
    </div>
  );
}
