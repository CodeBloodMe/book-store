'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GoodreadsScrapeTrigger({ bookId, isbn, needsDescription }: { bookId: string, isbn: string | null, needsDescription: boolean }) {
  const router = useRouter();

  useEffect(() => {
    // If it already has a description or doesn't have an ISBN, do nothing
    if (!needsDescription || !isbn) return;

    // Trigger scrape silently on the PC Server
    const triggerScrape = async () => {
      try {
        const serverBase = (process.env.NEXT_PUBLIC_PC_SERVER_URL || '').replace(/\/$/, '') || 'http://localhost:4000';
        const res = await fetch(`${serverBase}/scrape-goodreads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: bookId, isbn })
        });
        
        if (res.ok) {
          // Once finished, reload the current route to fetch the new description
          router.refresh();
        }
      } catch (err) {
        console.error("Failed to trigger Goodreads scrape:", err);
      }
    };

    triggerScrape();
  }, [bookId, isbn, needsDescription, router]);

  return null;
}
