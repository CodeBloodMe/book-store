import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'add') {
    // 1. Fetch all genres to assign books to them
    const { data: genres, error: genreError } = await supabase.from('genres').select('id, name');
    if (genreError || !genres || genres.length === 0) {
      return NextResponse.json({ error: 'Failed to fetch genres or no genres found' }, { status: 400 });
    }

    const dummyBooks = [];
    
    // Create 30 dummy books per genre
    for (const genre of genres) {
      for (let i = 1; i <= 30; i++) {
        dummyBooks.push({
          genre_id: genre.id,
          title: `[TEST] ${genre.name} Book ${i}`,
          author: `Test Author ${i}`,
          description: `This is a randomly generated test book for ${genre.name}. Used to test UI grids, scrolling, and pagination limits.`,
          expert_rating: parseFloat((Math.random() * 2 + 3).toFixed(1)), // Between 3.0 and 5.0
          community_rating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
          total_reviews: Math.floor(Math.random() * 5000),
          difficulty_level: ['Beginner', 'Intermediate', 'Advanced'][Math.floor(Math.random() * 3)],
          tags: ['DUMMY_TEST_DATA'], // We use this tag to safely delete them later
          is_featured: false,
          is_editors_pick: false,
          is_bestseller: Math.random() > 0.8, // 20% chance of being a bestseller
        });
      }
    }

    // Insert in batches of 500 to avoid Supabase limits
    for (let i = 0; i < dummyBooks.length; i += 500) {
      const batch = dummyBooks.slice(i, i + 500);
      const { error } = await supabase.from('books').insert(batch);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully injected ${dummyBooks.length} test books! You can now browse the UI to see dense grids. To remove them, use ?action=remove` 
    });
  }

  if (action === 'remove') {
    // Delete all books that have 'DUMMY_TEST_DATA' in their tags array
    const { error, count } = await supabase
      .from('books')
      .delete()
      .contains('tags', ['DUMMY_TEST_DATA']);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'All dummy test books have been successfully removed from the database!',
      deleted_count: count
    });
  }

  return NextResponse.json({ 
    message: 'Test Data API is ready.', 
    instructions: {
      add: 'Go to /api/test-data?action=add to generate thousands of test books',
      remove: 'Go to /api/test-data?action=remove to delete all test books'
    }
  });
}
