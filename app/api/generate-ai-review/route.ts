import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// ── Source 1: OpenLibrary API ──
async function fetchOpenLibraryData(query: string): Promise<string> {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'MyBooksSite/1.0 (admin@mybookssite.com)' } });
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

// ── Source 2: Wikipedia API ──
async function fetchWikipediaBookData(title: string, author: string): Promise<string> {
  try {
    // Search for the book page. We include "novel" or "book" to help disambiguate, 
    // but the author's name is usually the best disambiguator.
    const searchQuery = `${title} ${author} book`;
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&utf8=&format=json&origin=*`;
    
    const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': 'ChapterOne/1.0' } });
    if (!searchRes.ok) return '';
    const searchData = await searchRes.json();
    
    // Get the first search result title
    const bestMatch = searchData.query?.search?.[0]?.title;
    if (!bestMatch) return '';

    // Fetch the extract (intro paragraphs) of that specific page
    const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(bestMatch)}&format=json&origin=*`;
    const extractRes = await fetch(extractUrl, { headers: { 'User-Agent': 'ChapterOne/1.0' } });
    if (!extractRes.ok) return '';
    const extractData = await extractRes.json();
    
    const pages = extractData.query?.pages;
    if (!pages) return '';
    
    const pageId = Object.keys(pages)[0];
    const extract = pages[pageId]?.extract;
    
    if (!extract || extract.length < 50) return '';
    
    // Limit to ~2000 characters to save tokens, usually the intro is enough
    return `Wikipedia Summary for "${bestMatch}":\n${extract.substring(0, 2000)}`;
  } catch (err) {
    console.warn('Wikipedia fetch failed:', err);
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
      .select('title, author, ai_review_summary, ai_pros, ai_cons, ai_rating')
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // --- HARD CACHING TO PREVENT API DRAIN ---
    // If the book already has an AI consensus, instantly return it.
    // Public users cannot trigger a re-generation.
    if (book.ai_review_summary && book.ai_review_summary.length > 10) {
      console.log(`[API Drain Protection] Serving cached review for: ${book.title}`);
      return NextResponse.json({
        success: true,
        data: {
          summary: book.ai_review_summary,
          pros: book.ai_pros,
          cons: book.ai_cons,
          rating: book.ai_rating,
        }
      });
    }

    // 2. Scrape Multi-Source Data
    const searchString = `${book.title} ${book.author}`;
    const [openLibraryData, wikipediaData] = await Promise.all([
      fetchOpenLibraryData(searchString),
      fetchWikipediaBookData(book.title, book.author)
    ]);

    // 3. Call Gemini with Omni-Prompt
    const prompt = `
You are an expert book critic. Your goal is to generate a definitive, highly specific "Master Review" for the book "${book.title}" by ${book.author}.

Here is the data scraped from the internet to help you:

--- OPEN LIBRARY METADATA ---
${openLibraryData || 'No metadata found.'}

--- WIKIPEDIA CONTEXT ---
${wikipediaData || 'No Wikipedia context found.'}

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

    // 3. Fallback AI Call logic
    const providers = [
      {
        name: 'Groq',
        fn: async () => {
          if (!process.env.GROQ_API_KEY) throw new Error('No Groq API Key');
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [{ role: 'user', content: prompt }],
              response_format: { type: "json_object" },
              temperature: 0.7,
            }),
          });
          if (!res.ok) throw new Error(`Groq failed: ${res.statusText}`);
          const data = await res.json();
          return data.choices[0].message.content;
        }
      },
      {
        name: 'Gemini',
        fn: async () => {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
          const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              responseMimeType: "application/json",
              temperature: 0.7,
            }
          });
          return response.text;
        }
      }
    ];

    let resultText = '';
    let lastError: any = null;

    for (const provider of providers) {
      try {
        const text = await provider.fn();
        if (text) {
          resultText = text;
          break; // Success!
        }
      } catch (err) {
        console.warn(`[AI Review] ${provider.name} failed:`, err);
        lastError = err;
      }
    }

    if (!resultText) {
      throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }

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
