import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60; // Allow function to run for up to 60 seconds (Vercel Pro/Hobby limits)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Basic security: only run if the cron secret is provided
    // Example: /api/cron/embed?secret=YOUR_SECRET
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    // If you deploy to Vercel, use process.env.CRON_SECRET. For local testing, we'll bypass.
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("[Cron] Starting embedding backfill...");

    // Find up to 20 books that are missing their vector embeddings
    const { data: books, error } = await supabase
      .from('books')
      .select('id, title, author, description, genres(name)')
      .is('embedding', null)
      .limit(20);

    if (error) throw error;

    if (!books || books.length === 0) {
      return NextResponse.json({ message: 'No new books to embed. Everything is up to date!' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    let embeddedCount = 0;

    // Process each missing book
    for (const book of books) {
      const genreName = Array.isArray(book.genres) ? book.genres[0]?.name : (book.genres as any)?.name || "Fiction";
      const contentToEmbed = `Title: ${book.title}\nAuthor: ${book.author}\nGenre: ${genreName}\nDescription: ${book.description || 'A great book.'}`;
      
      try {
        const response = await ai.models.embedContent({
          model: 'gemini-embedding-001',
          contents: contentToEmbed,
        });
        
        // Slice to 768 to fit your database schema
        const vector = response.embeddings?.[0]?.values?.slice(0, 768);
        
        if (!vector) throw new Error("No embedding returned from AI model");

        await supabase
          .from('books')
          .update({ embedding: vector })
          .eq('id', book.id);

        embeddedCount++;
        
        // Small delay to prevent hitting API limits
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`[Cron] Error embedding "${book.title}":`, err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully generated mathematical vectors for ${embeddedCount} new books!`,
      booksProcessed: embeddedCount
    });

  } catch (error: any) {
    console.error("[Cron] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
