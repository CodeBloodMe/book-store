'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { Book } from '@/types/database';

interface BookCardProps {
  book: Book;
  featured?: boolean;
}

function getCoverUrls(book: Book) {
  const urls = { primary: '', fallback: '' };
  const pcServerBase = (process.env.NEXT_PUBLIC_PC_SERVER_URL || '').replace(/\/$/, '');
  
  // 1. If we have a cover URL in the database
  if (book.cover_image_url) {
    urls.primary = book.cover_image_url;
    
    // If it's an Open Library URL, configure the PC Server as a fallback
    if (book.cover_image_url.includes('covers.openlibrary.org') && pcServerBase) {
      const match = book.cover_image_url.match(/covers\.openlibrary\.org\/b\/(.+?)\/(.+?)-(.+?)\.jpg/);
      if (match) {
        let [, type, id, size] = match;
        const cleanIsbn = book.isbn?.replace(/[-\s]/g, '');
        if (type === 'id' && cleanIsbn) {
            type = 'isbn';
            id = cleanIsbn;
        }
        urls.fallback = `${pcServerBase}/covers/${type}/${id}/${size}`;
      }
    }
    
    return urls;
  }
  
  // 2. If no cover URL, but we have an ISBN
  if (book.isbn) {
    const cleanIsbn = book.isbn.replace(/[-\s]/g, '');
    const olUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
    
    /* USER: Uncomment this block later to re-enable Open Library
    urls.primary = olUrl;
    if (pcServerBase) {
      urls.fallback = `${pcServerBase}/covers/isbn/${cleanIsbn}/L`;
    }
    */

    // USER: Delete this block when you uncomment the above
    if (pcServerBase) {
      urls.primary = `${pcServerBase}/covers/isbn/${cleanIsbn}/L`;
    } else {
      urls.primary = olUrl;
    }
  }
  
  return urls;
}

export default function BookCard({ book, featured = false }: BookCardProps) {
  // 0: trying primary, 1: trying fallback, 2: both failed (show placeholder)
  const [imageErrorLevel, setImageErrorLevel] = useState(0);
  const [dominantColor, setDominantColor] = useState('transparent');

  const { primary, fallback } = getCoverUrls(book);
  const currentCoverUrl = imageErrorLevel === 0 ? primary : (imageErrorLevel === 1 ? fallback : '');
  const shouldShowCover = currentCoverUrl !== '' && imageErrorLevel < 2;

  useEffect(() => {
    if (!shouldShowCover || !currentCoverUrl) return;
    
    import('fast-average-color').then(({ FastAverageColor }) => {
      const colorExtractor = new FastAverageColor();
      const hiddenImage = new window.Image();
      hiddenImage.crossOrigin = 'anonymous';
      hiddenImage.src = currentCoverUrl;
      
      hiddenImage.onload = () => {
        colorExtractor.getColorAsync(hiddenImage, { algorithm: 'dominant' })
          .then((colorResult) => {
            setDominantColor(colorResult.rgba);
          })
          .catch(() => {});
      };
    });
  }, [currentCoverUrl, shouldShowCover]);

  const handleImageError = () => {
    if (imageErrorLevel === 0 && fallback) {
      setImageErrorLevel(1); // Try fallback
    } else {
      setImageErrorLevel(2); // Show placeholder
    }
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const imageElement = event.currentTarget;
    if (imageElement.naturalWidth <= 1) {
      handleImageError();
    }
  };

  const cardHeightClass = featured ? 'h-[320px] sm:h-[460px]' : 'h-[280px] sm:h-[420px]';
  const cardClasses = `relative overflow-hidden group rounded-[20px] sm:rounded-[24px] shadow-sm hover:shadow-xl transition-all duration-300 ${cardHeightClass}`;

  return (
    <article className={cardClasses} style={{ backgroundColor: '#222222' }}>
      <Link 
        href={`/books/${book.id}`} 
        className="absolute inset-0 z-10" 
        aria-label={`View details for ${book.title}`} 
      />

      <div className="absolute inset-0 bg-gray-900 pointer-events-none">
        {shouldShowCover ? (
          <Image
            src={currentCoverUrl}
            alt={`Cover of ${book.title}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={handleImageError}
            onLoad={handleImageLoad}
            unoptimized={true}
          />
        ) : (
          <div className="relative w-full h-full flex items-end p-6 transition-transform duration-700 group-hover:scale-105 bg-[#e5e5e5]">
            <img 
              src="/placeholder-book.png" 
              alt="Placeholder cover" 
              className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-50 grayscale"
            />
          </div>
        )}
        
        <div 
          className="absolute inset-0 pointer-events-none transition-all duration-1000" 
          style={{
            background: `linear-gradient(to top, ${dominantColor} 0%, transparent 70%)`,
            opacity: dominantColor === 'transparent' ? 0 : 0.8
          }}
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 from-10% via-black/20 to-transparent pointer-events-none" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5 md:p-6 flex flex-col justify-end z-20 pointer-events-none">
        
        <h3
          className={`font-bold leading-tight line-clamp-2 mb-1 sm:mb-2 ${featured ? 'text-xl sm:text-[26px]' : 'text-lg sm:text-[22px]'}`}
          style={{ 
            color: '#ffffff',
            fontFamily: 'var(--font-serif)',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}
        >
          {book.title}
        </h3>
        
        <p className="text-gray-300 text-xs sm:text-sm line-clamp-1 mb-2 sm:mb-4">
          by <Link href={`/authors/${encodeURIComponent(book.author)}`} className="font-bold hover:underline relative z-30 pointer-events-auto transition-colors" style={{ color: '#f5e642' }}>{book.author}</Link>
        </p>

        <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-5">
          {book.genres && (
            <div className="bg-[#222]/80 backdrop-blur-sm text-gray-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 border border-white/10">
              <svg width="10" height="10" className="sm:w-3 sm:h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
              <span className="truncate max-w-[80px] sm:max-w-none">{book.genres.name}</span>
            </div>
          )}
          
          {book.difficulty_level && (
            <div className="bg-[#222]/80 backdrop-blur-sm text-gray-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium border border-white/10">
              {book.difficulty_level}
            </div>
          )}
          
          {book.is_bestseller && (
            <div className="hidden sm:flex bg-[#222]/80 backdrop-blur-sm text-[#f59e0b] px-3 py-1.5 rounded-full text-xs font-medium border border-[#f59e0b]/30">
              Top Rated
            </div>
          )}
        </div>

        <div className="w-full bg-white text-gray-900 font-bold py-2 sm:py-3.5 rounded-[12px] sm:rounded-[16px] text-center text-xs sm:text-sm shadow-md transition-transform group-hover:scale-[1.02]">
          View Details
        </div>
      </div>
    </article>
  );
}
