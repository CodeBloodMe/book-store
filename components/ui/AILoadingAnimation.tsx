'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

const messages = [
  "Consulting the digital librarian...",
  "Analyzing your unique vibe...",
  "Scanning through thousands of pages...",
  "Matching themes, tropes, and moods...",
  "Curating your perfect recommendations...",
  "Almost there..."
];

export default function AILoadingAnimation() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <motion.div
        animate={{ y: [-10, 5, -10] }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="mb-6 drop-shadow-lg"
      >
        <Image 
          src="/logo-loading.png" 
          alt="Loading books..." 
          width={80} 
          height={80} 
          className="object-contain drop-shadow-xl mix-blend-multiply" 
          priority
        />
      </motion.div>

      <div className="h-8 relative flex items-center justify-center w-full max-w-md">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute font-bold text-lg text-[#555] tracking-wide text-center w-full"
          >
            {messages[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
