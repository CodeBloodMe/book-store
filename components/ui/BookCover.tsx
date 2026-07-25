'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import GeneratedCover from './GeneratedCover';

/**
 * Properties required to render a BookCover
 */
interface BookCoverProps {
  src: string | null;        // The URL of the book cover image (primary)
  fallbackSrc?: string | null; // The URL to try if the primary fails
  alt: string;               // Screen-reader text describing the image
  fallbackGradient: string;  // A CSS gradient string used if the image fails to load
  fallbackText: string;      // The book title text to display if the image fails to load
  fallbackAuthor?: string;   // The book author for the generated cover
}

export default function BookCover({ src, fallbackSrc, alt, fallbackGradient, fallbackText, fallbackAuthor }: BookCoverProps) {

  const [currentUrl, setCurrentUrl] = useState<string | null>(src);
  const [hasImageError, setHasImageError] = useState(false);
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);

  // Reset state when src changes (e.g., navigating between books)
  useEffect(() => {
    setCurrentUrl(src);
    setHasImageError(false);
    setIsFullyLoaded(false);
  }, [src]);

  const shouldShowCover = Boolean(currentUrl) && currentUrl !== '' && hasImageError === false;

  // Memoized error handler to avoid stale closure bugs in useEffect
  const handleError = useCallback(() => {
    setCurrentUrl(prevUrl => {
      // If the primary URL failed, try the fallback if provided
      if (prevUrl === src && fallbackSrc && fallbackSrc !== src) {
        return fallbackSrc;
      }
      // If we've exhausted all options, trigger error state
      setHasImageError(true);
      return prevUrl;
    });
  }, [src, fallbackSrc]);

  // Prevent infinite loading skeletons — 12-second timeout.
  // The PC cover server may take 6-8s on a cold cache miss (first fetch from Google Books).
  // After it's cached on disk, all subsequent loads are <50ms.
  useEffect(() => {
    if (!shouldShowCover || !currentUrl || isFullyLoaded) return;

    const timer = setTimeout(() => {
      handleError();
    }, 12000);

    return () => clearTimeout(timer);
  }, [currentUrl, shouldShowCover, isFullyLoaded, handleError]);

  if (shouldShowCover && currentUrl) {
    return (
      <div className="relative w-full h-full bg-gray-200">

        {/* Loading Skeleton */}
        {!isFullyLoaded && (
          <div className="absolute inset-0 flex items-center justify-center animate-pulse bg-gray-200">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}

        {/* The Actual Image */}
        <Image
          src={currentUrl}
          alt={alt}
          fill
          onError={handleError}
          onLoad={(event) => {
            const imageElement = event.currentTarget;
            // Catch OpenLibrary's fake 1x1 blank pixels
            if (imageElement.naturalWidth <= 1) {
              handleError();
            } else {
              setIsFullyLoaded(true);
            }
          }}
          className={`object-cover transition-opacity duration-300 ${isFullyLoaded ? 'opacity-100' : 'opacity-0'}`}
          unoptimized={true}
        />
      </div>
    );
  }

  // Fallback: Show a beautiful GeneratedCover instead of ugly placeholder
  return (
    <GeneratedCover title={fallbackText} author={fallbackAuthor} />
  );
}
