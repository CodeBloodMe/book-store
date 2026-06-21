'use client';

import { useState, useEffect } from 'react';
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
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 90, 180, 270, 360],
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="w-16 h-16 mb-8 border-4 border-[#0a0a0a] rounded-xl flex items-center justify-center bg-white"
        style={{ boxShadow: '6px 6px 0 #0a0a0a' }}
      >
        <span className="text-2xl block">✨</span>
      </motion.div>
      
      <div className="h-8 relative flex items-center justify-center w-full">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ y: 20, opacity: 0, filter: 'blur(4px)' }}
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ y: -20, opacity: 0, filter: 'blur(4px)' }}
            transition={{ duration: 0.4 }}
            className="absolute font-black text-xl text-[#0a0a0a] tracking-tight"
          >
            {messages[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
