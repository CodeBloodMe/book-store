'use client';

import { useEffect, useState } from 'react';

export default function DynamicBackground({ coverUrl }: { coverUrl: string | null }) {
  const [color, setColor] = useState<string>('rgba(0,0,0,0)');

  useEffect(() => {
    if (!coverUrl) return;

    import('fast-average-color').then(({ FastAverageColor }) => {
      const fac = new FastAverageColor();
      fac.getColorAsync(coverUrl, { algorithm: 'dominant', crossOrigin: 'anonymous' })
        .then(result => {
          // We use a low opacity version of the dominant color for the glow
          const glowColor = result.rgba.replace(/[\d.]+\)$/g, '0.15)');
          setColor(glowColor);
        })
        .catch(e => {
          console.warn('FastAverageColor extraction failed:', e);
        });
    });
  }, [coverUrl]);

  return (
    <div 
      className="absolute top-0 left-0 right-0 h-[800px] pointer-events-none transition-all duration-1000 ease-in-out"
      style={{
        background: `radial-gradient(circle at 50% 0%, ${color} 0%, transparent 90%)`,
        opacity: color === 'transparent' ? 0 : 0.6,
        zIndex: 0
      }}
    />
  );
}
