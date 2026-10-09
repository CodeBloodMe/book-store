import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/blind-date/reveal
 *
 * Records the user's accept/reject decision in blind_date_interactions
 * (this is the feedback loop for the multi-armed bandit), then returns
 * the full book details including title and cover.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, bookId, accepted } = body;

    if (!sessionId || !bookId || typeof accepted !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required parameters: sessionId, bookId, accepted' },
        { status: 400 }
      );
    }

    // 1. Record the interaction (feeds back into the bandit algorithm)
    const { error: interactionError } = await supabase
      .from('blind_date_interactions')
      .insert({
        session_id: sessionId,
        book_id: bookId,
        accepted,
      });

    if (interactionError) {
      console.error('[Blind Date] Interaction save error:', interactionError.message);
      // Non-fatal — still reveal the book
    }

    // 2. Fetch the full book details (the "reveal")
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select(`
        id, title, author, cover_image_url, description,
        expert_rating, community_rating, difficulty_level,
        genre_id, tags, vibe, length_category, page_count,
        published_year, isbn, amazon_url, goodreads_url,
        expert_quote, expert_name,
        genres(id, name, slug, icon, color)
      `)
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      console.error('[Blind Date] Book fetch error:', bookError?.message);
      return NextResponse.json(
        { error: 'Failed to fetch book details' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      accepted,
      book,
      message: accepted
        ? '💕 You accepted the date! Here\'s your match:'
        : '💔 Maybe next time! Here\'s what you passed on:',
    });
  } catch (err) {
    console.error('[Blind Date Reveal API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
