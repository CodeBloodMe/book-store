'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import GeneratedCover from './GeneratedCover';

/**
 * Properties required to render a BookCover
 */
interface BookCoverProps {
  src: string | null;          // The URL of the book cover image (primary)
  fallbackSrc?: string | null; // The URL to try if the primary fails
  tertiarySrc?: string | null; // Third-tier fallback URL
  alt: string;                 // Screen-reader text describing the image
  fallbackGradient: string;    // A CSS gradient string used if the image fails to load
  fallbackText: string;        // The book title text to display if the image fails to load
  fallbackAuthor?: string;     // The book author for the generated cover
}

export default function BookCover({ src, fallbackSrc, tertiarySrc, alt, fallbackGradient, fallbackText, fallbackAuthor }: BookCoverProps) {

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

  // Memoized error handler with 3-tier fallback chain:
  // primary → fallback → tertiary → GeneratedCover
  const handleError = useCallback(() => {
    setCurrentUrl(prevUrl => {
      // Tier 1 failed → try fallback
      if (prevUrl === src && fallbackSrc && fallbackSrc !== src) {
        return fallbackSrc;
      }
      // Tier 2 failed → try tertiary
      if (prevUrl === fallbackSrc && tertiarySrc && tertiarySrc !== fallbackSrc) {
        return tertiarySrc;
      }
      // All tiers exhausted → show GeneratedCover
      setHasImageError(true);
      return prevUrl;
    });
  }, [src, fallbackSrc, tertiarySrc]);

  // Prevent infinite loading skeletons — 6-second timeout.
  // Reduced from 12s: if a cover hasn't loaded in 6 seconds on production,
  // it's better to show the GeneratedCover than keep users waiting.
  // The PC cover server cold cache miss (6-8s) is handled by the fallback
  // chain moving to the next URL source instead.
  useEffect(() => {
    if (!shouldShowCover || !currentUrl || isFullyLoaded) return;

    const timer = setTimeout(() => {
      handleError();
    }, 6000);

    return () => clearTimeout(timer);
  }, [currentUrl, shouldShowCover, isFullyLoaded, handleError]);

  if (shouldShowCover && currentUrl) {
    return (
      <div className="relative w-full h-full bg-gray-200">

        {/* GeneratedCover shown immediately as background while real image loads */}
        {!isFullyLoaded && (
          <div className="absolute inset-0">
            <GeneratedCover title={fallbackText} author={fallbackAuthor} />
          </div>
        )}

        {/* The Actual Image (fades in over GeneratedCover once loaded) */}
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
