'use client'; // This component uses React state (useState), so it must run on the client side

import { useState, useEffect } from 'react';
import Image from 'next/image';



/**
 * Properties required to render a BookCover
 */
interface BookCoverProps {
  src: string | null;        // The URL of the book cover image
  alt: string;               // Screen-reader text describing the image
  fallbackGradient: string;  // A CSS gradient string used if the image fails to load
  fallbackText: string;      // The book title text to display if the image fails to load
}



export default function BookCover({ src, alt, fallbackGradient, fallbackText }: BookCoverProps) {

  // USER: Uncomment this later to re-enable Open Library
  // const [currentUrl, setCurrentUrl] = useState<string | null>(src);
  
  // USER: Delete this block when you uncomment the above
  const [currentUrl, setCurrentUrl] = useState<string | null>(() => {
    if (src && src.includes('covers.openlibrary.org') && process.env.NEXT_PUBLIC_PC_SERVER_URL) {
      const serverBase = process.env.NEXT_PUBLIC_PC_SERVER_URL.replace(/\/$/, '');
      const match = src.match(/covers\.openlibrary\.org\/b\/(.+?)\/(.+?)-(.+?)\.jpg/);
      if (match) {
        return `${serverBase}/covers/${match[1]}/${match[2]}/${match[3]}`;
      }
    }
    return src;
  });
  
  // Tracks if the image link is broken (e.g. 404 error)
  const [hasImageError, setHasImageError] = useState(false);
  
  // Tracks if the image has finished downloading to the user's browser
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);
  
  // We should try to show the cover ONLY if we have a URL and it hasn't errored out completely
  const shouldShowCover = currentUrl !== null && hasImageError === false;

  const handleError = () => {
    // If the original URL failed, AND it's an Open Library URL, AND we have a PC Server configured
    if (currentUrl === src && src && src.includes('covers.openlibrary.org') && process.env.NEXT_PUBLIC_PC_SERVER_URL) {
      const serverBase = process.env.NEXT_PUBLIC_PC_SERVER_URL.replace(/\/$/, '');
      const match = src.match(/covers\.openlibrary\.org\/b\/(.+?)\/(.+?)-(.+?)\.jpg/);
      if (match) {
        const [_, type, id, size] = match;
        // Fallback to PC Server!
        setCurrentUrl(`${serverBase}/covers/${type}/${id}/${size}`);
        return;
      }
    }
    // If we've exhausted all options or it wasn't an Open Library URL
    setHasImageError(true);
  };

  // Prevent infinite loading skeletons by enforcing a strict 15-second timeout
  // (We need 15 seconds because the PC proxy server might take up to 10 seconds to fallback across Open Library -> Apple Books -> Google Books)
  useEffect(() => {
    if (!shouldShowCover || !currentUrl || isFullyLoaded) return;
    
    const timer = setTimeout(() => {
      handleError();
    }, 15000);
    
    return () => clearTimeout(timer);
  }, [currentUrl, shouldShowCover, isFullyLoaded, src]);


  
  if (shouldShowCover && currentUrl) {
    return (
      <div className="relative w-full h-full bg-gray-200">
        
        {/* Loading Skeleton */}
        {/* If the image is still downloading, show a pulsing animation and a book icon */}
        {!isFullyLoaded && (
          <div className="absolute inset-0 flex items-center justify-center animate-pulse bg-gray-200">
            {/* SVG Book Icon */}
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}
        {/* The Actual Image */}
        <Image
          src={currentUrl}
          alt={alt}
          fill // Tells Next.js to stretch this image to exactly fit the parent <div>
          
          // Triggered if the server returns a 404 or connection error
          onError={handleError}
          
          // Triggered when the image successfully downloads
          onLoad={(event) => {
            const imageElement = event.currentTarget;
            // Sometimes external APIs return a tiny 1x1 blank pixel instead of a 404 error.
            // We check the width to catch this fake "success" and mark it as an error.
            if (imageElement.naturalWidth <= 1) {
              handleError();
            } else {
              setIsFullyLoaded(true); // Image is real and ready!
            }
          }}
          
          // This class handles the fade-in effect. It stays opacity-0 until isFullyLoaded is true.
          className={`object-cover transition-opacity duration-300 ${isFullyLoaded ? 'opacity-100' : 'opacity-0'}`}
          
          // Bypasses Next.js server optimization (necessary for OpenLibrary redirects)
          unoptimized={true}
        />
      </div>
    );
  }

  // Fallback Case: If `src` was null or errored out
  // We display a beautiful generic placeholder instead.
  
  return (
    <div className="relative w-full h-full flex items-end p-4 overflow-hidden bg-gray-100">
      
      {/* Background generic texture */}
      <Image 
        src="/placeholder-book.png" 
        alt="Placeholder cover" 
        fill
        className="object-cover"
        unoptimized={true} // It's a tiny local file, no need to optimize
      />
      
      {/* Dark gradient to make the text readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      
      {/* The Book Title displayed over the placeholder */}
      <span className="relative z-10 text-white font-bold text-lg leading-tight drop-shadow-lg line-clamp-3">
        {fallbackText}
      </span>
      
    </div>
  );
}
