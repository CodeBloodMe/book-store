export const dynamic = 'force-dynamic';

import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import AuthorBioPanel from '@/components/features/AuthorBioPanel';
import BookCover from '@/components/ui/BookCover';
import { searchOpenLibrary, fetchAuthorImage } from '@/lib/external-books';

interface AuthorPageProps {
  params: Promise<{
    name: string;
  }>;
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const resolvedParams = await params;
  const authorName = decodeURIComponent(resolvedParams.name);

  // Fetch all books by this author
  const { data: books, error } = await supabase
    .from('books')
    .select('id, title, cover_image_url, expert_rating, community_rating, published_year, genres(name)')
    .ilike('author', authorName)
    .order('published_year', { ascending: false });

  if (error) {
    return <div className="p-24 text-center text-red-500">Database Error: {error.message}</div>;
  }

  // Fetch external books by this author
  const externalBooks = await searchOpenLibrary(`author:"${authorName}"`);

  // Fetch author image from Wikipedia
  const authorImage = await fetchAuthorImage(authorName);
  
  // Merge and filter out duplicates (prefer local books)
  const allBooks = [...(books || [])];
  const existingTitles = new Set(allBooks.map(b => b.title.toLowerCase()));

  externalBooks.forEach(extBook => {
    if (extBook.title && !existingTitles.has(extBook.title.toLowerCase())) {
      allBooks.push(extBook as any); // Type assertion for UI rendering compatibility
      existingTitles.add(extBook.title.toLowerCase());
    }
  });

  if (allBooks.length === 0) {
    return <div className="p-24 text-center">No books found for author: "{authorName}"</div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] pb-24">
      {/* Neo-brutalist Header */}
      <div className="bg-[#0a0a0a] text-white pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white mb-8 transition-colors">
              ← Back to Home
            </Link>
            <h1 
              className="text-5xl md:text-7xl font-black mb-4 uppercase"
              style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.02em' }}
            >
              {authorName}
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl">
              Explore the works, writing style, and complete catalog of this author.
            </p>
          </div>
          
          {/* Author Image */}
          {authorImage && (
            <div 
              className="flex-shrink-0 mb-4 md:mb-0 relative"
              style={{ 
                width: 160, 
                height: 160, 
                border: '4px solid #fff', 
                boxShadow: '6px 6px 0 #f5e642',
                backgroundColor: '#222'
              }}
            >
              <img 
                src={authorImage} 
                alt={`Portrait of ${authorName}`}
                className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-500"
              />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-[-40px] relative z-10 space-y-12">
        {/* Author Bio Panel */}
        <AuthorBioPanel authorName={authorName} />

        {/* Books Grid */}
        <div>
          <h2 className="text-3xl font-black mb-8" style={{ color: '#0a0a0a' }}>
            Catalog ({allBooks.length} Books)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {allBooks.map((book) => (
              <Link key={book.id} href={`/books/${book.id}`} className="group block">
                <div 
                  className="relative rounded-2xl overflow-hidden mb-3 transition-transform group-hover:-translate-y-2"
                  style={{ 
                    border: '3px solid #0a0a0a', 
                    boxShadow: '4px 4px 0 #0a0a0a',
                    aspectRatio: '2/3',
                    background: '#f0f0f0'
                  }}
                >
                  <BookCover
                    src={book.cover_image_url}
                    alt={book.title}
                    fallbackGradient="linear-gradient(135deg, #1f2937 0%, #4b5563 100%)"
                    fallbackText={book.title}
                  />
                </div>
                <h3 className="font-bold text-base leading-snug text-gray-900 group-hover:underline">
                  {book.title}
                </h3>
                {book.published_year && (
                  <p className="text-xs text-gray-500 font-semibold mt-1">
                    {book.published_year}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
