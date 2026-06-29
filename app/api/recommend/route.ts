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

// Main Route Handler

// The `POST` function name tells Next.js to run this code for POST requests
export async function POST(request: Request) {
  try {
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
    // If the query is highly specific, we ask the LLM to just name 3 perfect books right now.
    // We run this at the same time as the DB vector search to save time!
    let fallbackPromise: Promise<{title: string, author: string}[]> | null = null;
    if (query) {
       const fallbackPrompt = `
Recommend up to 3 real-world books that PERFECTLY match this exact atmosphere and request: "${query}".
Are these 3 books explicitly classified in the primary genre requested by the user (e.g. horror, thriller, dark suspense)? If no, discard and regenerate.
Return ONLY a raw JSON array of objects with 'title' and 'author'. No other text.
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
    let finalTop6 = filteredBooks.slice(0, 6) as any[];

    // ── Phase 3: JIT Database Expansion Resolution ──
    if (fallbackPromise) {
       const fallbackBooks = await fallbackPromise;
       console.log("[Recommend API] JIT Fallback Books generated by LLM:", fallbackBooks);

       // Process the fallback books
       for (const fbook of fallbackBooks) {
          // Check if we already have this book in final top 6
          const existingIdx = finalTop6.findIndex(b => b.title.toLowerCase() === fbook.title.toLowerCase());
          if (existingIdx !== -1) {
             finalTop6[existingIdx].similarity += 0.2;
             continue;
          }

          // Check if we have it in DB at all
          const { data: existingInDb } = await supabase.from('books').select('id, title, author, cover_image_url, description, expert_rating, community_rating, difficulty_level, is_bestseller, genres(name, color, icon, slug)').ilike('title', fbook.title).limit(1);
          
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
             let insertGenreId = allGenres?.[0]?.id; // Default to first genre
             if (validFilterAreas.length > 0 && allGenres) {
                const matchedGenre = allGenres.find(g => g.name.toLowerCase() === validFilterAreas[0] || validFilterAreas[0].includes(g.name.toLowerCase()));
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
                expert_rating: 4.8, 
                community_rating: 4.5,
                total_reviews: 100,
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
             } else {
                console.warn("[Recommend API] JIT Insert Failed:", insertError);
             }
          }
       }
       
       // Sort again and slice to 6
       finalTop6.sort((a, b) => b.similarity - a.similarity);
       finalTop6 = finalTop6.slice(0, 6);
    }

    // ── Phase 4: Dynamic Honest Rationales ──
    const rationalePrompt = `
# RATIONALE INSTRUCTIONS (PHASE 4)
When acting as the Rationale Generator for the final book list, your job is to explain the connection between the user's request and the books we found.

USER REQUEST: "${query || goal}"

SELECTED BOOKS:
${JSON.stringify(finalTop6.map(b => ({ title: b.title, author: b.author, description: b.description })))}

RULES:
- NEVER echo, copy-paste, or rephrase the user's exact input imagery (e.g., if the user says "foggy window," do not write "evokes a feeling like a foggy window").
- Explain the connection purely through the book's concrete plot points, settings, and characters.
- If a database item is a poor match, explicitly state that it is a "weak match" and note what specific element is missing.

Write a 1-sentence personalized explanation for EACH book.
Return ONLY a raw JSON array of strings in the exact same order as the books. Do not wrap in markdown.
    `;

    let rationales: string[] = [];
    try {
       const rationaleRes = await callAnyAI(rationalePrompt);
       const cleanJson = rationaleRes.replace(/```json/g, '').replace(/```/g, '').trim();
       rationales = JSON.parse(cleanJson);
    } catch (e) {
       console.warn("[Recommend API] Rationale generation failed", e);
    }

    // ── Step 4: Format the Output ──
    const resultBooks = finalTop6.map((book: any, i: number) => {
      let why = rationales[i] || `A strong match based on our AI semantic similarity analysis.`;

      return {
        ...book,
        why,
        expert_rating: book.expert_rating || 4.5,
        community_rating: book.community_rating || 4.5,
        expert_quote: book.expert_rating >= 4.8 ? "A masterclass in its genre." : "A thoroughly engaging read.",
        expert_name: "AI Consensus",
        expert_consensus: "Critics broadly agree this book delivers on its premise with excellent execution.",
        community_consensus: "Readers found this incredibly satisfying and aligned with the genre's best tropes.",
        genres: book.genres || { name: "Recommended", color: "blue", icon: "book" }
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
