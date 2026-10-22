import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PAGE_SIZE = 50;

async function authenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return error || !user ? null : user;
}

function parsePositiveInteger(value: string | null, fallback: number): number | null {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Prisma ORM CRUD for the signed-in user's own reviews.
 * The direct DATABASE_URL connection does not rely on browser RLS; every mutation
 * includes user_id in its database predicate and the identity comes from Supabase Auth.
 */
export async function GET(request: NextRequest) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const page = parsePositiveInteger(request.nextUrl.searchParams.get('page'), 1);
  const limit = parsePositiveInteger(request.nextUrl.searchParams.get('limit'), 10);
  if (page === null || limit === null || limit > MAX_PAGE_SIZE) {
    return NextResponse.json({ error: 'page must be positive and limit must be between 1 and 50.' }, { status: 400 });
  }
  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(skip)) return NextResponse.json({ error: 'Page value is too large.' }, { status: 400 });

  try {
    const where: Prisma.ReviewWhereInput = { user_id: user.id };
    const [reviews, total] = await prisma.$transaction([
      prisma.review.findMany({
        where,
        select: {
          id: true,
          rating: true,
          content: true,
          reviewer_name: true,
          created_at: true,
          book: { select: { id: true, title: true, author: true } },
        },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);
    return NextResponse.json({ data: reviews, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[DBMS ORM reviews GET]', error);
    return NextResponse.json({ error: 'Unable to fetch your reviews.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const bookId = body?.bookId;
  const rating = body?.rating;
  const content = body?.content;
  if (typeof bookId !== 'string' || !UUID_RE.test(bookId)) {
    return NextResponse.json({ error: 'bookId must be a UUID.' }, { status: 400 });
  }
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be an integer from 1 to 5.' }, { status: 400 });
  }
  if (typeof content !== 'string' || content.trim().length < 10 || content.trim().length > 5000) {
    return NextResponse.json({ error: 'content must contain 10 to 5000 characters.' }, { status: 400 });
  }

  const reviewerName = (user.email?.split('@')[0] || 'User').trim().slice(0, 80) || 'User';
  try {
    const review = await prisma.review.create({
      data: { book_id: bookId, user_id: user.id, reviewer_name: reviewerName, rating, content: content.trim() },
      select: { id: true, book_id: true, user_id: true, reviewer_name: true, rating: true, content: true, created_at: true },
    });
    return NextResponse.json({ data: review }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json({ error: 'The selected book does not exist.' }, { status: 404 });
    }
    console.error('[DBMS ORM reviews POST]', error);
    return NextResponse.json({ error: 'Unable to create review.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'A JSON object is required.' }, { status: 400 });
  }
  const reviewId = body.reviewId;
  if (typeof reviewId !== 'string' || !UUID_RE.test(reviewId)) {
    return NextResponse.json({ error: 'reviewId must be a UUID.' }, { status: 400 });
  }

  const data: Prisma.ReviewUpdateManyMutationInput = {};
  if (Object.prototype.hasOwnProperty.call(body, 'rating')) {
    if (typeof body.rating !== 'number' || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
      return NextResponse.json({ error: 'rating must be an integer from 1 to 5.' }, { status: 400 });
    }
    data.rating = body.rating;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'content')) {
    if (typeof body.content !== 'string' || body.content.trim().length < 10 || body.content.trim().length > 5000) {
      return NextResponse.json({ error: 'content must contain 10 to 5000 characters.' }, { status: 400 });
    }
    data.content = body.content.trim();
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Supply a valid rating and/or content field.' }, { status: 400 });
  }

  try {
    const result = await prisma.review.updateMany({ where: { id: reviewId, user_id: user.id }, data });
    if (result.count === 0) return NextResponse.json({ error: 'Review not found or permission denied.' }, { status: 404 });
    const review = await prisma.review.findFirst({
      where: { id: reviewId, user_id: user.id },
      select: { id: true, book_id: true, user_id: true, reviewer_name: true, rating: true, content: true, created_at: true },
    });
    if (!review) return NextResponse.json({ error: 'Review changed but could not be reloaded.' }, { status: 500 });
    return NextResponse.json({ data: review });
  } catch (error) {
    console.error('[DBMS ORM reviews PATCH]', error);
    return NextResponse.json({ error: 'Unable to update review.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const reviewId = request.nextUrl.searchParams.get('reviewId');
  if (!reviewId || !UUID_RE.test(reviewId)) {
    return NextResponse.json({ error: 'reviewId must be supplied as a UUID query parameter.' }, { status: 400 });
  }

  try {
    const result = await prisma.review.deleteMany({ where: { id: reviewId, user_id: user.id } });
    if (result.count === 0) return NextResponse.json({ error: 'Review not found or permission denied.' }, { status: 404 });
    return NextResponse.json({ deleted: true, reviewId });
  } catch (error) {
    console.error('[DBMS ORM reviews DELETE]', error);
    return NextResponse.json({ error: 'Unable to delete review.' }, { status: 500 });
  }
}
