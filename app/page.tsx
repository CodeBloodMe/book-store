import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllGenres, getTopRatedBooks } from '@/lib/queries';
import BookCard from '@/components/ui/BookCard';
import GenreCard from '@/components/ui/GenreCard';
import RecommendWizard from '@/components/features/RecommendWizard';
import VibeSearchBox from '@/components/features/VibeSearchBox';
import FloatingCovers from '@/components/features/FloatingCovers';
import type { Genre } from '@/types/database';
import { Sparkles, Search, GraduationCap, BookOpen, Sprout } from 'lucide-react';

// Metadata (SEO)
export const metadata: Metadata = {
  title: 'ChapterOne — Find Your Perfect Book with AI',
  description: 'Tell us what you want and our AI finds the perfect book for you instantly. 1,200+ curated books across every genre.',
};

// Caching Rules
// It ensures that when you add a new book to the database, it shows up here.
export const revalidate = 0;

export default async function HomePage() {
  // Fetch Data from Database
  const [allGenres, topRatedBooks] = await Promise.all([
    getAllGenres().catch(() => []),
    getTopRatedBooks(8).catch(() => []),
  ]);

  // Organize Data
  const groupedGenres: Record<string, Genre[]> = {};

  // Loop through every genre we got from the database
  for (const genre of allGenres) {
    // Determine its parent category. If it doesn't have one, call it 'Other'.
    const categoryName = genre.super_categories?.name ?? 'Other';

    // If we haven't seen this category yet, create an empty array for it
    if (!groupedGenres[categoryName]) {
      groupedGenres[categoryName] = [];
    }

    // Put the genre into the correct category array
    groupedGenres[categoryName].push(genre);
  }

  // Define the exact order we want these categories to appear on the screen
  const categoryDisplayOrder = ['Learning', 'Fiction', 'Personal Growth'];


  return (
    <>
      {/* Hero & AI Wizard */}
      <section className="relative py-16 px-4 bg-[#f5f5f0] overflow-hidden">

        {/* Floating Book Covers */}
        <FloatingCovers books={topRatedBooks} />

        <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">

          {/* Small Yellow Badge */}
          <div className="inline-flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-4 bg-[#f5e642] text-[#0a0a0a] border-2 border-[#0a0a0a] shadow-[3px_3px_0_#0a0a0a]">
            <Sparkles size={14} /> Find Books That suits you
          </div>

          {/* Subtitle */}
          <h2 className="text-xl md:text-2xl font-bold mb-2 uppercase tracking-wide text-[#0a0a0a]">
            Find Your Perfect Book with
          </h2>

          {/* Main Title */}
          <h1 className="font-black leading-none mb-10 text-[#0a0a0a]" style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(36px, 10vw, 100px)', letterSpacing: '-0.02em' }}>
            ChapterOne
          </h1>

          <p className="w-full max-w-3xl mx-auto text-left text-sm font-bold text-[#555] mb-3 pl-2">
            Write your taste below.
          </p>

          {/* Manual Search Box */}
          <VibeSearchBox />

          {/* "OR" Divider */}
          <div className="mb-10 flex items-center gap-4 w-full">
            <div className="flex-1 h-px bg-[#ddd]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#aaa]">or use our guided wizard</span>
            <div className="flex-1 h-px bg-[#ddd]" />
          </div>

          {/* The interactive AI Wizard Component (Client Component) */}
          <RecommendWizard />
        </div>
      </section>

      {/* Top Rated Books */}
      {/* We only show this section if we successfully loaded books */}
      {topRatedBooks.length > 0 && (
        <section className="py-16 bg-white border-t-[3px] border-[#0a0a0a]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Section Header */}
            <div className="flex items-start justify-between mb-8 gap-4">
              <div>
                <h2 className="font-black mb-1 text-[#0a0a0a]" style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(28px, 4vw, 40px)', letterSpacing: '0.02em' }}>
                  Highest Rated Right Now
                </h2>
                <p className="text-sm text-[#777]">
                  Books with the strongest expert consensus across all genres.
                </p>
              </div>

              {/* Button to scroll down to genres */}
              <Link
                href="/#genres"
                className="flex-shrink-0 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full bg-[#f5f5f0] text-[#0a0a0a] border-2 border-[#0a0a0a] shadow-[3px_3px_0_#0a0a0a]"
              >
                All Genres →
              </Link>
            </div>

            {/* Grid of Book Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {/* We loop through the array of books and render a BookCard for each one */}
              {topRatedBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>

          </div>
        </section>
      )}

      {/* Browse By Genre */}
      {/* Notice the `id="genres"`. This allows the "All Genres ->" button above to scroll exactly to this spot! */}
      <section id="genres" className="py-16 bg-[#f5f5f0] border-t-[3px] border-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="mb-10">
            <h2 className="font-black mb-2 text-[#0a0a0a]" style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(28px, 4vw, 40px)', letterSpacing: '0.02em' }}>
              Browse by Genre
            </h2>
            <p className="text-sm text-[#777]">
              Every genre curated with the absolute best books — ranked by expert consensus.
            </p>
          </div>

          {/* 
            We loop through our specific category order ("Learning", "Fiction", etc).
            The `.filter` ensures we skip categories that don't have any genres in them yet.
          */}
          {categoryDisplayOrder.filter((categoryName) => groupedGenres[categoryName]).map((categoryName) => (
            <div key={categoryName} className="mb-12">

              {/* Category Title Badge */}
              <h3 className="inline-block text-sm font-bold uppercase tracking-widest mb-6 px-5 py-2 text-[#0a0a0a] bg-white border-[3px] border-[#0a0a0a] rounded-full shadow-[4px_4px_0_#0a0a0a]">
                <span className="inline-flex items-center gap-2">
                  {/* Show a different icon based on the category name */}
                  {categoryName === 'Learning' && <GraduationCap size={16} />}
                  {categoryName === 'Fiction' && <BookOpen size={16} />}
                  {categoryName === 'Personal Growth' && <Sprout size={16} />}
                  {categoryName}
                </span>
              </h3>

              {/* Top 5 Genres Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {/* We only show the first 5 genres (index 0 to 5) so the page doesn't get overwhelmingly long */}
                {groupedGenres[categoryName].slice(0, 5).map((genre) => (
                  <GenreCard key={genre.id} genre={genre} />
                ))}
              </div>

              {/* Expandable "Show More" Area */}
              {/* If there are more than 5 genres in this category, we hide the rest behind a native HTML <details> tag */}
              {groupedGenres[categoryName].length > 5 && (
                <div className="mt-4">
                  <details>
                    {/* <summary> is what the user clicks to expand */}
                    <summary className="text-xs font-bold uppercase tracking-widest cursor-pointer inline-flex items-center gap-1 text-[#888] list-none">
                      + {groupedGenres[categoryName].length - 5} more {categoryName} genres
                    </summary>

                    {/* This div is revealed when the user clicks */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mt-4">
                      {/* We show the rest of the genres (everything after index 5) */}
                      {groupedGenres[categoryName].slice(5).map((genre) => (
                        <GenreCard key={genre.id} genre={genre} />
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer Call to Action (CTA) */}
      <section className="py-16 bg-[#0a0a0a] border-t-[3px] border-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-4 text-center">

          <p className="text-xs font-bold uppercase tracking-widest mb-4 text-[#555]">
            Can&apos;t find what you want?
          </p>

          <h2 className="font-black leading-tight mb-4" style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(36px, 5vw, 60px)', letterSpacing: '0.02em', color: '#f5f5f0' }}>
            Just Tell Us What You Want
          </h2>

          <p className="text-base mb-8 max-w-lg mx-auto text-[#aaa]">
            Type anything — "a beginner book on investing" or "something like Harry Potter but darker". Our AI understands.
          </p>

          <Link
            href="/recommend"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-black text-base transition-all hover:-translate-y-1 bg-[#f5e642] border-[3px] border-[#f5e642] shadow-[5px_5px_0_rgba(245,230,66,0.3)]"
            style={{ color: '#0a0a0a' }}
          >
            <Sparkles size={18} color="#0a0a0a" /> Start AI Book Search
          </Link>

        </div>
      </section>
    </>
  );
}