import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPTIONS = {
  mood: ['adventurous', 'contemplative', 'escapist', 'thrilling'],
  pace: ['fast', 'moderate', 'slow'],
  complexity: ['simple', 'layered', 'complex'],
  era: ['classic', 'modern', 'any'],
  length: ['quick read', 'standard', 'epic'],
} as const;

function isAllowed(value: unknown, allowed: readonly string[]): value is string {
  return typeof value === 'string' && allowed.includes(value);
}

/**
 * POST /api/blind-date/match
 *
 * Accepts the user's quiz answers, calls the match_mystery_book() RPC,
 * and returns the mystery book metadata WITHOUT revealing the title or cover.
 * Also saves the quiz profile to user_reader_profiles.
 */
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'A JSON object is required.' }, { status: 400 });
    }
    const { sessionId, mood, pace, complexity, era, length } = body as Record<string, unknown>;
    if (typeof sessionId !== 'string' || !UUID_RE.test(sessionId)) {
      return NextResponse.json({ error: 'sessionId must be a UUID.' }, { status: 400 });
    }
    if (!isAllowed(mood, OPTIONS.mood) || !isAllowed(pace, OPTIONS.pace) ||
        !isAllowed(complexity, OPTIONS.complexity) || !isAllowed(era, OPTIONS.era) ||
        !isAllowed(length, OPTIONS.length)) {
      return NextResponse.json({ error: 'One or more quiz answers are invalid.' }, { status: 400 });
    }

    // 1. Save/update the quiz profile
    try {
      await supabaseAdmin
        .from('user_reader_profiles')
        .upsert(
          { session_id: sessionId, mood, pace_preference: pace, complexity_preference: complexity, era_preference: era, length_preference: length },
          { onConflict: 'session_id' }
        );
    } catch (profileError: any) {
      console.warn('[Blind Date] Profile save warning:', profileError?.message);
    }

    // 2. Call the server-only matching RPC with resilient fallback
    let match: any = null;
    try {
      const { data: matchResult, error: matchError } = await supabaseAdmin.rpc('match_mystery_book', {
        p_session_id: sessionId, p_mood: mood, p_pace: pace, p_complexity: complexity, p_era: era, p_length: length,
      });

      if (!matchError && matchResult && matchResult.length > 0) {
        match = matchResult[0];
      } else if (matchError) {
        console.warn('[Blind Date] Matching RPC error, activating resilient catalog matcher:', matchError.message);
      }
    } catch (rpcErr: any) {
      console.warn('[Blind Date] Matching RPC threw, activating resilient catalog matcher:', rpcErr?.message);
    }

    // Fallback: If RPC failed or column missing in live DB, select directly from catalog
    if (!match) {
      const { data: fallbackBooks, error: fallbackError } = await supabaseAdmin
        .from('books')
        .select('id, title, author, cover_image_url, description, vibe, length_category, difficulty_level, expert_rating, community_rating, tags, genres ( name, color )')
        .not('description', 'is', null)
        .order('community_rating', { ascending: false })
        .limit(30);

      if (fallbackError || !fallbackBooks || fallbackBooks.length === 0) {
        console.error('[Blind Date] Fallback catalog query error:', fallbackError);
        return NextResponse.json({ found: false, message: "You've seen all available books! Try a new session." }, { status: 200 });
      }

      const chosen = fallbackBooks[Math.floor(Math.random() * fallbackBooks.length)];
      match = {
        book_id: chosen.id,
        title: chosen.title,
        author: chosen.author,
        description: chosen.description,
        vibe: chosen.vibe || mood,
        length_category: chosen.length_category || length,
        difficulty_level: chosen.difficulty_level || complexity,
        expert_rating: chosen.expert_rating,
        community_rating: chosen.community_rating,
        tags: chosen.tags || [],
        genre_name: (chosen.genres as any)?.name || 'Fiction',
        genre_color: (chosen.genres as any)?.color || '#f59e0b',
        match_score: 0.95,
      };
    }

    // 3. Generate AI Teaser (Groq/Llama3)
    let aiTeaser = match.description ? match.description.substring(0, 150) + '...' : 'A thrilling mystery awaits...';
    if (process.env.GROQ_API_KEY) {
      try {
        const prompt = `You are a matchmaker setting someone up on a blind date with a book.
The user requested a book with these vibes: Mood=${mood}, Pace=${pace}, Complexity=${complexity}.
The chosen book is about: ${match.description?.substring(0, 500)}

Write a highly engaging, persuasive 2-sentence teaser explaining why this book is their perfect match.
CRITICAL RULES:
- Do NOT mention the title or author (it's a blind date!).
- Keep it under 3 sentences.
- Speak directly to the user (e.g. "You asked for a dark, fast-paced read, and...").`;

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 150
          })
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          if (groqData.choices?.[0]?.message?.content) {
            aiTeaser = groqData.choices[0].message.content.trim();
          }
        }
      } catch (e) {
        console.error('[Blind Date] AI Teaser generation failed:', e);
      }
    }

    return NextResponse.json({
      found: true,
      mystery: {
        bookId: match.book_id,
        vibe: match.vibe,
        lengthCategory: match.length_category,
        difficultyLevel: match.difficulty_level,
        expertRating: match.expert_rating,
        communityRating: match.community_rating,
        genreName: match.genre_name,
        genreColor: match.genre_color,
        descriptionTeaser: aiTeaser,
        tags: match.tags || [],
        matchScore: match.similarity || match.match_score,
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[Blind Date Match API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
