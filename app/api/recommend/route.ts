import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';

// ── Types ────────────────────────────────────────────────────

interface RecommendRequest {
  query?: string;
  goal?: string;
  area?: string;
  style?: string;
}

interface AIBook {
  title: string;
  author: string;
  why: string;
  genre_guess: string; // AI's guess of the closest genre slug
  expert_rating: number;
  community_rating: number;
  expert_quote: string;
  expert_name: string;
  expert_consensus: string;
  community_consensus: string;
}

// ── AI Providers ─────────────────────────────────────────────

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
      temperature: 0.3,
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

async function callAnyAI(prompt: string): Promise<string> {
  const providers = [
    { name: 'Groq', fn: callGroq },
    { name: 'Gemini', fn: callGemini },
    { name: 'OpenAI', fn: callOpenAI },
  ];
  let lastError: Error | null = null;
  for (const provider of providers) {
    try {
      console.log(`[Recommend] Trying ${provider.name}...`);
      const result = await provider.fn(prompt);
      if (result) {
        console.log(`[Recommend] ✅ Success with ${provider.name}`);
        return result;
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Recommend] ❌ ${provider.name} failed:`, lastError.message);
    }
  }
  throw new Error(`All AI providers failed. Last: ${lastError?.message}`);
}

// ── OpenLibrary Helper ───────────────────────────────────────

interface OLResult {
  description: string;
  cover_url: string | null;
  page_count: number | null;
  published_year: number | null;
  isbn: string | null;
}

async function fetchFromOpenLibrary(title: string, author: string): Promise<OLResult> {
  const params = new URLSearchParams({ title, author, limit: '5' });
  const res = await fetch(`https://openlibrary.org/search.json?${params}`, {
    signal: AbortSignal.timeout(5000),
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
  
  let cover_url = null;
  if (coverId) {
    cover_url = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
  } else if (isbn) {
    const cleanIsbn = isbn.replace(/[-\s]/g, '');
    cover_url = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
  }

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

// ── Main Handler ─────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body: RecommendRequest = await request.json();
    const { query, goal, area, style } = body;

    if (!query && !goal) {
      return NextResponse.json({ error: 'Please provide a query.' }, { status: 400 });
    }

    const userIntent = query
      ? query.trim()
      : `I want to: ${goal}. About: ${area}. My level: ${style}.`;

    // ── Step 1: Fetch genre list for AI context ──────────────
    const { data: genres } = await supabase.from('genres').select('id, name, slug');
    const genreList = (genres || []).map((g) => `${g.name} (slug: ${g.slug})`).join(', ');
    const genreMap = new Map((genres || []).map((g) => [g.slug, g.id]));

    // Pick a fallback genre (the first one, or "Global Catalog")
    const fallbackGenreId = genres?.[0]?.id ?? null;

    // ── Step 2: Ask AI to recommend SPECIFIC real books ──────
    const aiPrompt = `You are a world-class book recommendation expert and review aggregator with encyclopedic knowledge of every book ever written.

The user wants: "${userIntent}"

Available genres in the database: ${genreList}

Your job: Recommend exactly 6 real, specific books that PERFECTLY match what the user wants. For each book, synthesize critical and community reception.

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
    "why": "1 sentence explaining directly to the reader why this book is perfect for them. Address them directly (e.g. 'This is perfect for you because...'). NEVER use the phrase 'the user' or 'the user's request'.",
    "genre_guess": "closest genre slug from the available list"
  }
]

Critical rules:
- ONLY recommend REAL books that actually exist. No made-up titles.
- Be SPECIFIC to what the user asked. If they say "indian books", recommend famous Indian literature like The White Tiger, Midnight's Children, The God of Small Things, etc.
- If they say "python programming", recommend actual Python books like Automate the Boring Stuff, Python Crash Course, etc.
- The "why" must address the reader directly (using "you"). Do not talk about "the user".
- genre_guess must be a slug from the available genres list.
- Return EXACTLY 6 books.`;

    const rawText = await callAnyAI(aiPrompt);

    // Parse the JSON array from AI response
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI returned invalid response');

    const aiBooks: AIBook[] = JSON.parse(jsonMatch[0]);
    console.log(`[Recommend] AI suggested ${aiBooks.length} books`);

    // ── Step 3: For each AI book, find or create in DB ───────
    const selectFields =
      'id, title, author, cover_image_url, expert_rating, community_rating, description, difficulty_level, is_bestseller, genre_id, genres(name, color, icon, slug)';

    const resultBooks = [];

    for (const aiBook of aiBooks.slice(0, 8)) {
      try {
        // A) Check if it already exists in DB (case-insensitive title + author match)
        const { data: existing } = await supabase
          .from('books')
          .select(selectFields)
          .ilike('title', aiBook.title)
          .ilike('author', `%${aiBook.author.split(' ').pop()}%`) // match on last name
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`[Recommend] ✅ Found in DB: "${aiBook.title}"`);
          const existingBook = existing[0];
          
          // If the book in our DB is missing a cover, let's fix it on the fly!
          if (!existingBook.cover_image_url) {
            console.log(`[Recommend] 🔧 Fixing missing cover for "${aiBook.title}"`);
            const olData = await fetchFromOpenLibrary(aiBook.title, aiBook.author);
            if (olData.cover_url) {
              await supabase
                .from('books')
                .update({ cover_image_url: olData.cover_url })
                .eq('id', existingBook.id);
              existingBook.cover_image_url = olData.cover_url;
            }
          }
          
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
          continue;
        }

        // B) Not in DB — fetch from OpenLibrary and insert
        console.log(`[Recommend] 🔍 Fetching from OpenLibrary: "${aiBook.title}" by ${aiBook.author}`);
        const olData = await fetchFromOpenLibrary(aiBook.title, aiBook.author);

        // Determine genre_id: use AI's guess, fallback to first genre
        const genreId = genreMap.get(aiBook.genre_guess) ?? fallbackGenreId;

        if (!genreId) {
          console.warn(`[Recommend] ⚠️ No genre found for "${aiBook.title}", skipping`);
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
          .select(selectFields)
          .single();

        if (insertError) {
          console.error(`[Recommend] ❌ Insert failed for "${aiBook.title}":`, insertError.message);
          continue;
        }

        console.log(`[Recommend] ✅ Inserted into DB: "${aiBook.title}"`);
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
        console.warn(`[Recommend] ⚠️ Error processing "${aiBook.title}":`, bookErr);
        continue; // Skip this book, try the next one
      }
    }

    // ── Step 4: Return results ───────────────────────────────
    if (resultBooks.length === 0) {
      return NextResponse.json({
        books: [],
        message: `We couldn't find or fetch books for "${userIntent}". Try a different query.`,
      });
    }

    // Add rank labels
    const booksWithRank = resultBooks.map((book, i) => ({
      ...book,
      why: i === 0 ? `⭐ Top pick: ${book.why}` : book.why,
    }));

    return NextResponse.json({ books: booksWithRank });
  } catch (err: unknown) {
    console.error('[Recommend API Error]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Something went wrong.' },
      { status: 500 }
    );
  }
}
