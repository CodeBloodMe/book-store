'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

interface FloatingBook {
  id: string;
  title: string;
  cover_image_url: string | null;
}

export default function FloatingCovers({ books }: { books: FloatingBook[] }) {
  // We need at least some books with covers to make this look good.
  const validBooks = books.filter(b => b.cover_image_url).slice(0, 6);
  if (validBooks.length === 0) return null;

  // Split into left and right sides
  const leftBooks = validBooks.slice(0, Math.ceil(validBooks.length / 2));
  const rightBooks = validBooks.slice(Math.ceil(validBooks.length / 2));

  // A helper function to generate random animation values
  const getAnimation = (index: number) => ({
    y: [0, -15 - (index % 3) * 5, 0],
    rotate: [index % 2 === 0 ? -4 : 4, index % 2 === 0 ? -2 : 6, index % 2 === 0 ? -4 : 4],
    transition: {
      duration: 5 + (index % 3) * 2,
      repeat: Infinity,
      ease: "easeInOut",
      delay: index * 0.5,
    }
  });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden hidden lg:block z-0">
      <div className="relative w-full h-full max-w-[1400px] mx-auto">
        
        {/* Left Side */}
        {leftBooks.map((book, i) => (
          <motion.div
            key={book.id}
            animate={getAnimation(i)}
            className="absolute pointer-events-auto hidden xl:block"
            style={{
              top: `${120 + i * 220}px`,
              left: `calc(50% - 700px - ${i % 2 === 0 ? 0 : 60}px)`,
            }}
          >
            <Link href={`/books/${book.id}`} title={book.title}>
              <div className="w-24 h-36 md:w-32 md:h-48 rounded-lg overflow-hidden border-[3px] border-[#0a0a0a] shadow-[6px_6px_0_#0a0a0a] bg-white transition-transform hover:scale-110 hover:z-10 relative">
                <Image
                  src={book.cover_image_url!}
                  alt={book.title}
                  fill
                  className="object-cover"
                  sizes="128px"
                  unoptimized={true}
                />
              </div>
            </Link>
          </motion.div>
        ))}

        {/* Right Side */}
        {rightBooks.map((book, i) => (
          <motion.div
            key={book.id}
            animate={getAnimation(i + 3)}
            className="absolute pointer-events-auto hidden xl:block"
            style={{
              top: `${160 + i * 220}px`,
              right: `calc(50% - 700px - ${i % 2 === 0 ? 60 : 0}px)`,
            }}
          >
            <Link href={`/books/${book.id}`} title={book.title}>
              <div className="w-24 h-36 md:w-32 md:h-48 rounded-lg overflow-hidden border-[3px] border-[#0a0a0a] shadow-[6px_6px_0_#0a0a0a] bg-white transition-transform hover:scale-110 hover:z-10 relative">
                <Image
                  src={book.cover_image_url!}
                  alt={book.title}
                  fill
                  className="object-cover"
                  sizes="128px"
                  unoptimized={true}
                />
              </div>
            </Link>
          </motion.div>
        ))}
        
      </div>
    </div>
  );
}
