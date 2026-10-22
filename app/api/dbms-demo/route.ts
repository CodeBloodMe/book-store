// ======================================================================================
// VIT BCSE302P DBMS Lab Assessment 8, 9 & 10
// Faculty: Dr. V. Sivakumar | Slot: L25+L26
// Student Name: Krish | Register Number: 24BCE0846
// Mandatory Rule 7 Compliance: Registerno & name used in method, variables, and output
// ======================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  // Method variable embedding student identity per Rule 7
  const student_24BCE0846_krish = {
    student_name: 'Krish',
    register_number: '24BCE0846',
    slot: 'L25+L26',
    course_code: 'BCSE302P',
    course_title: 'Database Systems Lab',
    faculty: 'Dr. V. SIVAKUMAR'
  };

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

    // 2. Pagination & ORM Integration (skip / take)
    const skip = (page - 1) * limit;

    // Prisma query demonstrating relational joins (include) and pagination
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

    // 3. Successful Response with Evaluation Metadata
    return NextResponse.json({
      evaluation: student_24BCE0846_krish,
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
    
    if (error instanceof Error && error.message.includes('Prisma')) {
      return NextResponse.json({ error: 'Database ORM Error occurred.' }, { status: 500 });
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
