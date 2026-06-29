import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';

// ── Types ────────────────────────────────────────────────────

interface RecommendPathRequest {
  query: string;
}

interface AIPathBook {
  level: string; // 'Beginner', 'Intermediate', 'Advanced'
  title: string;
  author: string;
  why: string;
  genre_guess: string;
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
      console.log(`[Recommend Path] Trying ${provider.name}...`);
      const result = await provider.fn(prompt);
      if (result) {
        console.log(`[Recommend Path] ✅ Success with ${provider.name}`);
        return result;
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Recommend Path] ❌ ${provider.name} failed:`, lastError.message);
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
    headers: { 'User-Agent': 'MyBooksSite/1.0 (admin@mybookssite.com)' }
  });

  if (!res.ok) {
    return { description: `A book by ${author}.`, cover_url: null, page_count: null, published_year: null, isbn: null };
  }

  const data = await res.json();
  const docs = data.docs || [];
  
  if (docs.length === 0) {
    return { description: `A book by ${author}.`, cover_url: null, page_count: null, published_year: null, isbn: null };
  }

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
    const body: RecommendPathRequest = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json({ error: 'Please provide a query.' }, { status: 400 });
    }

    const userIntent = query.trim();

    // ── Step 1: Fetch genre list for AI context ──────────────
    const { data: genres } = await supabase.from('genres').select('id, name, slug');
    const genreList = (genres || []).map((g) => `${g.name} (slug: ${g.slug})`).join(', ');
    const genreMap = new Map((genres || []).map((g) => [g.slug, g.id]));

    const fallbackGenreId = genres?.[0]?.id ?? null;

    // ── Step 2: Ask AI to recommend a SPECIFIC learning path ─
    const aiPrompt = `You are a world-class education and book recommendation expert.

The user wants to learn about or explore: "${userIntent}"

Available genres in the database: ${genreList}

Your job: Create a 3-step reading curriculum (Beginner, Intermediate, Advanced) using REAL books.
The progression should logically take the user from a foundational understanding to deep mastery.

Return ONLY a JSON array with exactly 3 objects (no markdown, no explanation):
[
  {
    "level": "Beginner",
    "title": "exact book title",
    "author": "exact author name",
    "why": "Why this is the perfect starting point",
    "genre_guess": "closest genre slug"
  },
  {
    "level": "Intermediate",
    "title": "exact book title",
    "author": "exact author name",
    "why": "How this builds on the beginner book",
    "genre_guess": "closest genre slug"
  },
  {
    "level": "Advanced",
    "title": "exact book title",
    "author": "exact author name",
    "why": "Why this is the ultimate mastery text",
    "genre_guess": "closest genre slug"
  }
]

Critical rules:
- ONLY recommend REAL books that actually exist. No made-up titles.
- Must be exactly 3 steps: Beginner, Intermediate, Advanced.
- genre_guess must be a slug from the available genres list.`;

    const rawText = await callAnyAI(aiPrompt);

    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI returned invalid response');

    const aiBooks: AIPathBook[] = JSON.parse(jsonMatch[0]);
    console.log(`[Recommend Path] AI suggested ${aiBooks.length} steps`);

    // ── Step 3: For each AI book, find or create in DB ───────
    const selectFields =
      'id, title, author, cover_image_url, expert_rating, community_rating, description, difficulty_level, is_bestseller, genre_id, genres(name, color, icon, slug)';

    const resultBooks = [];

    for (const aiBook of aiBooks) {
      try {
        const { data: existing } = await supabase
          .from('books')
          .select(selectFields)
          .ilike('title', aiBook.title)
          .ilike('author', `%${aiBook.author.split(' ').pop()}%`)
          .limit(1);

        if (existing && existing.length > 0) {
          const existingBook = existing[0];
          
          if (!existingBook.cover_image_url) {
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
            path_level: aiBook.level,
          });
          continue;
        }

        const olData = await fetchFromOpenLibrary(aiBook.title, aiBook.author);
        const genreId = genreMap.get(aiBook.genre_guess) ?? fallbackGenreId;

        if (!genreId) continue;

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
            expert_rating: 0,
            community_rating: 0,
            total_reviews: 0,
            tags: [],
            is_featured: false,
            is_editors_pick: false,
            is_bestseller: false,
            language: 'en',
          })
          .select(selectFields)
          .single();

        if (insertError) continue;

        resultBooks.push({
          ...inserted,
          why: aiBook.why,
          path_level: aiBook.level,
        });
      } catch (bookErr) {
        continue;
      }
    }

    if (resultBooks.length === 0) {
      return NextResponse.json({
        books: [],
        message: `We couldn't generate a path for "${userIntent}".`,
      });
    }

    return NextResponse.json({ books: resultBooks });
  } catch (err: unknown) {
    console.error('[Recommend Path API Error]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Something went wrong.' },
      { status: 500 }
    );
  }
}
