import React from 'react';

function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

const GRADIENTS = [
  'linear-gradient(135deg, #FF6B6B 0%, #556270 100%)', // Red/Gray
  'linear-gradient(135deg, #1A2980 0%, #26D0CE 100%)', // Deep Blue/Teal
  'linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)', // Vibrant Red/Orange
  'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)', // Night Sky
  'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)', // Bright Green
  'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)', // Deep Purple
  'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', // Mint
  'linear-gradient(135deg, #FC466B 0%, #3F5EFB 100%)', // Pink/Blue
  'linear-gradient(135deg, #c31432 0%, #240b36 100%)', // Dark Red/Purple
  'linear-gradient(135deg, #F09819 0%, #EDDE5D 100%)', // Warm Sun
];

interface GeneratedCoverProps {
  title: string;
  author?: string;
}

export default function GeneratedCover({ title, author }: GeneratedCoverProps) {
  const hash = hashString(title + (author || ''));
  const gradient = GRADIENTS[hash % GRADIENTS.length];
  
  // Decide geometric shapes based on hash
  const circleSize = 100 + (hash % 100);
  const showCircle = hash % 2 === 0;
  const showSquare = hash % 3 === 0;
  const showLines = hash % 5 === 0;
  
  return (
    <div 
      className="absolute inset-0 w-full h-full overflow-hidden flex flex-col p-4 sm:p-6 select-none"
      style={{ background: gradient }}
    >
       {/* Abstract Background Shapes */}
       {showCircle && (
         <div 
           className="absolute rounded-full mix-blend-overlay opacity-30"
           style={{ 
             width: circleSize, 
             height: circleSize, 
             top: `-${(hash % 20)}%`, 
             left: `-${(hash % 20)}%`, 
             background: 'white' 
           }}
         />
       )}
       {showSquare && (
         <div 
           className="absolute mix-blend-overlay opacity-20"
           style={{ 
             width: circleSize * 1.5, 
             height: circleSize * 1.5,
             bottom: `-${(hash % 15)}%`, 
             right: `-${(hash % 15)}%`, 
             background: 'white',
             transform: `rotate(${hash % 90}deg)`
           }}
         />
       )}
       {showLines && (
         <div 
           className="absolute inset-0 mix-blend-overlay opacity-20"
           style={{
             background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, white 10px, white 12px)'
           }}
         />
       )}
       
       <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
       
       {/* Typography Layer */}
       <div className="relative z-10 flex flex-col h-full text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
         <h3 
           className="font-bold leading-snug break-words"
           style={{ 
             fontSize: 'clamp(18px, 5cqw, 28px)',
             fontFamily: 'var(--font-serif)'
           }}
         >
           {title}
         </h3>
         
         {author && (
           <p className="mt-auto font-medium text-xs sm:text-sm tracking-widest uppercase opacity-90">
             {author}
           </p>
         )}
       </div>
    </div>
  );
}
