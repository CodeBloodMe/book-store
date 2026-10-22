import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/require-role';
import { prisma } from '@/lib/prisma';

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
    console.error('[Admin database stats]', error);
    return NextResponse.json({ error: 'Unable to retrieve database statistics.' }, { status: 500 });
  }
}
