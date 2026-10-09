import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Note: This file is created specifically for the DBMS Lab Assessment 
// to demonstrate ORM Integration, Pagination, Validation, and Exception Handling.
// It can be safely deleted after the assessment.

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 1. Validation
    const pageParam = searchParams.get('page') || '1';
    const limitParam = searchParams.get('limit') || '10';
    
    const page = parseInt(pageParam, 10);
    const limit = parseInt(limitParam, 10);

    if (isNaN(page) || page < 1) {
      return NextResponse.json({ error: 'Invalid page parameter. Must be >= 1.' }, { status: 400 });
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Invalid limit parameter. Must be between 1 and 100.' }, { status: 400 });
    }

    // 2. Pagination & ORM Integration
    const skip = (page - 1) * limit;

    // Prisma query demonstrating relational joins (include) and pagination (skip/take)
    const books = await prisma.book.findMany({
      skip,
      take: limit,
      orderBy: { title: 'asc' },
      include: {
        reviews: {
          select: { rating: true, content: true }
        }
      }
    });

    const totalBooks = await prisma.book.count();

    // 3. Successful Response
    return NextResponse.json({
      data: books,
      meta: {
        total: totalBooks,
        page,
        limit,
        totalPages: Math.ceil(totalBooks / limit)
      }
    });

  } catch (error) {
    // 4. Exception Handling
    console.error('[DBMS_DEMO_API] Error fetching books:', error);
    
    // Check if it's a known Prisma error
    if (error instanceof Error && error.message.includes('Prisma')) {
      return NextResponse.json({ error: 'Database ORM Error occurred.' }, { status: 500 });
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
