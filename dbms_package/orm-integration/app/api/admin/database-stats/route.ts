import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export async function GET() {
  const auth = await requireRole(['Admin']);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const totalBooks = await prisma.book.count();
    return NextResponse.json({ totalBooks });
  } catch (error) {
    console.error('[Admin database stats]', error);
    return NextResponse.json({ error: 'Unable to retrieve statistics.' }, { status: 500 });
  }
}
