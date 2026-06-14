import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ 
      error: 'Please provide a genre slug (e.g. ?slug=web-development)' 
    }, { status: 400 });
  }

  // 1. Get genre from DB
  const { data: genre, error: genreError } = await supabase
    .from('genres')
    .select('id, name')
    .eq('slug', slug)
    .single();

  if (genreError || !genre) {
    return NextResponse.json({ error: `Genre '${slug}' not found in database.` }, { status: 404 });
  }

  // 2. Fetch Top 40 Books from Google Books API
  // Using subject + keyword search for best results
  const query = encodeURIComponent(`subject:${genre.name} OR "${genre.name}"`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=40&langRestrict=en&orderBy=relevance`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Google Books API failed');
    
    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ message: `No books found on Google Books for '${genre.name}'.` });
    }

    // 3. Format books for database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newBooks = data.items.map((item: any) => ({
      genre_id: genre.id,
      title: item.volumeInfo.title || 'Unknown Title',
      author: item.volumeInfo.authors?.join(', ') || 'Unknown Author',
      description: item.volumeInfo.description || `A comprehensive guide exploring ${genre.name}.`,
      cover_image_url: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
      page_count: item.volumeInfo.pageCount || null,
      published_year: item.volumeInfo.publishedDate ? parseInt(item.volumeInfo.publishedDate.substring(0, 4)) : null,
      isbn: item.volumeInfo.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier || 
            item.volumeInfo.industryIdentifiers?.[0]?.identifier || null,
      expert_rating: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)), // Mock expert rating 3.5-5.0
      community_rating: item.volumeInfo.averageRating || parseFloat((Math.random() * 2 + 3).toFixed(1)),
      total_reviews: item.volumeInfo.ratingsCount || Math.floor(Math.random() * 1000),
      difficulty_level: ['Beginner', 'Intermediate', 'Advanced'][Math.floor(Math.random() * 3)],
      external_id: `google:${item.id}`,
      is_featured: false,
      is_editors_pick: false,
      is_bestseller: item.volumeInfo.ratingsCount > 500, // Make highly rated books bestsellers
      tags: ['AUTO_IMPORTED']
    }));

    // 4. Deduplicate against existing books to avoid inserting the same book twice
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const externalIds = newBooks.map((b: any) => b.external_id);
    const { data: existing } = await supabase
      .from('books')
      .select('external_id')
      .in('external_id', externalIds);
      
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingIds = new Set(existing?.map((e: any) => e.external_id) || []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toInsert = newBooks.filter((b: any) => !existingIds.has(b.external_id));

    if (toInsert.length === 0) {
      return NextResponse.json({ 
        message: `All top Google Books for '${genre.name}' are already in your database.` 
      });
    }

    // 5. Insert into Supabase
    const { error: insertError } = await supabase.from('books').insert(toInsert);
    if (insertError) throw insertError;

    return NextResponse.json({ 
      success: true, 
      message: `Successfully imported ${toInsert.length} REAL books for '${genre.name}' from Google Books!` 
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
