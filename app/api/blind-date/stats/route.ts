import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/blind-date/stats
 *
 * Returns aggregate statistics for the "Blind Date With a Book" feature.
 * Used for the live counter on the UI: "X readers accepted their date this week"
 */
export async function GET() {
  try {
    const { data, error } = await supabase.rpc('get_blind_date_stats');

    if (error) {
      console.error('[Blind Date Stats] RPC error:', error.message);
      // Return default stats on error
      return NextResponse.json({
        totalDates: 0,
        acceptedDates: 0,
        acceptanceRate: 0,
        datesThisWeek: 0,
      });
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
