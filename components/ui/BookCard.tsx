'use client'; // This tells Next.js that this component runs in the user's browser, not on the server.

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { Book } from '@/types/database';




interface BookCardProps {
  book: Book;          // The database object containing the book's details
  featured?: boolean;  // Optional: If true, the card is drawn taller
}



/**
 * Determines the best URL to use for the book's cover image.
 * 
 * @param book The book object
 * @returns A string containing the URL of the image, or an empty string if none exists.
 */
function getCoverUrl(book: Book): string {
  // 1. If we have a direct image URL stored in our database, use it!
  if (book.cover_image_url) {
    return book.cover_image_url;
  }
  
  // 2. If we don't have an image, but we DO have an ISBN (book barcode number),
  // we can fetch a free cover from the OpenLibrary API.
  if (book.isbn) {
    // Remove any dashes or spaces from the ISBN (e.g. "978-3-16" -> "978316")
    const cleanIsbn = book.isbn.replace(/[-\s]/g, '');
    return `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
  }
  
  // 3. If we have neither, return an empty string. The component will show a fallback image.
  return '';
}



export default function BookCard({ book, featured = false }: BookCardProps) {

  
  // Keeps track of whether the image failed to load (e.g. broken link)
  const [hasImageError, setHasImageError] = useState(false);
  
  // Stores the dominant color of the book cover to create a cool glowing effect
  const [dominantColor, setDominantColor] = useState('transparent');


  const coverUrl = getCoverUrl(book);
  const shouldShowCover = coverUrl !== '' && hasImageError === false;
  const genre = book.genres;


  useEffect(() => {
    // If there is no cover, we don't need to extract a color. Stop here.
    if (!shouldShowCover) {
      return;
    }
    
    // We dynamically import the 'fast-average-color' library.
    // This is an advanced optimization! It means the browser won't download
    // this code until it's actually needed, speeding up the initial page load.
    import('fast-average-color').then(({ FastAverageColor }) => {
      const colorExtractor = new FastAverageColor();
      
      // Create a hidden image in memory to analyze
      const hiddenImage = new window.Image();
      hiddenImage.crossOrigin = 'anonymous'; // Required to read colors from external websites
      hiddenImage.src = coverUrl;
      
      // Once the hidden image finishes loading, extract its dominant color
      hiddenImage.onload = () => {
        colorExtractor.getColorAsync(hiddenImage, { algorithm: 'dominant' })
          .then((colorResult) => {
            // Success! Save the color (e.g. "rgba(255, 0, 0, 1)") to state
            setDominantColor(colorResult.rgba);
          })
          .catch((error) => {
            // If it fails, do nothing. It will safely stay 'transparent'.
          });
      };
    });
  }, [coverUrl, shouldShowCover]); // This array tells React to re-run this effect if the coverUrl changes


  
  // We build a list of CSS classes for the main card container.
  // If `featured` is true, we make it taller.
  const cardHeightClass = featured ? 'h-[400px] sm:h-[460px]' : 'h-[360px] sm:h-[420px]';
  const cardClasses = `relative overflow-hidden group rounded-[24px] shadow-sm hover:shadow-xl transition-all duration-300 ${cardHeightClass}`;

  return (
    <article className={cardClasses} style={{ backgroundColor: '#222222' }}>
      
      {/* 
        This invisible link covers the entire card.
        We put it behind the text (z-10) so you can still click the Author's name specifically.
      */}
      <Link 
        href={`/books/${book.id}`} 
        className="absolute inset-0 z-10" 
        aria-label={`View details for ${book.title}`} 
      />

      {/* Background Layer (Images & Colors) */}
      <div className="absolute inset-0 bg-gray-900 pointer-events-none">
        
        {/* If we have a valid cover, show the Next.js Image component */}
        {shouldShowCover ? (
          <Image
            src={coverUrl}
            alt={`Cover of ${book.title}`}
            fill // Tells Next.js to stretch the image to fill the container
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            
            // If the image link is completely broken (404 error), Next.js fires onError
            onError={() => {
              setHasImageError(true);
            }}
            
            // Sometimes OpenLibrary doesn't 404, but returns a tiny 1x1 pixel image instead.
            // We check the image width after it loads to catch this specific error.
            onLoad={(event) => {
              const imageElement = event.currentTarget;
              if (imageElement.naturalWidth <= 1) {
                setHasImageError(true);
              }
            }}
            
            // We bypass Next.js server-side image compression because external APIs like
            // OpenLibrary frequently use redirects, which breaks the Next.js optimizer.
            unoptimized={true}
          />
        ) : (
          /* If there is no cover (or it errored out), show this fallback placeholder */
          <div className="relative w-full h-full flex items-end p-6 transition-transform duration-700 group-hover:scale-105 bg-[#e5e5e5]">
            {/* Using a standard HTML img tag here because it's a local static file */}
            <img 
              src="/placeholder-book.png" 
              alt="Placeholder cover" 
              className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-50 grayscale"
            />
          </div>
        )}
        
        {/* The glowing tinted gradient based on the extracted dominant color */}
        <div 
          className="absolute inset-0 pointer-events-none transition-all duration-1000" 
          style={{
            background: `linear-gradient(to top, ${dominantColor} 0%, transparent 70%)`,
            // If we don't have a color yet, keep it invisible (opacity 0)
            opacity: dominantColor === 'transparent' ? 0 : 0.8
          }}
        />
        
        {/* A final dark gradient at the bottom to ensure the white text is always readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 from-10% via-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Foreground Layer (Text & Buttons) */}
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 flex flex-col justify-end z-20 pointer-events-none">
        
        {/* Book Title */}
        <h3
          className="font-bold leading-tight line-clamp-2 mb-2"
          style={{ 
            color: '#ffffff',
            fontSize: featured ? '26px' : '22px', 
            fontFamily: 'var(--font-serif)',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}
        >
          {book.title}
        </h3>
        
        {/* Book Description & Author */}
        <p className="text-gray-300 text-sm leading-relaxed line-clamp-3 mb-4">
          {book.description ? (
            <>
              {/* Notice `pointer-events-auto` allows you to click this specific link even though the container has `pointer-events-none` */}
              <Link 
                href={`/authors/${encodeURIComponent(book.author)}`} 
                className="font-bold text-white hover:underline relative z-30 pointer-events-auto"
              >
                {book.author}
              </Link>
              {' — '}{book.description}
            </>
          ) : (
            `An incredible work by ${book.author} that has captured the attention of experts and readers alike.`
          )}
        </p>

        {/* Tags (Genre, Difficulty, Bestseller) */}
        <div className="flex flex-wrap gap-2 mb-5">
          {/* We use an 'if' equivalent here. {genre && (...)} means "If genre exists, render the div" */}
          
          {genre && (
            <div className="bg-[#222]/80 backdrop-blur-sm text-gray-200 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border border-white/10">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
              {genre.name}
            </div>
          )}
          
          {book.difficulty_level && (
            <div className="bg-[#222]/80 backdrop-blur-sm text-gray-200 px-3 py-1.5 rounded-full text-xs font-medium border border-white/10">
              {book.difficulty_level}
            </div>
          )}
          
          {book.is_bestseller && (
            <div className="bg-[#222]/80 backdrop-blur-sm text-[#f59e0b] px-3 py-1.5 rounded-full text-xs font-medium border border-[#f59e0b]/30">
              Top Rated
            </div>
          )}
        </div>

        {/* View Details Fake Button */}
        {/* We don't need a real link here because the invisible Link overlay covers the whole card! */}
        <div className="w-full bg-white text-gray-900 font-bold py-3.5 rounded-[16px] text-center text-sm shadow-md transition-transform group-hover:scale-[1.02]">
          View Details
        </div>
        
      </div>
    </article>
  );
}
