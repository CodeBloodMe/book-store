/* eslint-disable @typescript-eslint/no-explicit-any */
import { Book } from '@/types/database';

function decodeHTMLEntities(text: string): string {
  const entities: { [key: string]: string } = {
    '&#xa0;': ' ',
    '&nbsp;': ' ',
    '&quot;': '"',
    '&#39;': "'",
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&#8211;': '–',
    '&#8212;': '—',
    '&#8216;': "'",
    '&#8217;': "'",
    '&#8220;': '"',
    '&#8221;': '"',
    '&#x27;': "'",
  };
  return text.replace(/&#?[a-z0-9]+;/gi, (match) => {
    return entities[match.toLowerCase()] || match;
  });
}

// ── 1. Google Books API Integration ──
export async function searchGoogleBooks(query: string): Promise<Partial<Book>[]> {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    
    const data = await res.json();
    if (!data.items) return [];

    return data.items.map((item: any) => ({
      id: `ext_google_${item.id}`,
      title: item.volumeInfo.title || 'Unknown Title',
      author: item.volumeInfo.authors?.slice(0, 2).join(', ') + (item.volumeInfo.authors?.length > 2 ? ' et al.' : '') || 'Unknown Author',
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

// ── 1.5. Apple Books API Integration ──
export async function searchAppleBooks(query: string): Promise<Partial<Book>[]> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=ebook&limit=10`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    
    const data = await res.json();
    if (!data.results) return [];

    return data.results.map((doc: any) => {
      let description = doc.description || '';
      description = description.replace(/<[^>]*>?/gm, ''); // Strip HTML
      description = decodeHTMLEntities(description);
      
      return {
        id: `ext_apple_${doc.trackId}`,
        title: doc.trackName || 'Unknown Title',
        author: doc.artistName || 'Unknown Author',
        cover_image_url: doc.artworkUrl100 ? doc.artworkUrl100.replace('100x100bb', '600x600bb') : '/placeholder-book.png',
        community_rating: doc.averageUserRating || 0,
        description: description,
        external_id: `apple:${doc.trackId}`,
      };
    });
  } catch (err) {
    console.warn('Apple Books search failed:', err);
    return [];
  }
}

// ── 2. OpenLibrary API Integration ──
export async function searchOpenLibrary(query: string): Promise<Partial<Book>[]> {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`;
    const res = await fetch(url, { 
      cache: 'no-store',
      headers: { 'User-Agent': 'MyBooksSite/1.0 (admin@mybookssite.com)' }
    });
    if (!res.ok) return [];
    
    const data = await res.json();
    if (!data.docs) return [];

    return data.docs.map((doc: any) => ({
      id: `ext_ol_${doc.key.replace('/works/', '')}`,
      title: doc.title || 'Unknown Title',
      author: doc.author_name?.slice(0, 2).join(', ') + (doc.author_name?.length > 2 ? ' et al.' : '') || 'Unknown Author',
      cover_image_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : '/placeholder-book.png',
      community_rating: 0, // OL rarely has ratings in search
      description: '', // OpenLibrary search doesn't return full descriptions easily
      external_id: `ol:${doc.key.replace('/works/', '')}`,
      isbn: doc.isbn && doc.isbn.length > 0 ? doc.isbn[0] : null,
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
        tags: data.volumeInfo.categories || [], // Map Google Books categories to tags
        free_reading_url: data.accessInfo?.epub?.isAvailable && data.accessInfo?.epub?.downloadLink ? data.accessInfo.epub.downloadLink : null,
      };
    } catch {
      return null;
    }
  }

  if (source === 'ol') {
    try {
      // First get work details for description
      const url = `https://openlibrary.org/works/${id}.json`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'MyBooksSite/1.0 (admin@mybookssite.com)' }
      });
      if (!res.ok) return null;
      const data = await res.json();
      
      const description = typeof data.description === 'string' 
        ? data.description 
        : data.description?.value || '';

      // Get cover from search since works API doesn't always have simple cover IDs
      const searchRes = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(data.title)}&limit=1`, {
        headers: { 'User-Agent': 'MyBooksSite/1.0 (admin@mybookssite.com)' }
      });
      const searchData = await searchRes.json();
      const doc = searchData.docs?.[0] || {};

      return {
        title: data.title || 'Unknown Title',
        author: doc.author_name?.join(', ') || 'Unknown Author',
        cover_image_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : '/placeholder-book.png',
        community_rating: 0,
        description: description,
        external_id: externalId,
        tags: doc.subject ? doc.subject.slice(0, 5) : [], // Map OpenLibrary subjects to tags
      };
    } catch {
      return null;
    }
  }

  if (source === 'apple') {
    try {
      const url = `https://itunes.apple.com/lookup?id=${id}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.results || data.results.length === 0) return null;
      
      const doc = data.results[0];
      let description = doc.description || '';
      description = description.replace(/<[^>]*>?/gm, ''); // Strip HTML
      description = decodeHTMLEntities(description);
      
      return {
        title: doc.trackName || 'Unknown Title',
        author: doc.artistName || 'Unknown Author',
        cover_image_url: doc.artworkUrl100 ? doc.artworkUrl100.replace('100x100bb', '600x600bb') : '/placeholder-book.png',
        community_rating: doc.averageUserRating || 0,
        description: description,
        external_id: externalId,
        tags: doc.genres || [],
      };
    } catch {
      return null;
    }
  }

  return null;
}

// ── 4. On-Demand Lazy Import Engine ──
import { supabase } from './supabase';

async function downloadAndUploadEpubToSupabase(downloadUrl: string, bookTitle: string): Promise<string | null> {
  try {
    // 1. Download the file
    const res = await fetch(downloadUrl);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    // In Next.js server components, we can use Buffer
    const buffer = Buffer.from(arrayBuffer);

    // 2. Generate a clean filename
    const cleanTitle = bookTitle.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const filename = `${cleanTitle}-${Date.now()}.epub`;

    // 3. Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('free-books')
      .upload(filename, buffer, {
        contentType: 'application/epub+zip',
        upsert: false
      });

    if (error || !data) {
      console.error('Supabase upload error:', error);
      return null;
    }

    // 4. Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('free-books')
      .getPublicUrl(filename);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Failed to download/upload EPUB:', err);
    return null;
  }
}

async function determineBestGenre(
  title: string,
  description: string,
  tags: string[],
  genres: { id: string; name: string; slug: string }[]
): Promise<string | null> {
  // 1. Keyword Matching Fast Path
  const combinedText = [...tags, title].join(' ').toLowerCase();
  for (const g of genres) {
    if (g.slug === 'global-catalog') continue;
    const kw = g.name.toLowerCase().replace(/&/g, '').split(/\s+/).filter(w => w.length > 3);
    for (const word of kw) {
      if (combinedText.includes(word)) {
        return g.id;
      }
    }
  }

  // 2. AI Fallback (using Groq for high speed)
  if (process.env.GROQ_API_KEY) {
    try {
      const genreList = genres.map(g => `${g.name} (slug: ${g.slug})`).join(', ');
      const prompt = `You are an expert librarian categorizing a new book into exactly one genre.
Book Title: "${title}"
Description: "${description?.slice(0, 500)}"
Categories/Tags: ${tags.join(', ')}

Available genres: ${genreList}

Return ONLY the genre slug that best fits this book. No explanation, no markdown, just the slug string. If none fit well, return "global-catalog".`;

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiSlug = data.choices[0]?.message?.content?.trim()?.toLowerCase() || '';
        const matched = genres.find(g => g.slug === aiSlug);
        if (matched) return matched.id;
      }
    } catch (e) {
      console.warn('AI Genre guess failed, falling back...', e);
    }
  }

  // 3. Fallback
  const fallback = genres.find(g => g.slug === 'global-catalog');
  if (fallback) return fallback.id;
  
  // 4. Absolute Fallback (if migration not run)
  return genres.length > 0 ? genres[0].id : null;
}

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

  // 3. Fetch all active genres and pick the best one automatically
  const { data: genres } = await supabase
    .from('genres')
    .select('id, name, slug');

  const finalGenreId = await determineBestGenre(
    bookDetails.title || '',
    bookDetails.description || '',
    bookDetails.tags || [],
    genres || []
  );

  if (!finalGenreId) return null; // Safety check

  // 3.5. Download and Upload EPUB if available
  let finalReadingUrl = null;
  if (bookDetails.free_reading_url && bookDetails.free_reading_url.startsWith('http')) {
    finalReadingUrl = await downloadAndUploadEpubToSupabase(bookDetails.free_reading_url, bookDetails.title || 'book');
  }

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
      genre_id: finalGenreId,
      external_id: externalIdString,
      free_reading_url: finalReadingUrl,
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

// ── 5. Fetch Author Image (Wikipedia API) ──
export async function fetchAuthorImage(authorName: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&titles=${encodeURIComponent(authorName)}&pithumbsize=500&format=json`;
    // We intentionally allow this to be cached by Next.js since Wikipedia images rarely change
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    
    const pageId = Object.keys(pages)[0];
    if (pageId === '-1') return null; // Not found
    
    return pages[pageId].thumbnail?.source || null;
  } catch (err) {
    console.warn('Wikipedia image fetch failed:', err);
    return null;
  }
}

// ── 6. Fetch Author Bio (Wikipedia API) ──
export async function fetchAuthorBioFromWikipedia(authorName: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(authorName)}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    
    const pageId = Object.keys(pages)[0];
    if (pageId === '-1') return null; // Not found
    
    const extract = pages[pageId].extract;
    // Check if it's a disambiguation page (often starts with "X may refer to:")
    if (!extract || extract.includes('may refer to:')) {
      return null;
    }
    
    return extract;
  } catch (err) {
    console.warn('Wikipedia bio fetch failed:', err);
    return null;
  }
}
