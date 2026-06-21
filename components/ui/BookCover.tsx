'use client';

import { useState } from 'react';
import Image from 'next/image';

interface BookCoverProps {
  src: string | null;
  alt: string;
  fallbackGradient: string;
  fallbackText: string;
}

export default function BookCover({ src, alt, fallbackGradient, fallbackText }: BookCoverProps) {
  const [imgError, setImgError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showCover = Boolean(src) && !imgError;

  if (showCover && src) {
    return (
      <div className="relative w-full h-full bg-gray-200">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center animate-pulse bg-gray-200">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}
        <Image
          src={src}
          alt={alt}
          fill
          onError={() => setImgError(true)}
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth <= 1) {
              setImgError(true);
            } else {
              setLoaded(true);
            }
          }}
          className={`object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-end p-4 overflow-hidden bg-gray-100">
      <Image 
        src="/placeholder-book.png" 
        alt="Placeholder cover" 
        fill
        className="object-cover"
        unoptimized
      />
      <div 
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
      />
      <span className="relative z-10 text-white font-bold text-lg leading-tight drop-shadow-lg line-clamp-3">
        {fallbackText}
      </span>
    </div>
  );
}
