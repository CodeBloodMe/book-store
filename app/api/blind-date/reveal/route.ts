import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** POST /api/blind-date/reveal
 * Consumes the session's active match atomically. Rejections do not return the
 * book payload. The database function prevents replay and stale-match requests.
 */
export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json({ error: 'A JSON object is required.' }, { status: 400 });
    }
    const body = raw as Record<string, unknown>;
    const { sessionId, bookId, accepted } = body;

    if (
      typeof sessionId !== 'string' || !UUID_RE.test(sessionId) ||
      typeof bookId !== 'string' || !UUID_RE.test(bookId) ||
      typeof accepted !== 'boolean'
    ) {
      return NextResponse.json(
        { error: 'sessionId and bookId must be UUIDs, and accepted must be boolean.' },
        { status: 400 }
      );
    }

    // Load the accepted payload first so a temporary catalog read failure does
    // not consume the one-use match and leave the visitor unable to retry.
    let book: Record<string, unknown> | null = null;
    if (accepted) {
      const { data, error } = await supabaseAdmin
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
      if (error || !data) {
        console.error('[Blind Date] Book fetch error:', error?.message);
        return NextResponse.json({ error: 'Failed to fetch book details.' }, { status: 500 });
      }
      book = data;
    }

    const { data: recorded, error: interactionError } = await supabaseAdmin.rpc(
      'record_blind_date_interaction',
      { p_session_id: sessionId, p_book_id: bookId, p_accepted: accepted }
    );

    if (interactionError) {
      console.error('[Blind Date] Interaction transaction failed:', interactionError.message);
      return NextResponse.json({ error: 'Could not record this decision.' }, { status: 500 });
    }
    if (recorded !== true) {
      return NextResponse.json(
        { error: 'This match is stale or does not belong to this session.' },
        { status: 409 }
      );
    }

    if (!accepted) {
      return NextResponse.json(
        { accepted: false, message: 'Book passed. Finding another match.' },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { accepted: true, book, message: "You accepted the date! Here's your match." },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[Blind Date Reveal API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
