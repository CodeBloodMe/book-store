import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/require-role';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    message: 'Test data changes require a signed-in administrator session.',
    instructions: { add: 'POST /api/test-data with { "action": "add" }', remove: 'POST /api/test-data with { "action": "remove" }' },
  }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Admin-only, development-only fixture endpoint. Never enable it in production. */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }
  const access = await requireRole(['Admin']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json().catch(() => null) as { action?: unknown } | null;
  if (body?.action === 'remove') {
    const { data, error } = await supabaseAdmin
      .from('books')
      .delete()
      .contains('tags', ['DUMMY_TEST_DATA'])
      .select('id');
    if (error) {
      console.error('[test-data] Cleanup failed:', error);
      return NextResponse.json({ error: 'Test data cleanup failed.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, deleted: data?.length ?? 0 });
  }

  if (body?.action !== 'add') {
    return NextResponse.json({ error: 'action must be add or remove.' }, { status: 400 });
  }

  const { data: genres, error: genreError } = await supabaseAdmin.from('genres').select('id, name');
  if (genreError || !genres?.length) {
    return NextResponse.json({ error: 'No genres are available for test data.' }, { status: 400 });
  }

  let inserted = 0;
  for (const genre of genres) {
    const records = Array.from({ length: 30 }, (_, index) => {
      const seq = index + 1;
      const id = `test-fixture:${genre.id}:${seq}`;
      return {
        genre_id: genre.id,
        title: `[TEST] ${genre.name} Book ${seq}`,
        author: `Test Author ${seq}`,
        description: `Deterministic fixture record for validating pagination and filtering for ${genre.name}.`,
        expert_rating: Number((3 + ((seq % 20) / 10)).toFixed(1)),
        community_rating: Number((3 + ((seq % 20) / 10)).toFixed(1)),
        total_reviews: seq * 7,
        difficulty_level: (['Beginner', 'Intermediate', 'Advanced'] as const)[seq % 3],
        external_id: id,
        tags: ['DUMMY_TEST_DATA'],
        is_featured: false,
        is_editors_pick: false,
        is_bestseller: seq % 5 === 0,
      };
    });
    const { data, error } = await supabaseAdmin
      .from('books')
      .upsert(records, { onConflict: 'external_id', ignoreDuplicates: true })
      .select('id');
    if (error) {
      console.error(`[test-data] Fixture insertion failed for ${genre.name}:`, error);
      return NextResponse.json({ error: 'Fixture insertion failed. Remove fixture rows and inspect database constraints.' }, { status: 500 });
    }
    inserted += data?.length ?? 0;
  }

  return NextResponse.json({ success: true, inserted, genreCount: genres.length });
}
