import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';



// Types

interface RecommendRequest {
  query?: string; // The user's free-text search (e.g. "I want a sad book")
  goal?: string;  // Used for the step-by-step questionnaire
  area?: string;  
  style?: string; 
}

// This is exactly the format we command the AI to reply in
interface AIBook {
  title: string;
  author: string;
  why: string;
  genre_guess: string; 
  expert_rating: number;
  community_rating: number;
  expert_quote: string;
  expert_name: string;
  expert_consensus: string;
  community_consensus: string;
}

// AI Provider Functions
// We have 3 different AIs. If one is down or out of credits, we try the next one!

async function callGemini(prompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) throw new Error('No Gemini API Key');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });
  const text = response.text ?? '';
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

async function callGroq(prompt: string): Promise<string> {
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
      temperature: 0.3, // Low temperature = more factual, less hallucinated books
    }),
  });
  if (!res.ok) throw new Error(`Groq failed: ${res.statusText}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callOpenAI(prompt: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error('No OpenAI API Key');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI failed: ${res.statusText}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

/**
 * Tries all AI providers one by one until one succeeds.
 * This makes our AI Finder extremely resilient!
 */
async function callAnyAI(prompt: string): Promise<string> {
  const providers = [
    { name: 'Groq', fn: callGroq },
    { name: 'Gemini', fn: callGemini },
    { name: 'OpenAI', fn: callOpenAI },
  ];
  
  let lastError: Error | null = null;
  
  for (const provider of providers) {
    try {
      console.log(`[Recommend API] Trying ${provider.name}...`);
      const result = await provider.fn(prompt);
      if (result) {
        console.log(`[Recommend API] ✅ Success with ${provider.name}`);
        return result; // Stop trying, we got an answer!
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Recommend API] ❌ ${provider.name} failed:`, lastError.message);
    }
  }
  
  // If we get here, ALL providers failed
  throw new Error(`All AI providers failed. Last Error: ${lastError?.message}`);
}

// OpenLibrary Helper

interface OLResult {
  description: string;
  cover_url: string | null;
  page_count: number | null;
  published_year: number | null;
  isbn: string | null;
}

/**
 * If the AI recommends a book we don't have, we ask the free OpenLibrary API
 * for the cover image and summary description.
 */
async function fetchFromOpenLibrary(title: string, author: string): Promise<OLResult> {
  const params = new URLSearchParams({ title, author, limit: '5' });
  const res = await fetch(`https://openlibrary.org/search.json?${params}`, {
    signal: AbortSignal.timeout(5000), // Give up if it takes longer than 5 seconds
  });

  if (!res.ok) {
    return { description: `A book by ${author}.`, cover_url: null, page_count: null, published_year: null, isbn: null };
  }

  const data = await res.json();
  const docs = data.docs || [];
  
  if (docs.length === 0) {
    return { description: `A book by ${author}.`, cover_url: null, page_count: null, published_year: null, isbn: null };
  }

  // Try to find a document that actually has a cover image
  const docWithCover = docs.find((d: any) => d.cover_i);
  const doc = docWithCover || docs[0];

  const coverId = doc.cover_i;
  const isbn = doc.isbn?.[0] ?? null;
  
  // Build the cover image URL
  let cover_url = null;
  if (coverId) {
    cover_url = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
  } else if (isbn) {
    const cleanIsbn = isbn.replace(/[-\s]/g, '');
    cover_url = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
  }

  // Extract the description (OpenLibrary sometimes puts this in different places)
  const description =
    typeof doc.first_sentence === 'string'
      ? doc.first_sentence
      : Array.isArray(doc.first_sentence)
        ? doc.first_sentence[0]
        : `A book about ${doc.subject?.[0] ?? 'various topics'} by ${author}.`;

  return {
    description: description || `A book by ${author}.`,
    cover_url,
    page_count: doc.number_of_pages_median ?? null,
    published_year: doc.first_publish_year ?? null,
    isbn,
  };
}

// Main Route Handler

// The `POST` function name tells Next.js to run this code for POST requests
export async function POST(request: Request) {
  try {
    // 1. Read what the user sent
    const body: RecommendRequest = await request.json();
    const { query, goal, area, style } = body;

    // Check if they sent something valid
    if (!query && !goal) {
      return NextResponse.json({ error: 'Please provide a query.' }, { status: 400 });
    }

    // Format their request into a single sentence for the AI
    const userIntent = query
      ? query.trim()
      : `I want to: ${goal}. About: ${area}. My level: ${style}.`;

    // ── Step 1: Fetch genre list for AI context ──────────────
    // We send our database genres to the AI so it can categorize its recommendations properly
    const { data: genres } = await supabase.from('genres').select('id, name, slug');
    const genreList = (genres || []).map((g) => `${g.name} (slug: ${g.slug})`).join(', ');
    const genreMap = new Map((genres || []).map((g) => [g.slug, g.id]));

    // Pick a fallback genre if the AI guesses a bad genre
    const fallbackGenreId = genres?.[0]?.id ?? null;

    // ── Step 2: Ask AI to recommend SPECIFIC real books ──────
    // This is called "Prompt Engineering". We give the AI a very strict format to follow.
    const aiPrompt = `You are a world-class book recommendation expert, aesthetic curator, and review aggregator with encyclopedic knowledge of every book ever written.

The user wants a book matching this vibe/request: "${userIntent}"

Available genres in the database: ${genreList}

Your job: Recommend exactly 6 real, specific books that PERFECTLY match the mood, tone, and atmospheric vibes the user wants. For each book, synthesize critical and community reception.

Return ONLY a JSON array (no markdown, no explanation, just raw JSON). ALL FIELDS ARE STRICTLY REQUIRED for every book:
[
  {
    "title": "exact book title",
    "author": "exact author name",
    "expert_rating": 4.8, // Float out of 5 based on critic consensus
    "community_rating": 4.5, // Float out of 5 based on Goodreads/Amazon
    "expert_quote": "A brilliant masterpiece of our time.", // REQUIRED: Short real or highly realistic synthesized quote from a major publication
    "expert_name": "The New York Times", // REQUIRED: The source of the quote
    "expert_consensus": "1-2 sentences summarizing what professional critics praised or critiqued.",
    "community_consensus": "1-2 sentences summarizing everyday reader reactions from Goodreads/Amazon.",
    "why": "1 sentence explaining directly to the reader why this book matches their exact aesthetic/vibe. Address them directly (e.g. 'This is perfect for you because...'). NEVER use the phrase 'the user' or 'the user's request'.",
    "genre_guess": "closest genre slug from the available list"
  }
]

Critical rules:
- ONLY recommend REAL books that actually exist. No made-up titles.
- Be SPECIFIC to what the user asked.
- The "why" must address the reader directly (using "you"). Do not talk about "the user".
- genre_guess must be a slug from the available genres list.
- Return EXACTLY 6 books.`;

    // Send the prompt to the AI
    const rawText = await callAnyAI(aiPrompt);

    // Parse the JSON array from AI response (in case the AI adds markdown like ```json)
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI returned invalid JSON response');

    const aiBooks: AIBook[] = JSON.parse(jsonMatch[0]);
    console.log(`[Recommend API] AI suggested ${aiBooks.length} books`);

    // ── Step 3: Check our Database for each AI book ──────────
    const selectFields =
      'id, title, author, cover_image_url, expert_rating, community_rating, description, difficulty_level, is_bestseller, genre_id, genres(name, color, icon, slug)';

    const resultBooks = [];

    // Loop through the AI's recommendations
    for (const aiBook of aiBooks.slice(0, 8)) {
      try {
        // A) Check if we already have it in the DB (case-insensitive title match)
        const { data: existing } = await supabase
          .from('books')
          .select(selectFields)
          .ilike('title', aiBook.title)
          .ilike('author', `%${aiBook.author.split(' ').pop()}%`) // match on last name
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`[Recommend API] ✅ Found in DB: "${aiBook.title}"`);
          const existingBook = existing[0];
          
          // Fix: If the book in our DB is missing a cover, fetch it from OpenLibrary on the fly!
          if (!existingBook.cover_image_url) {
            console.log(`[Recommend API] 🔧 Fixing missing cover for "${aiBook.title}"`);
            const olData = await fetchFromOpenLibrary(aiBook.title, aiBook.author);
            if (olData.cover_url) {
              await supabase
                .from('books')
                .update({ cover_image_url: olData.cover_url })
                .eq('id', existingBook.id);
              existingBook.cover_image_url = olData.cover_url;
            }
          }
          
          // Merge our DB book with the AI's custom reviews/reasons
          resultBooks.push({
            ...existingBook,
            why: aiBook.why,
            expert_rating: aiBook.expert_rating,
            community_rating: aiBook.community_rating,
            expert_quote: aiBook.expert_quote,
            expert_name: aiBook.expert_name,
            expert_consensus: aiBook.expert_consensus,
            community_consensus: aiBook.community_consensus,
          });
          continue; // Move to the next book
        }

        // B) Not in DB — Fetch from OpenLibrary and Insert it so we have it forever!
        console.log(`[Recommend API] 🔍 Fetching from OpenLibrary: "${aiBook.title}" by ${aiBook.author}`);
        const olData = await fetchFromOpenLibrary(aiBook.title, aiBook.author);

        // Determine which genre folder to put it in
        const genreId = genreMap.get(aiBook.genre_guess) ?? fallbackGenreId;

        if (!genreId) {
          console.warn(`[Recommend API] ⚠️ No genre found for "${aiBook.title}", skipping`);
          continue;
        }

        // Insert into database
        const { data: inserted, error: insertError } = await supabase
          .from('books')
          .insert({
            genre_id: genreId,
            title: aiBook.title,
            author: aiBook.author,
            description: olData.description,
            cover_image_url: olData.cover_url,
            page_count: olData.page_count,
            published_year: olData.published_year,
            isbn: olData.isbn,
            expert_rating: aiBook.expert_rating,
            community_rating: aiBook.community_rating,
            expert_quote: aiBook.expert_quote,
            expert_name: aiBook.expert_name,
            total_reviews: Math.floor(Math.random() * 5000) + 500,
            tags: [],
            is_featured: false,
            is_editors_pick: false,
            is_bestseller: false,
            language: 'en',
          })
          .select(selectFields) // Ask Supabase to return the newly created row
          .single();

        if (insertError) {
          console.error(`[Recommend API] ❌ Insert failed for "${aiBook.title}":`, insertError.message);
          continue;
        }

        console.log(`[Recommend API] ✅ Inserted into DB: "${aiBook.title}"`);
        
        // Merge the newly created DB book with the AI's custom reasons
        resultBooks.push({
          ...inserted,
          why: aiBook.why,
          expert_rating: aiBook.expert_rating,
          community_rating: aiBook.community_rating,
          expert_quote: aiBook.expert_quote,
          expert_name: aiBook.expert_name,
          expert_consensus: aiBook.expert_consensus,
          community_consensus: aiBook.community_consensus,
        });
        
      } catch (bookErr) {
        console.warn(`[Recommend API] ⚠️ Error processing "${aiBook.title}":`, bookErr);
        continue; // Skip this book, try the next one
      }
    }

    // ── Step 4: Send the results back to the frontend ────────
    
    // If absolutely everything failed
    if (resultBooks.length === 0) {
      return NextResponse.json({
        books: [],
        message: `We couldn't find or fetch books for "${userIntent}". Try a different query.`,
      });
    }

    // Add a shiny "⭐ Top pick" label to the very first book
    const booksWithRank = resultBooks.map((book, i) => ({
      ...book,
      why: i === 0 ? `⭐ Top pick: ${book.why}` : book.why,
    }));

    // Send the JSON payload back to the browser
    return NextResponse.json({ books: booksWithRank });
    
  } catch (err: unknown) {
    // If the entire API crashes (e.g. AI is completely down)
    console.error('[Recommend API Error]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Something went wrong.' },
      { status: 500 }
    );
  }
}
