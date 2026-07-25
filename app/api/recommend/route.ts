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

/**
 * Fetches an extended plot description from Wikipedia.
 */
async function fetchFromWikipedia(title: string): Promise<string | null> {
  try {
    // Try with "(novel)" first to avoid movies
    let res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(title + " (novel)")}&format=json`);
    let data = await res.json();
    let pages = data.query?.pages;
    let pageId = Object.keys(pages || {})[0];

    if (!pageId || pageId === '-1') {
      // Fallback to just title
      res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(title)}&format=json`);
      data = await res.json();
      pages = data.query?.pages;
      pageId = Object.keys(pages || {})[0];
    }

    if (pageId && pageId !== '-1') {
      const extract = pages[pageId].extract;
      if (extract && extract.length > 50) {
        return extract;
      }
    }
  } catch (err) {
    console.warn(`[Wikipedia] Failed to fetch for "${title}"`, err);
  }
  return null;
}

// Rate limiting map: IP -> { count, timestamp }
const rateLimit = new Map<string, { count: number, timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;

// Main Route Handler

// The `POST` function name tells Next.js to run this code for POST requests
export async function POST(request: Request) {
  try {
    // Basic IP-based rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const userLimit = rateLimit.get(ip) || { count: 0, timestamp: now };
    
    if (now - userLimit.timestamp > RATE_LIMIT_WINDOW) {
      userLimit.count = 1;
      userLimit.timestamp = now;
    } else {
      userLimit.count++;
      if (userLimit.count > MAX_REQUESTS) {
        return NextResponse.json({ error: 'Too many requests. Please wait a minute and try again.' }, { status: 429 });
      }
    }
    rateLimit.set(ip, userLimit);

    const body: RecommendRequest = await request.json();
    const { query, goal, area, style } = body;

    if (!query && !goal) {
      return NextResponse.json({ error: 'Please provide a query.' }, { status: 400 });
    }

    // ── Phase 1: Input Normalization Agent ──
    let extractedVibe = query ? query.trim() : `A book focused on ${goal || 'anything'}, perfectly suited for ${style || 'anyone'}.`;
    let explicitGenres: string[] = [];
    let hardGenreFilter = "";
    let threatTags: string[] = [];
    let excludedKeywords: string[] = [];
    let excludedAuthors: string[] = [];

    if (query) {
       const extractionPrompt = `
# ROLE & CORE SYSTEM OBJECTIVE
You are the central orchestration brain of an Agentic RAG Book Recommendation Engine. Your primary objective is to intercept raw, messy, emotional, or abstract user prompts and normalize them into a strict machine-readable JSON search profile. This profile guarantees that subsequent database searches (vector and keyword) return accurate industry-standard book genres, preventing vector drift and hallucinations.

---

# ARCHITECTURE CONSTRAINTS & BEHAVIOR
1. DO NOT rely on the user's literal vocabulary. Translate emotional imagery into physical plot elements, genres, and specific tropes.
2. REVERSE NEGATIVE CONSTRAINTS: If a user states "no gore" or "not by Stephen King", you must extract these parameters into the \`excluded_keywords\` or \`excluded_authors\` fields. Do not pass negative terms into the \`cleaned_vector_search_string\`.
3. STRICT GENRE LOCKING: Identify the single best primary publishing genre. If abstract elements describe eerie, haunting, or spooky feelings, lock the genre to "Horror" or "Thriller" to bypass generic fiction matches.



# OUTPUT FORMAT
You must respond strictly with a valid JSON object. Do not include markdown code blocks, text wrappers, or explanations outside the JSON payload.

{
  "cleaned_vector_search_string": "A highly descriptive, literal sentence summarizing the physical setting, core plot tropes, and specific aesthetic elements for vector embedding generation.",
  "hard_genre_filter": "The definitive, capitalized industry genre string used to execute a strict SQL WHERE filter (e.g., Horror, Gothic Thriller, Fantasy, Sci-Fi, Mystery).",
  "threat_tags": [
    "An array of explicit plot elements, character archetypes, or creature/monster tags extracted from the prompt text context."
  ],
  "excluded_keywords": [
    "A clean array of themes, stylistic elements, or genres the user explicitly asked to avoid."
  ],
  "excluded_authors": [
    "An array of individual author names specified to be locked out of the results."
  ]
}

USER RAW INPUT:
"""
${extractedVibe}
"""
       `;
       
       try {
         const extractionResult = await callAnyAI(extractionPrompt);
         const cleanJson = extractionResult.replace(/```json/g, '').replace(/```/g, '').trim();
         const parsed = JSON.parse(cleanJson);
         
         extractedVibe = parsed.cleaned_vector_search_string || extractedVibe;
         hardGenreFilter = parsed.hard_genre_filter || "";
         threatTags = parsed.threat_tags || [];
         excludedKeywords = parsed.excluded_keywords || [];
         excludedAuthors = parsed.excluded_authors || [];
         
         if (hardGenreFilter) explicitGenres.push(hardGenreFilter);

         console.log("[Recommend API] Input Normalizer Extracted:", parsed);
       } catch (err) {
         console.warn("[Recommend API] Input Normalizer failed, falling back to raw query", err);
       }
    }

    if (area && !explicitGenres.includes(area)) {
       explicitGenres.push(area);
    }

    const userIntent = `Genre: ${hardGenreFilter}\nDescription: ${extractedVibe}`;
    console.log(`[Recommend API] Hybrid Search for: "${userIntent}"`);

    // ── Phase 3 Prep: Start JIT Fallback Concurrently ──
    // If the query is highly specific, we ask the LLM to just name 6 perfect books right now.
    // We run this at the same time as the DB vector search to save time!
    let fallbackPromise: Promise<{title: string, author: string, genre_guess?: string}[]> | null = null;
    if (query) {
       const fallbackPrompt = `
Recommend up to 6 real-world books that PERFECTLY match this exact atmosphere and request: "${query}".
Are these 6 books explicitly classified in the primary genre requested by the user (e.g. horror, thriller, dark suspense)? If no, discard and regenerate.
Return ONLY a raw JSON array of objects with 'title', 'author', and 'genre_guess'. No other text.
       `;
       fallbackPromise = callAnyAI(fallbackPrompt).then(res => {
         const clean = res.replace(/```json/g, '').replace(/```/g, '').trim();
         return JSON.parse(clean);
       }).catch(() => []);
    }

    // ── Step 1: Embed the User's Query ──
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: userIntent,
    });
    
    // Slice to 768 dimensions to match our database schema
    const query_embedding = response.embeddings?.[0]?.values?.slice(0, 768);
    if (!query_embedding) throw new Error("No embedding returned from AI model");

    // ── Step 2: Search the Database using pgvector ──
    const { data: matchedBooks, error } = await supabase.rpc('match_books', {
      query_embedding,
      match_threshold: 0.05, 
      match_count: 300 // Increased pool for Hard Filter application
    });

    if (error) {
      console.error("[Recommend API] Supabase RPC Error:", error);
      throw new Error("Failed to search books database");
    }

    let candidateBooks = matchedBooks || [];

    // ── Step 2.5: Genre Injection ──
    const targetFilterAreas = explicitGenres.flat().filter(g => typeof g === 'string').map(g => g.toLowerCase());

    const validFilterAreas: string[] = [];

    if (targetFilterAreas.length > 0) {
      const { data: allGenres } = await supabase.from('genres').select('id, name');
      
      for (const targetFilterArea of targetFilterAreas) {
        const matchedGenre = allGenres?.find(g => g.name.toLowerCase() === targetFilterArea || targetFilterArea.includes(g.name.toLowerCase()));
        
        if (matchedGenre) {
          validFilterAreas.push(matchedGenre.name.toLowerCase());
          const { data: genreBooks } = await supabase
             .from('books')
             .select('id')
             .eq('genre_id', matchedGenre.id)
             .order('expert_rating', { ascending: false })
             .limit(20);
             
          if (genreBooks) {
             genreBooks.forEach(gb => {
               const existing = candidateBooks.find((m: any) => m.id === gb.id);
               if (!existing) {
                  candidateBooks.push({ id: gb.id, similarity: 0.8 });
               } else {
                  existing.similarity += 0.5; 
               }
             });
          }
        }
      }
    }

    // ── Step 3: Fetch Full Book Data (including genres) and Filter ──
    let bookIds = candidateBooks.map((b: any) => b.id);
    
    let { data: fullBooks } = await supabase
      .from('books')
      .select('id, title, author, cover_image_url, description, expert_rating, community_rating, difficulty_level, is_bestseller, genres(name, color, icon, slug)')
      .in('id', bookIds);

    let filteredBooks: any[] = fullBooks || [];

    filteredBooks = filteredBooks.map(fb => {
      const match = candidateBooks.find((mb: any) => mb.id === fb.id);
      return { ...fb, similarity: match?.similarity || 0 };
    });

    // ── Hard Filtering (Two-Tier Vector Simulation) ──
    // Step 1 (Hard Filter): Instantly isolate candidate books where genre matches
    if (validFilterAreas.length > 0) {
      filteredBooks = filteredBooks.filter(book => {
        const genreName = Array.isArray(book.genres) ? book.genres[0]?.name : (book.genres as any)?.name;
        return genreName && validFilterAreas.some(area => genreName.toLowerCase().includes(area) || area.includes(genreName.toLowerCase()));
      });
    }

    // Step 2: Ensure it matches threat_tags if any exist
    if (threatTags.length > 0) {
      filteredBooks = filteredBooks.filter(book => {
        return threatTags.some(threat => 
           (book.description && book.description.toLowerCase().includes(threat.toLowerCase())) ||
           (book.title && book.title.toLowerCase().includes(threat.toLowerCase()))
        );
      });
    }

    // Excluded Keywords Post-Filter
    if (excludedKeywords.length > 0) {
       filteredBooks = filteredBooks.filter(book => {
          const hasExcluded = excludedKeywords.some(keyword => {
             const lowerKw = keyword.toLowerCase();
             const inTitle = book.title && book.title.toLowerCase().includes(lowerKw);
             const inDesc = book.description && book.description.toLowerCase().includes(lowerKw);
             const inAuthor = book.author && book.author.toLowerCase().includes(lowerKw);
             return inTitle || inDesc || inAuthor;
          });
          return !hasExcluded;
       });
    }

    // Excluded Authors Post-Filter
    if (excludedAuthors.length > 0) {
       filteredBooks = filteredBooks.filter(book => {
          const hasExcluded = excludedAuthors.some(author => {
             const lowerAuthor = author.toLowerCase();
             return book.author && book.author.toLowerCase().includes(lowerAuthor);
          });
          return !hasExcluded;
       });
    }

    filteredBooks.sort((a, b) => b.similarity - a.similarity);
    let finalTop6 = filteredBooks.slice(0, 10) as any[];

    // ── Phase 3: JIT Database Expansion Resolution ──
    if (fallbackPromise) {
       const fallbackBooks = await fallbackPromise;
       console.log("[Recommend API] JIT Fallback Books generated by LLM:", fallbackBooks);

        // Process the fallback books
        for (const fbook of fallbackBooks) {
           const cleanTitle = fbook.title.replace(/^(the|a|an)\s+/i, '').trim().toLowerCase();
           
           // Check if we already have this book in final results
           const existingIdx = finalTop6.findIndex(b => {
             const bTitle = b.title.replace(/^(the|a|an)\s+/i, '').trim().toLowerCase();
             return bTitle.includes(cleanTitle) || cleanTitle.includes(bTitle);
           });
           if (existingIdx !== -1) {
              finalTop6[existingIdx].similarity += 0.2;
              continue;
           }

           // Check if we have it in DB at all (fuzzy match ignoring "The ")
           const { data: existingInDb } = await supabase
             .from('books')
             .select('id, title, author, cover_image_url, description, expert_rating, community_rating, difficulty_level, is_bestseller, genres(name, color, icon, slug)')
             .ilike('title', `%${cleanTitle}%`)
             .limit(1);
          
          if (existingInDb && existingInDb.length > 0) {
             finalTop6.push({ ...existingInDb[0], similarity: 0.95 });
          } else {
             // JIT Insertion! Fetch from Apple Books and Wikipedia concurrently
             console.log(`[Recommend API] 🔧 JIT Expansion: Fetching new book "${fbook.title}"`);
             const [olData, wikiDesc] = await Promise.all([
               fetchFromAppleBooks(fbook.title, fbook.author),
               fetchFromWikipedia(fbook.title)
             ]);
             
             // Prioritize Wikipedia's deep summary, fallback to Apple Books
             const finalDescription = wikiDesc || olData.description;
             
             // We need a genre_id to insert into the DB. We'll find the closest one or fallback
             const { data: allGenres } = await supabase.from('genres').select('id, name');
             let insertGenreId = allGenres?.find(g => g.name.toLowerCase() === 'fiction')?.id || allGenres?.[0]?.id; // Default to Fiction
             
              if (allGenres) {
                 let matchedGenre;
                 if (fbook.genre_guess) {
                    const guess = fbook.genre_guess.toLowerCase();
                    matchedGenre = allGenres.find(g => g.name.toLowerCase() === guess);
                    if (!matchedGenre) {
                       const sortedGenres = [...allGenres].sort((a, b) => b.name.length - a.name.length);
                       matchedGenre = sortedGenres.find(g => guess.includes(g.name.toLowerCase()));
                    }
                 }
                 if (!matchedGenre && validFilterAreas.length > 0) {
                    matchedGenre = allGenres.find(g => g.name.toLowerCase() === validFilterAreas[0] || validFilterAreas[0].includes(g.name.toLowerCase()));
                 }
                 if (!matchedGenre && fbook.genre_guess) {
                    const guess = fbook.genre_guess.toLowerCase();
                    if (guess.length > 3) {
                       matchedGenre = allGenres.find(g => g.name.toLowerCase().startsWith(guess) || guess.startsWith(g.name.toLowerCase()));
                    }
                 }
                 if (matchedGenre) insertGenreId = matchedGenre.id;
              }

             // Insert into DB
             const newBook = {
                title: fbook.title,
                author: fbook.author,
                genre_id: insertGenreId,
                description: finalDescription,
                cover_image_url: olData.cover_url,
                published_year: olData.published_year,
                page_count: olData.page_count,
                expert_rating: null,
                community_rating: null,
                total_reviews: 0,
                language: 'en',
                is_featured: false,
                is_editors_pick: false,
                is_bestseller: false,
                tags: validFilterAreas
             };

             const { data: inserted, error: insertError } = await supabase.from('books').insert(newBook).select('id, title, author, cover_image_url, description, expert_rating, community_rating, difficulty_level, is_bestseller, genres(name, color, icon, slug)').single();
             
             if (inserted && !insertError) {
                console.log(`[Recommend API] 🚀 Successfully expanded database with "${inserted.title}"`);
                finalTop6.push({ ...inserted, similarity: 0.95 });
                
                // Fire and forget embedding generation for the new book
                fetch(`${request.headers.get('origin') || 'http://localhost:3000'}/api/cron/embed`).catch(() => {});
             } else {
                console.warn("[Recommend API] JIT Insert Failed:", insertError);
             }
          }
       }
       
       // Sort again and slice to 10
       finalTop6.sort((a, b) => b.similarity - a.similarity);
       finalTop6 = finalTop6.slice(0, 10);
    }

    // ── Phase 4: World-Class Multi-Dimensional Analysis ──
    const rationalePrompt = `
# ROLE: You are the world's most insightful literary matchmaker.

USER REQUEST: "${query || goal}"

SELECTED BOOKS:
${JSON.stringify(finalTop6.map(b => ({ title: b.title, author: b.author, description: b.description, community_rating: b.community_rating, total_reviews: b.total_reviews })))}

# OUTPUT: For each book, return a JSON object with these fields:
- "why": A sharp, specific 1-sentence rationale connecting the book to the user's request through concrete plot points, NOT by repeating the user's words.
- "mood_match": Integer 0-100. How well the book's emotional tone matches the user's desired mood.
- "theme_match": Integer 0-100. How well the book's themes/subject align with what the user asked for.
- "style_match": Integer 0-100. How well the writing style/pacing matches the user's vibe.
- "read_if": A short, honest "Read this if you..." sentence (e.g., "Read this if you love slow-burn character studies with unreliable narrators").
- "skip_if": A short, honest "Skip this if you..." sentence (e.g., "Skip this if you want fast-paced action — this is a meditative novel").
- "emotional_arc": One sentence describing the emotional journey (e.g., "Starts with quiet grief, builds to fierce hope, ends with bittersweet acceptance").
- "discovery": "hidden-gem" if < 5000 reviews/ratings or relatively unknown, "popular" if well-known, "classic" if widely considered a must-read.

# RULES:
- Be BRUTALLY HONEST. If a book is a weak match, say so in "why" and give low match scores.
- Never invent plot points. Only reference what's in the description.
- The "skip_if" is what makes this recommendation engine TRUSTWORTHY. Never leave it generic.
- If you don't know enough about a book, say "Based on limited information" in the why.

Return ONLY a raw JSON array of objects (one per book, same order). No markdown wrapping.
    `;

    let analyses: any[] = [];
    try {
       const rationaleRes = await callAnyAI(rationalePrompt);
       const cleanJson = rationaleRes.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
       analyses = JSON.parse(cleanJson);
    } catch (e) {
       console.warn("[Recommend API] Analysis generation failed", e);
    }

    // ── Step 4: Format the Output (NO FAKE DATA) ──
    const resultBooks = finalTop6.map((book: any, i: number) => {
      const analysis = analyses[i] || {};

      return {
        ...book,
        why: analysis.why || `Matched based on semantic similarity to your request.`,
        mood_match: analysis.mood_match ?? null,
        theme_match: analysis.theme_match ?? null,
        style_match: analysis.style_match ?? null,
        read_if: analysis.read_if || null,
        skip_if: analysis.skip_if || null,
        emotional_arc: analysis.emotional_arc || null,
        discovery: analysis.discovery || 'popular',
        // HONEST DATA ONLY — no fake fallbacks
        expert_rating: book.expert_rating || null,
        community_rating: book.community_rating || null,
        genres: book.genres || null,
      };
    });

    return NextResponse.json({ books: resultBooks });
    
  } catch (err: unknown) {
    console.error('[Recommend API Error]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Something went wrong.' },
      { status: 500 }
    );
  }
}
