

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getBookById, getAllGenres } from '@/lib/queries';
import RatingStars from '@/components/ui/RatingStars';
import AIReviewPanel from '@/components/features/AIReviewPanel';
import UserReviews from '@/components/features/UserReviews';
import BookCover from '@/components/ui/BookCover';
import { fetchAndImportExternalBook, fetchAuthorImage } from '@/lib/external-books';
import { getCoverUrl } from '@/lib/cover-utils';
import { getReviewsForBook } from '@/app/actions/reviews';
import { createClient } from '@/lib/supabase/server';
import SaveToBookshelfButton from '@/components/features/SaveToBookshelfButton';
import SimilarBooksSection from '@/components/features/SimilarBooksSection';
import SeriesPanel from '@/components/features/SeriesPanel';
import DynamicBackground from '@/components/ui/DynamicBackground';
import AuthorBioPanel from '@/components/features/AuthorBioPanel';
import Breadcrumb from '@/components/ui/Breadcrumb';
import ShareButton from '@/components/ui/ShareButton';
import ExpandableDescription from '@/components/ui/ExpandableDescription';
import ExpertRatingBar from '@/components/ui/ExpertRatingBar';
import ReadingTimeEstimate from '@/components/ui/ReadingTimeEstimate';
import { Star, BookOpen, Tag, Barcode, UserCircle2, Calendar, Award } from 'lucide-react';
import Image from 'next/image';


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

  // Fetch community reviews and author image concurrently
  const [reviews, authorImageUrl] = await Promise.all([
    getReviewsForBook(book.id),
    fetchAuthorImage(book.author).catch(() => null),
  ]);

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
  const { primary: coverUrl, fallback: coverFallback, tertiary: coverTertiary } = getCoverUrl(book);

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

  // Breadcrumb data
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    ...(genre ? [{ label: genre.name, href: `/genres/${genre.slug}` }] : []),
    { label: book.title },
  ];


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
    numberOfPages: book.page_count || undefined,
    datePublished: book.published_year ? `${book.published_year}` : undefined,
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10">

        {/* Breadcrumb Navigation */}
        <Breadcrumb items={breadcrumbItems} />
        
        {/* Top Section */}
        <div className="grid md:grid-cols-12 gap-8 lg:gap-12 mb-12 items-start">
          
          {/* Left Column (4/12 width): Book Cover */}
          <div className="md:col-span-4 lg:col-span-3 flex flex-col items-center md:items-start gap-4">
            <div 
              id="main-book-cover"
              className="relative rounded-2xl overflow-hidden shadow-2xl w-full max-w-[320px] aspect-[2/3] mx-auto md:mx-0"
              style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)' }}
            >
              <BookCover
                src={coverUrl}
                fallbackSrc={coverFallback}
                tertiarySrc={coverTertiary}
                alt={`Cover of ${book.title}`}
                fallbackGradient={`linear-gradient(135deg, ${genre?.color ?? '#1f2937'} 0%, #cbd5e1 100%)`}
                fallbackText={book.title}
                fallbackAuthor={book.author}
              />
            </div>

            {/* Expert Rating Bar — under the cover on desktop, hidden for scores <10 (bad data) */}
            {book.expert_rating !== null && book.expert_rating >= 10 && (
              <div className="w-full max-w-[320px] mx-auto md:mx-0">
                <ExpertRatingBar rating={book.expert_rating} />
              </div>
            )}
          </div>

          {/* Right Column (8/12 width): Info & Buttons */}
          <div className="md:col-span-8 lg:col-span-9 flex flex-col pt-0 md:pt-2 relative z-10">
            
            {/* Tag Pills — Genre + Bestseller + Difficulty only. Clean, minimal. */}
            <div className="flex gap-1.5 flex-wrap mb-4">
              {genre && (
                <Link 
                  href={`/genres/${genre.slug}`} 
                  className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-80"
                  style={{ 
                    background: genre.color ? `${genre.color}15` : '#f3f4f6', 
                    color: genre.color || '#4b5563',
                    border: `1px solid ${genre.color || '#e5e7eb'}`,
                  }}
                >
                  {genre.name}
                </Link>
              )}
              
              {book.is_bestseller && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  Bestseller
                </span>
              )}

              {book.difficulty_level && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold badge-${book.difficulty_level.toLowerCase()}`}>
                  {book.difficulty_level}
                </span>
              )}
            </div>

            {/* Series Badge */}
            {book.series_name && (
              <p className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                {book.series_name} {book.series_number ? `· Book ${book.series_number}` : ''}
              </p>
            )}
            
            {/* Title */}
            <h1 className="font-bold leading-tight mb-2 text-[#0a0a0a]" style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontFamily: 'var(--font-serif)' }}>
              {book.title}
            </h1>
            
            {/* Author */}
            <p className="text-lg md:text-xl text-gray-500 font-medium tracking-wide mb-4">
              by <Link href={`/authors/${encodeURIComponent(book.author)}`} className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors">{book.author}</Link>
              {book.published_year !== null && (
                <span className="text-gray-400 text-sm ml-2">({book.published_year})</span>
              )}
            </p>

            {/* Community Rating (if available) */}
            {book.community_rating !== null && book.community_rating > 0 && (
              <div className="flex items-center gap-2 mb-5">
                <RatingStars rating={Math.round(book.community_rating)} size="sm" />
                <span className="text-sm font-semibold text-gray-700">{book.community_rating.toFixed(1)}</span>
                <span className="text-xs text-gray-400">/ 5.0 community</span>
                {book.total_reviews > 0 && (
                  <span className="text-xs text-gray-400 ml-1">({book.total_reviews.toLocaleString()} reviews)</span>
                )}
              </div>
            )}

            {/* Description */}
            <div className="mb-6 max-w-2xl">
              <ExpandableDescription description={book.description || ''} maxLength={350} />
            </div>

            {/* Anti-Recommendations (Warning box if a book isn't for everyone) */}
            {book.not_recommended_for && book.not_recommended_for.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 max-w-2xl flex items-start gap-3">
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

            {/* ═══ Get This Book Section ═══ */}
            <div className="flex flex-col gap-4 mt-2">
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <span className="w-8 h-px bg-gray-900"></span>
                Get this book
                <span className="flex-1 h-px bg-gray-200"></span>
              </h4>
              
              <div className="flex flex-wrap items-center gap-3">
                {book.free_reading_url && (
                  <Link 
                    href={`/books/${book.id}/read`}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-lg"
                    style={{ 
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.4)',
                    }}
                  >
                    <BookOpen size={18} />
                    Read for Free
                  </Link>
                )}

                {/* Amazon Button */}
                <a 
                  href={amazonLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[#0f1111] transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md bg-[#FF9900] border border-[#F3A847]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M.045 18.02c.071-.116.36-.198.538-.23.888-.16 1.696-.387 2.478-.752a9.5 9.5 0 0 0 2.32-1.57c.464-.413.803-.94 1.073-1.502.203-.421.33-.873.43-1.33.063-.286.087-.575.087-.867 0-.285-.023-.571-.071-.854a5.4 5.4 0 0 0-.498-1.563 7.3 7.3 0 0 0-.676-1.107 5.1 5.1 0 0 0-.575-.673 3.6 3.6 0 0 0-.33-.274c-.116-.087-.237-.167-.36-.24a2.6 2.6 0 0 0-.383-.19 1.5 1.5 0 0 0-.397-.1.9.9 0 0 0-.254.013.6.6 0 0 0-.222.1.5.5 0 0 0-.156.18.5.5 0 0 0-.053.233c0 .1.023.193.071.278.048.084.11.159.19.222.272.222.512.476.72.762.207.285.384.593.528.924.145.33.254.682.33 1.054.074.373.11.762.11 1.17 0 .396-.036.78-.11 1.15-.075.37-.19.72-.343 1.05-.154.33-.345.638-.575.924a4.1 4.1 0 0 1-.804.752c.254.123.5.262.736.416.235.155.457.326.664.514.207.19.397.394.571.614.174.22.323.459.448.714z"/></svg>
                  Amazon
                </a>
                
                {/* Barnes & Noble Button */}
                <a 
                  href={barnesAndNobleLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md bg-[#1C4A3A]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
                  Barnes & Noble
                </a>

                {/* Share Button */}
                <ShareButton title={book.title} author={book.author} />

                {/* Save to profile button (Requires user to be logged in) */}
                <SaveToBookshelfButton 
                  bookId={book.id} 
                  coverUrl={coverUrl || ''}
                  initialStatus={initialShelfStatus as any} 
                  isAuthenticated={!!user} 
                />
              </div>
            </div>

            {/* ═══ Book Metadata Grid ═══ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-10 pt-8 border-t border-gray-100">
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                  <Star className="w-3.5 h-3.5" /> Rating
                </span>
                <span className="font-semibold text-gray-900">
                  {book.expert_rating ? `${book.expert_rating}/100 Expert` : (book.community_rating ? `${book.community_rating}/5 Reader` : 'No rating yet')}
                </span>
              </div>

              {/* Reading Time (computed from page count) */}
              {book.page_count && book.page_count > 0 ? (
                <ReadingTimeEstimate pageCount={book.page_count} />
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <BookOpen className="w-3.5 h-3.5" /> Length
                  </span>
                  <span className="font-semibold text-gray-900 capitalize">
                    {book.length_category || 'Standard'}
                  </span>
                </div>
              )}

              {book.published_year && (
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5" /> Published
                  </span>
                  <span className="font-semibold text-gray-900">
                    {book.published_year}
                  </span>
                </div>
              )}

              {book.vibe && (
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <Tag className="w-3.5 h-3.5" /> Vibe
                  </span>
                  <span className="font-semibold text-gray-900 capitalize">
                    {book.vibe}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                  <Barcode className="w-3.5 h-3.5" /> ISBN
                </span>
                <span className="font-semibold text-gray-900 text-sm">
                  {cleanIsbn && cleanIsbn !== '0000000000' ? cleanIsbn : 'N/A'}
                </span>
              </div>
            </div>

            {/* ═══ About the Author (Rich Card) ═══ */}
            <div className="mt-8 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                {/* Author Photo or Placeholder */}
                {authorImageUrl ? (
                  <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-100 shadow-sm">
                    <Image 
                      src={authorImageUrl} 
                      alt={book.author}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0 text-gray-400 shadow-sm">
                    <UserCircle2 className="w-8 h-8" />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">About the Author</h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span className="font-bold text-lg text-gray-900">{book.author}</span>
                    <Link 
                      href={`/authors/${encodeURIComponent(book.author)}`}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      View all books →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ═══ Author Bio Panel (AI-generated deep bio) ═══ */}
        <div className="mb-12">
          <AuthorBioPanel authorName={book.author} />
        </div>

        {/* ═══ AI Review — Full Width ═══ */}
        <div className="mb-12">
          <AIReviewPanel book={book} />
        </div>

        {/* ═══ ML-Powered Similar Books — Full Width ═══ */}
        <div className="mb-12">
          <SimilarBooksSection
            bookId={book.id}
            bookTitle={book.title}
            nextBook={book.next_book}
          />
        </div>

        {/* ═══ Series Info ═══ */}
        <div className="mb-12">
          <SeriesPanel title={book.title} author={book.author} />
        </div>

        {/* ═══ Bottom Section: User Reviews ═══ */}
        <div className="mb-16">
          <UserReviews bookId={book.id} initialReviews={reviews} currentUserId={user?.id ?? null} />
        </div>

      </div>
    </div>
  );
}
