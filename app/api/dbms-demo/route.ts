// ======================================================================================
// VIT BCSE302P DBMS Lab Assessment 8, 9 & 10
// Faculty: Dr. V. Sivakumar | Slot: L25+L26
// Student Name: Krish | Register Number: 24BCE0846
// Mandatory Rule 7: identity appears in a class, method, variables, and printed response.
// ======================================================================================

import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

class AssessmentIdentity_24BCE0846_24BCE0870_Krish_Parv {
  static readonly values = {
    student_name: 'Krish',
    register_number: '24BCE0846',
    team_partner_name: 'Parv Bhardwaj',
    team_partner_register_number: '24BCE0870',
    team_members: [
      { name: 'Krish', register_number: '24BCE0846', role: 'Database Architecture & Backend' },
      { name: 'Parv Bhardwaj', register_number: '24BCE0870', role: 'Relational Design & Frontend' }
    ],
    slot: 'L25+L26',
    course_code: 'BCSE302P',
    course_title: 'Database Systems Lab',
    faculty: 'Dr. V. SIVAKUMAR',
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parsePositiveInteger(value: string | null, fallback: number): number | null {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

async function getAssessmentBooks_24BCE0846_Krish(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = parsePositiveInteger(params.get('page'), 1);
  const limit = parsePositiveInteger(params.get('limit'), 10);
  const query = (params.get('q') ?? '').trim();
  const genreId = (params.get('genreId') ?? '').trim();
  const sort = params.get('sort') ?? 'title';

  if (page === null || limit === null || limit > 100) {
    return NextResponse.json({ error: 'page must be positive and limit must be between 1 and 100.' }, { status: 400 });
  }
  if (!Number.isSafeInteger((page - 1) * limit)) {
    return NextResponse.json({ error: 'The requested page is too large.' }, { status: 400 });
  }
  if (query.length > 120) {
    return NextResponse.json({ error: 'q must be 120 characters or fewer.' }, { status: 400 });
  }
  if (genreId && !UUID_RE.test(genreId)) {
    return NextResponse.json({ error: 'genreId must be a UUID.' }, { status: 400 });
  }
  if (!['title', 'rating', 'reviews'].includes(sort)) {
    return NextResponse.json({ error: 'sort must be title, rating, or reviews.' }, { status: 400 });
  }

  const where: Prisma.BookWhereInput = {};
  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { author: { contains: query, mode: 'insensitive' } },
    ];
  }
  if (genreId) where.genre_id = genreId;

  const orderBy: Prisma.BookOrderByWithRelationInput[] = sort === 'rating'
    ? [{ expert_rating: 'desc' }, { title: 'asc' }, { id: 'asc' }]
    : sort === 'reviews'
      ? [{ user_review_count: 'desc' }, { title: 'asc' }, { id: 'asc' }]
      : [{ title: 'asc' }, { id: 'asc' }];

  try {
    const [books, totalBooks] = await prisma.$transaction([
      prisma.book.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        select: {
          id: true,
          title: true,
          author: true,
          page_count: true,
          expert_rating: true,
          community_rating: true,
          user_review_average: true,
          user_review_count: true,
          genre: { select: { id: true, name: true } },
          _count: { select: { reviews: true, shelves: true } },
        },
      }),
      prisma.book.count({ where }),
    ]);

    const responseBooks = books.map((book) => ({
      ...book,
      expert_rating: book.expert_rating === null ? null : Number(book.expert_rating),
      community_rating: book.community_rating === null ? null : Number(book.community_rating),
      user_review_average: Number(book.user_review_average),
    }));

    return NextResponse.json({
      evaluation: AssessmentIdentity_24BCE0846_24BCE0870_Krish_Parv.values,
      data: responseBooks,
      meta: { total: totalBooks, page, limit, totalPages: Math.ceil(totalBooks / limit), query: query || null, genreId: genreId || null, sort },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[DBMS_DEMO_API] Database query failed:', error);
    return NextResponse.json({ error: 'Database query failed.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return getAssessmentBooks_24BCE0846_Krish(request);
}
