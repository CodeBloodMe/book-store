import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Minimal ORM demonstration using the Book model fields currently represented in prisma/schema.prisma.
// GET /api/dbms/books?query=python&page=1&pageSize=10
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = (params.get('query') ?? '').trim();
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(params.get('pageSize') ?? '10', 10) || 10));

  try {
    const where = query ? { title: { contains: query, mode: 'insensitive' as const } } : {};
    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        select: { id: true, title: true, page_count: true, external_id: true },
        orderBy: [{ title: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.book.count({ where }),
    ]);

    return NextResponse.json({
      books,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error('[DBMS ORM books route]', error);
    return NextResponse.json({ error: 'Unable to retrieve books.' }, { status: 500 });
  }
}
