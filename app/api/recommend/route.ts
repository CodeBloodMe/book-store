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
 * If the AI recommends a book we don't have, we ask the free Apple Books API
 * for the cover image and summary description.
 */
async function fetchFromAppleBooks(title: string, author: string): Promise<OLResult> {
  const params = new URLSearchParams({ term: `${title} ${author}`, entity: 'ebook', limit: '1' });
  try {
    const res = await fetch(`https://itunes.apple.com/search?${params}`, {
      signal: AbortSignal.timeout(5000), // Give up if it takes longer than 5 seconds
    });

    if (!res.ok) {
      return { description: `A book by ${author}.`, cover_url: null, page_count: null, published_year: null, isbn: null };
    }

    const data = await res.json();
    const results = data.results || [];
    
    if (results.length === 0) {
      return { description: `A book by ${author}.`, cover_url: null, page_count: null, published_year: null, isbn: null };
    }

    const doc = results[0];
    
    // Apple provides artworkUrl100, we can replace 100x100 with 600x600 for high quality
    const cover_url = doc.artworkUrl100 ? doc.artworkUrl100.replace('100x100bb', '600x600bb') : null;

    // Strip HTML tags from description if present
    let description = doc.description || `A book by ${author}.`;
    description = description.replace(/<[^>]*>?/gm, '');

    return {
      description: description,
      cover_url,
      page_count: doc.trackCount ?? null,
      published_year: doc.releaseDate ? parseInt(doc.releaseDate.substring(0, 4)) : null,
      isbn: null, // Apple doesn't cleanly expose ISBN in search
    };
  } catch (error) {
    console.warn(`[AppleBooks] Timeout or error fetching "${title}":`, error);
    return { description: `A book by ${author}.`, cover_url: null, page_count: null, published_year: null, isbn: null };
  }
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

    // ── Step 1: Fetch genre list + curated book titles for AI grounding ──
    const { data: genres } = await supabase.from('genres').select('id, name, slug');
    const genreList = (genres || []).map((g) => `${g.name} (slug: ${g.slug})`).join(', ');
    const genreMap = new Map((genres || []).map((g) => [g.slug, g.id]));
    const fallbackGenreId = genres?.[0]?.id ?? null;

    // Fetch a representative sample of our curated books so the AI prefers recommending them
    const { data: curatedTitles } = await supabase
      .from('books')
      .select('title, author')
      .order('expert_rating', { ascending: false })
      .limit(80);
    const curatedList = (curatedTitles || [])
      .map((b: { title: string; author: string }) => `"${b.title}" by ${b.author}`)
      .join(', ');

    // ── Step 2: Ask AI to recommend SPECIFIC real books ──────
    const aiPrompt = `You are a world-class book recommendation expert with encyclopedic knowledge of literature.

The user wants: "${userIntent}"

Available genres: ${genreList}

Our curated library includes books like: ${curatedList}

Your job: Recommend exactly 6 real books that PERFECTLY match the mood, tone, and vibes the user wants.
STRONGLY PREFER books from our curated library list above when they are a good match — the user can navigate directly to those.
Only suggest books outside the curated list if no curated books fit the request.

Return ONLY a JSON array (no markdown, no explanation, just raw JSON):
[
  {
    "title": "exact book title",
    "author": "exact author name",
    "expert_rating": 4.8,
    "community_rating": 4.5,
    "expert_quote": "Short quote from a major publication.",
    "expert_name": "The New York Times",
    "expert_consensus": "1-2 sentences on what critics praised.",
    "community_consensus": "1-2 sentences on reader reactions.",
    "why": "1 sentence addressed directly to YOU (the reader) explaining why this matches their request. Never say 'the user'.",
    "genre_guess": "closest genre slug from the available list"
  }
]

Rules:
- ONLY recommend REAL books that actually exist.
- The "why" must use "you" and be specific to their request. Never say "the user".
- genre_guess must be a valid slug from the genres list.
- HIGHLY IMPORTANT: Vary your sentence structures and writing style for the 'expert_consensus' and 'community_consensus' fields. Do not use repetitive phrasing like "Readers found the book to be..." or "Critics praised..." for every book. Make them sound organically written by a human.
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

    const resultBooks: any[] = [];
    const seenTitles = new Set<string>();
    const seenBookIds = new Set<string>();

    // Loop through the AI's recommendations
    for (const aiBook of aiBooks.slice(0, 8)) {
      try {
        const lowerTitle = aiBook.title.toLowerCase().trim();
        if (seenTitles.has(lowerTitle)) {
          console.log(`[Recommend API] ⚠️ Skipping duplicate AI title: "${aiBook.title}"`);
          continue;
        }
        seenTitles.add(lowerTitle);

        // A) Check if we already have it in the DB — try two passes
        // Pass 1: Exact title + author match
        let { data: existing } = await supabase
          .from('books')
          .select(selectFields)
          .ilike('title', aiBook.title)
          .ilike('author', `%${aiBook.author.split(' ').pop()}%`)
          .limit(1);

        // Pass 2: Looser title search (handles slight title variations)
        if (!existing || existing.length === 0) {
          const titleWords = aiBook.title.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 3).join(' ');
          if (titleWords) {
            const { data: fuzzyMatch } = await supabase
              .from('books')
              .select(selectFields)
              .ilike('title', `%${titleWords}%`)
              .limit(1);
            existing = fuzzyMatch;
          }
        }

        if (existing && existing.length > 0) {
          console.log(`[Recommend API] ✅ Found in DB: "${aiBook.title}"`);
          const existingBook = existing[0];
          
          if (seenBookIds.has(existingBook.id)) {
            console.log(`[Recommend API] ⚠️ Skipping duplicate book ID: ${existingBook.id}`);
            continue;
          }
          seenBookIds.add(existingBook.id);

          // Fix: If the book in our DB is missing a cover, fetch it from OpenLibrary on the fly!
          if (!existingBook.cover_image_url) {
            console.log(`[Recommend API] 🔧 Fixing missing cover for "${aiBook.title}"`);
            const olData = await fetchFromAppleBooks(aiBook.title, aiBook.author);
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
        console.log(`[Recommend API] 🔍 Fetching from AppleBooks: "${aiBook.title}" by ${aiBook.author}`);
        const olData = await fetchFromAppleBooks(aiBook.title, aiBook.author);

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

        if (seenBookIds.has(inserted.id)) {
          continue;
        }
        seenBookIds.add(inserted.id);
        
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
