import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// ── Source 1: OpenLibrary API ──
async function fetchOpenLibraryData(query: string): Promise<string> {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ChapterOne/1.0' } });
    if (!res.ok) return '';
    const data = await res.json();
    const book = data.docs?.[0];
    if (!book) return '';
    
    const subjects = book.subject?.slice(0, 10).join(', ') || 'No subjects listed';
    return `Official OpenLibrary Metadata: First published in ${book.first_publish_year}. Subjects/Tags: ${subjects}.`;
  } catch (err) {
    console.warn('OpenLibrary fetch failed:', err);
    return '';
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set in environment variables' }, { status: 500 });
    }

    const { bookId } = await request.json();
    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 });
    }

    // 1. Fetch book details
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('title, author, ai_review_summary')
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // 2. Scrape Multi-Source Data
    const searchString = `${book.title} ${book.author}`;
    const openLibraryData = await fetchOpenLibraryData(searchString);

    // 3. Call Gemini with Omni-Prompt
    const prompt = `
You are an expert book critic. Your goal is to generate a definitive, highly specific "Master Review" for the book "${book.title}" by ${book.author}.

Here is the data scraped from the internet:

--- OPEN LIBRARY METADATA ---
${openLibraryData || 'No metadata found.'}

--- END OF DATA ---

CRITICAL INSTRUCTION: You MUST rely entirely on your internal knowledge of "${book.title}". 
You must provide DEEP, NUANCED, and HIGHLY SPECIFIC insights. 
- Mention specific character names, plot points, or chapters.
- If it's non-fiction, name the specific frameworks, laws, or case studies the author uses.
- NEVER use generic filler phrases like "explains complex concepts brilliantly" or "can be repetitive". Give exact, specific examples of WHAT is brilliant or WHAT is repetitive.

Generate a structured JSON response with exactly these keys:
- summary: A cohesive 3-sentence summary of the general consensus, using specific details from the book.
- pros: An array of 3 strings (the most commonly praised aspects, must include specific details/names from the book).
- cons: An array of 3 strings (the most common complaints or caveats, must be highly specific to the author's actual writing).
- rating: A number between 0.0 and 5.0 representing the true aggregated consensus rating.

OUTPUT ONLY VALID JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error('Empty response from AI');

    const aiData = JSON.parse(resultText);

    // 4. Save back to Supabase
    const { error: updateError } = await supabase
      .from('books')
      .update({
        ai_review_summary: aiData.summary,
        ai_pros: aiData.pros,
        ai_cons: aiData.cons,
        ai_rating: aiData.rating,
        ai_last_updated: new Date().toISOString(),
      })
      .eq('id', bookId);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return NextResponse.json({ error: 'Failed to save AI review to database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: aiData });

  } catch (error: unknown) {
    console.error('AI Review Generation Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
