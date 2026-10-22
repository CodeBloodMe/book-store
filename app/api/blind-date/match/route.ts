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
      return NextResponse.json({ error: 'Missing required parameter: sessionId' }, { status: 400 });
    }

    // 1. Save/update the quiz profile
    await supabase
      .from('user_reader_profiles')
      .upsert(
        { session_id: sessionId, mood, pace_preference: pace, complexity_preference: complexity, era_preference: era, length_preference: length },
        { onConflict: 'session_id' }
      );

    // 2. Generate Semantic Target for Embedding
    const userIntent = `A book that is ${pace || 'moderately'} paced, has ${complexity || 'average'} complexity, a ${mood || 'balanced'} mood, and is a ${length || 'standard'} length read.`;
    
    let query_embedding = null;
    try {
      const resEmbed = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: userIntent }] },
          outputDimensionality: 768
        })
      });
      const embedData = await resEmbed.json();
      if (embedData.embedding?.values) {
        query_embedding = embedData.embedding.values.slice(0, 768);
      }
    } catch (e) {
      console.error("[Blind Date] Embedding failed, falling back to basic matching.", e);
    }

    // 3. Call the appropriate RPC
    let matchResult, matchError;
    
    if (query_embedding) {
      const { data, error } = await supabase.rpc('match_mystery_book_advanced', {
        p_session_id: sessionId,
        p_query_embedding: `[${query_embedding.join(',')}]`,
        p_length: length || null,
        p_era: era || null,
      });
      matchResult = data;
      matchError = error;
    } else {
      const { data, error } = await supabase.rpc('match_mystery_book', {
        p_session_id: sessionId, p_mood: mood, p_pace: pace, p_complexity: complexity, p_era: era, p_length: length
      });
      matchResult = data;
      matchError = error;
    }

    if (matchError || !matchResult || matchResult.length === 0) {
      return NextResponse.json({ found: false, message: "You've seen all available books! Try a new session." }, { status: 200 });
    }

    const match = matchResult[0];

    // 4. Generate AI Teaser (Groq/Llama3)
    let aiTeaser = match.description ? match.description.substring(0, 150) + '...' : 'A thrilling mystery awaits...';
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
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 150
        })
      });
      
      const groqData = await groqRes.json();
      if (groqData.choices?.[0]?.message?.content) {
        aiTeaser = groqData.choices[0].message.content.trim();
      }
    } catch (e) {
      console.error("[Blind Date] AI Teaser generation failed:", e);
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
    });
  } catch (err) {
    console.error('[Blind Date Match API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
