'use client';

import { motion } from 'framer-motion';

interface FlyingCoverProps {
  coverUrl: string;
  startRect: DOMRect;
  onAnimationComplete: () => void;
}

export default function FlyingCover({ coverUrl, startRect, onAnimationComplete }: FlyingCoverProps) {
  // Destination: roughly top-right corner where the Profile/Bookshelf icon lives
  const endX = typeof window !== 'undefined' ? window.innerWidth - 60 : 0;
  const endY = 24;

  return (
    <motion.img
      src={coverUrl}
      alt="Flying cover"
      className="fixed z-[9999] object-cover rounded-xl shadow-2xl pointer-events-none border-2 border-gray-900"
      initial={{
        top: startRect.top,
        left: startRect.left,
        width: startRect.width,
        height: startRect.height,
        opacity: 1,
        rotate: 0,
        scale: 1,
      }}
      animate={{
        top: endY,
        left: endX,
        width: 30, // shrink to a specific icon size instead of a percentage
        height: 45,
        opacity: [1, 1, 0], // Stay fully solid until the very end
        rotate: [0, -10, 15], // Add a little wiggle/flip effect
      }}
      transition={{
        duration: 0.8,
        times: [0, 0.8, 1], // The opacity drop and final rotation only happen in the last 20% of the animation
        ease: "easeInOut", // Smooth acceleration and deceleration
      }}
      onAnimationComplete={onAnimationComplete}
    />
  );
}
