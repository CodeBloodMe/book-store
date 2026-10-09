import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/blind-date/match
 *
 * Accepts the user's quiz answers, calls the match_mystery_book() RPC,
 * and returns the mystery book metadata WITHOUT revealing the title or cover.
 * Also saves the quiz profile to user_reader_profiles.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, mood, pace, complexity, era, length } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameter: sessionId' },
        { status: 400 }
      );
    }

    // 1. Save/update the quiz profile
    const { error: profileError } = await supabase
      .from('user_reader_profiles')
      .upsert(
        {
          session_id: sessionId,
          mood: mood || null,
          pace_preference: pace || null,
          complexity_preference: complexity || null,
          era_preference: era || null,
          length_preference: length || null,
        },
        { onConflict: 'session_id' }
      );

    if (profileError) {
      console.error('[Blind Date] Profile save error:', profileError.message);
      // Non-fatal — continue with matching
    }

    // 2. Call the match_mystery_book RPC
    const { data: matchResult, error: matchError } = await supabase.rpc('match_mystery_book', {
      p_session_id: sessionId,
      p_mood: mood || null,
      p_pace: pace || null,
      p_complexity: complexity || null,
      p_era: era || null,
      p_length: length || null,
    });

    if (matchError) {
      console.error('[Blind Date] RPC error:', matchError.message);
      return NextResponse.json(
        { error: 'Failed to find a match' },
        { status: 500 }
      );
    }

    if (!matchResult || matchResult.length === 0) {
      return NextResponse.json(
        {
          found: false,
          message: "You've seen all available books! Try a new session.",
        },
        { status: 200 }
      );
    }

    const match = matchResult[0];

    // 3. Return MYSTERY metadata — no title, no cover
    // The client will reveal these only after the user "accepts the date"
    return NextResponse.json({
      found: true,
      mystery: {
        bookId: match.book_id,
        // Vibe/mood clues (these are shown before the reveal)
        vibe: match.vibe,
        lengthCategory: match.length_category,
        difficultyLevel: match.difficulty_level,
        expertRating: match.expert_rating,
        communityRating: match.community_rating,
        genreName: match.genre_name,
        genreColor: match.genre_color,
        // A teaser description — show only first 100 chars
        descriptionTeaser: match.description
          ? match.description.substring(0, 100) + '...'
          : 'A mystery awaits...',
        // Tags for mood indicators
        tags: match.tags || [],
        matchScore: match.match_score,
      },
    });
  } catch (err) {
    console.error('[Blind Date Match API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
