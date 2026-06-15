'use client';

import { useState } from 'react';

interface BookCoverProps {
  src: string | null;
  alt: string;
  fallbackGradient: string;
  fallbackText: string;
}

export default function BookCover({ src, alt, fallbackGradient, fallbackText }: BookCoverProps) {
  const [imgError, setImgError] = useState(false);
  const showCover = Boolean(src) && !imgError;

  if (showCover && src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        onError={() => setImgError(true)}
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth <= 1) {
            setImgError(true);
          }
        }}
        className="w-full h-full object-cover"
      />
    );
  }

  return (
    <div className="relative w-full h-full flex items-end p-4 overflow-hidden bg-gray-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img 
        src="/placeholder-book.png" 
        alt="Placeholder cover" 
        className="absolute inset-0 w-full h-full object-cover"
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
