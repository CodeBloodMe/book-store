import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/** Public, aggregate-only statistics. Raw session records remain private. */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_blind_date_stats');

    if (error) {
      console.error('[Blind Date Stats] RPC error:', error.message);
      return NextResponse.json({ error: 'Could not load statistics.' }, { status: 503 });
    }

    const stats = data?.[0] || {
      total_dates: 0,
      accepted_dates: 0,
      acceptance_rate: 0,
      dates_this_week: 0,
    };

    return NextResponse.json(
      {
        totalDates: stats.total_dates,
        acceptedDates: stats.accepted_dates,
        acceptanceRate: Math.round((stats.acceptance_rate || 0) * 100),
        datesThisWeek: stats.dates_this_week,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (err) {
    console.error('[Blind Date Stats API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
