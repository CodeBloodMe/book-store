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
    const { error: profileError } = await supabaseAdmin
      .from('user_reader_profiles')
      .upsert(
        { session_id: sessionId, mood, pace_preference: pace, complexity_preference: complexity, era_preference: era, length_preference: length, last_matched_book_id: null },
        { onConflict: 'session_id' }
      );
    if (profileError) {
      console.error('[Blind Date] Profile save error:', profileError.message);
      return NextResponse.json({ error: 'Could not save quiz preferences.' }, { status: 500 });
    }

    // 3. Call the server-only matching RPC. The hardening migration revokes the
    // browser roles from session-table and matching operations.
    const { data: matchResult, error: matchError } = await supabaseAdmin.rpc('match_mystery_book', {
      p_session_id: sessionId, p_mood: mood, p_pace: pace, p_complexity: complexity, p_era: era, p_length: length,
    });

    if (matchError) {
      console.error('[Blind Date] Matching RPC error:', matchError.message);
      return NextResponse.json({ error: 'Failed to find a match.' }, { status: 500 });
    }
    if (!matchResult || matchResult.length === 0) {
      return NextResponse.json({ found: false, message: "You've seen all available books! Try a new session." }, { status: 200 });
    }

    const match = matchResult[0];

    const { error: activeMatchError } = await supabaseAdmin
      .from('user_reader_profiles')
      .update({ last_matched_book_id: match.book_id })
      .eq('session_id', sessionId);
    if (activeMatchError) {
      console.error('[Blind Date] Could not persist active match:', activeMatchError.message);
      return NextResponse.json({ error: 'Could not save the selected match.' }, { status: 500 });
    }

    // 4. Generate AI Teaser (Groq/Llama3)
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
      
      if (!groqRes.ok) throw new Error(`Teaser provider returned HTTP ${groqRes.status}`);
      const groqData = await groqRes.json();
      if (groqData.choices?.[0]?.message?.content) {
        aiTeaser = groqData.choices[0].message.content.trim();
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
