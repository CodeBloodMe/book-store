/* eslint-disable @typescript-eslint/no-explicit-any */
import { Book } from '@/types/database';

// ── 1. Google Books API Integration ──
export async function searchGoogleBooks(query: string): Promise<Partial<Book>[]> {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`;
    const res = await fetch(url);
    if (!res.ok) return [];
    
    const data = await res.json();
    if (!data.items) return [];

    return data.items.map((item: any) => ({
      id: `ext_google_${item.id}`,
      title: item.volumeInfo.title || 'Unknown Title',
      author: item.volumeInfo.authors?.join(', ') || 'Unknown Author',
      cover_image_url: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || '/placeholder-book.png',
      community_rating: item.volumeInfo.averageRating || 0,
      description: item.volumeInfo.description || '',
      external_id: `google:${item.id}`,
    }));
  } catch (err) {
    console.warn('Google Books search failed:', err);
    return [];
  }
}

// ── 2. OpenLibrary API Integration ──
export async function searchOpenLibrary(query: string): Promise<Partial<Book>[]> {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`;
    const res = await fetch(url);
    if (!res.ok) return [];
    
    const data = await res.json();
    if (!data.docs) return [];

    return data.docs.map((doc: any) => ({
      id: `ext_ol_${doc.key.replace('/works/', '')}`,
      title: doc.title || 'Unknown Title',
      author: doc.author_name?.join(', ') || 'Unknown Author',
      cover_image_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : '/placeholder-book.png',
      community_rating: 0, // OL rarely has ratings in search
      description: '', // OpenLibrary search doesn't return full descriptions easily
      external_id: `ol:${doc.key.replace('/works/', '')}`,
    }));
  } catch (err) {
    console.warn('OpenLibrary search failed:', err);
    return [];
  }
}

// ── 3. Fetch Single External Book Details (for Import) ──
export async function fetchExternalBookDetails(externalId: string): Promise<Partial<Book> | null> {
  const [source, id] = externalId.split(':');

  if (source === 'google') {
    try {
      const url = `https://www.googleapis.com/books/v1/volumes/${id}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return {
        title: data.volumeInfo.title || 'Unknown Title',
        author: data.volumeInfo.authors?.join(', ') || 'Unknown Author',
        cover_image_url: data.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || '/placeholder-book.png',
        community_rating: data.volumeInfo.averageRating || 0,
        description: data.volumeInfo.description || '',
        external_id: externalId,
      };
    } catch {
      return null;
    }
  }

  if (source === 'ol') {
    try {
      // First get work details for description
      const url = `https://openlibrary.org/works/${id}.json`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      
      const description = typeof data.description === 'string' 
        ? data.description 
        : data.description?.value || '';

      // Get cover from search since works API doesn't always have simple cover IDs
      const searchRes = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(data.title)}&limit=1`);
      const searchData = await searchRes.json();
      const doc = searchData.docs?.[0] || {};

      return {
        title: data.title || 'Unknown Title',
        author: doc.author_name?.join(', ') || 'Unknown Author',
        cover_image_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : '/placeholder-book.png',
        community_rating: 0,
        description: description,
        external_id: externalId,
      };
    } catch {
      return null;
    }
  }

  return null;
}

// ── 4. On-Demand Lazy Import Engine ──
import { supabase } from './supabase';

export async function fetchAndImportExternalBook(extId: string): Promise<string | null> {
  // extId format: ext_google_12345 or ext_ol_OL12345W
  const idParts = extId.replace('ext_', '').split('_');
  const source = idParts[0]; // 'google' or 'ol'
  const realId = idParts.slice(1).join('_');
  const externalIdString = `${source}:${realId}`;

  // 1. Check if already imported
  const { data: existing } = await supabase
    .from('books')
    .select('id')
    .eq('external_id', externalIdString)
    .single();

  if (existing?.id) {
    return existing.id;
  }

  // 2. Fetch full details from external API
  const bookDetails = await fetchExternalBookDetails(externalIdString);
  if (!bookDetails) return null;

  // 3. Get the "Global Catalog" genre ID
  const { data: genre } = await supabase
    .from('genres')
    .select('id')
    .eq('slug', 'global-catalog')
    .single();

  if (!genre?.id) return null; // Safety check

  // 4. Insert into database
  const { data: newBook, error } = await supabase
    .from('books')
    .insert({
      title: bookDetails.title,
      author: bookDetails.author,
      description: bookDetails.description,
      cover_image_url: bookDetails.cover_image_url,
      community_rating: bookDetails.community_rating,
      expert_rating: 0, // No expert rating yet
      genre_id: genre.id,
      external_id: externalIdString,
      is_bestseller: false,
      is_editors_pick: false,
      is_featured: false,
    })
    .select('id')
    .single();

  if (error || !newBook) {
    console.error('Failed to import external book:', error);
    return null;
  }

  return newBook.id;
}
