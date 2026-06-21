'use client'; // Required because we use user interaction (onClick) and state (useState)

import { useState } from 'react';
import { Bookmark, Plus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import FlyingCover from '../ui/FlyingCover';



/**
 * Properties required to render the Save button
 */
interface SaveToBookshelfButtonProps {
  bookId: string;                 // The database ID of the book
  coverUrl?: string;              // The URL of the book cover (used for the flying animation)
  initialStatus: string | null;   // e.g. "want_to_read" or null if not saved
  isAuthenticated: boolean;       // Is the user currently logged in?
}



export default function SaveToBookshelfButton({ bookId, coverUrl, initialStatus, isAuthenticated }: SaveToBookshelfButtonProps) {
  const router = useRouter();

  // Button toggle state (Saved vs Unsaved)
  const [isSaved, setIsSaved] = useState(!!initialStatus);
  
  // `loading` prevents the user from spam-clicking the button while we wait for the database
  const [loading, setLoading] = useState(false);
  
  // `flyingRect` stores the physical coordinates of the book cover on the screen.
  // We need these coordinates so the "flying book" animation knows where to start!
  const [flyingRect, setFlyingRect] = useState<DOMRect | null>(null);


  
  /**
   * Called when the user clicks the "Save" button.
   */
  const handleToggle = async () => {
    // 1. If the user isn't logged in, redirect them to the login page immediately.
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // 2. Lock the button to prevent double-clicks
    setLoading(true);
    
    try {
      if (isSaved) {
        // Remove book from shelf
        const response = await fetch(`/api/shelves?bookId=${bookId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          setIsSaved(false); // Update the button visually
          router.refresh();  // Tell Next.js to refresh the page data behind the scenes
        }
      } else {
        // Add book to shelf
        const response = await fetch('/api/shelves', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // We must turn our JavaScript object into a JSON string before sending it over the internet
          body: JSON.stringify({ bookId: bookId, status: 'want_to_read' }),
        });
        
        if (response.ok) {
          // Trigger the cool "Flying Cover" animation!
          // We find the main book cover element on the screen using its ID...
          const coverElement = document.getElementById('main-book-cover');
          
          // ...if we found it, and we have a cover URL, we get its exact physical coordinates
          if (coverElement && coverUrl) {
            setFlyingRect(coverElement.getBoundingClientRect());
          }
          
          setIsSaved(true);  // Update the button visually
          router.refresh();  // Refresh page data
        }
      }
    } finally {
      // 3. Whether it succeeded or failed, unlock the button.
      // The `finally` block ALWAYS runs.
      setLoading(false);
    }
  };


  
  // We define our button styles here to keep the HTML clean.
  // We use neo-brutalism design styles: harsh borders and flat shadows.
  const baseButtonClasses = "flex items-center gap-2 px-6 py-3 font-bold border-2 transition-colors";
  
  let dynamicButtonClasses = "";
  if (isSaved) {
    // Yellow button when saved
    dynamicButtonClasses = "bg-[#f5e642] border-[#0a0a0a] text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a]";
  } else {
    // White button when not saved
    dynamicButtonClasses = "bg-white border-[#0a0a0a] text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a]";
  }

  return (
    <>
      <div className="relative ml-auto sm:ml-0">
        {/* 
          We use <motion.button> from Framer Motion instead of a standard <button>.
          This gives us built-in physics animations!
          - whileHover: Lift the button up slightly when hovered
          - whileTap: Squish the button down when clicked
        */}
        <motion.button 
          whileHover={{ scale: 1.05, y: -4 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleToggle}
          disabled={loading}
          className={`${baseButtonClasses} ${dynamicButtonClasses}`}
          style={{ borderRadius: '12px' }}
        >
          {/* Conditional Icon Rendering */}
          {loading ? (
            <Loader2 size={18} className="animate-spin" /> // Spinning loading wheel
          ) : isSaved ? (
            <Bookmark size={18} /> // Filled bookmark icon
          ) : (
            <Plus size={18} /> // Plus icon
          )}
          
          {/* Button Text */}
          {isSaved ? 'Saved' : 'Save Book'}
        </motion.button>
      </div>
      
      {/* 
        AnimatePresence is required by Framer Motion when elements are added or removed from the screen.
        It allows the FlyingCover to play its "exit" animation before completely disappearing.
      */}
      <AnimatePresence>
        {/* If we have coordinates, draw the flying cover on the screen */}
        {flyingRect && coverUrl && (
          <FlyingCover
            key={`flying-${bookId}`}
            coverUrl={coverUrl}
            startRect={flyingRect}
            // Once the flying animation finishes, we clear the coordinates so it disappears
            onAnimationComplete={() => setFlyingRect(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
