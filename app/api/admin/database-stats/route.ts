export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/require-role';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const access = await requireRole(['Admin']);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const [books, reviews, users] = await Promise.all([
      prisma.book.count(),
      prisma.review.count(),
      prisma.user.count(),
    ]);

    return NextResponse.json({ books, reviews, users });
  } catch (error) {
    console.warn('[Admin database stats] Prisma error, using Supabase fallback:', error);
    try {
      const [b, r, u] = await Promise.all([
        supabase.from('books').select('*', { count: 'exact', head: true }),
        supabase.from('reviews').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
      ]);
      if (b.count !== null && r.count !== null && u.count !== null) {
        return NextResponse.json({ books: b.count, reviews: r.count, users: u.count });
      }
    } catch (fallbackErr) {
      console.error('[Admin database stats] Fallback error:', fallbackErr);
    }
    return NextResponse.json({ error: 'Unable to retrieve database statistics.' }, { status: 500 });
  }
}
