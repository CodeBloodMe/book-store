import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BookCard from '@/components/ui/BookCard';
import { BookSummary } from '@/types/database';
import { logout } from '@/app/login/actions';

export default async function MyBooksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch books from user shelves
  const { data: shelves, error } = await supabase
    .from('user_shelves')
    .select('book_id, status')
    .eq('user_id', user.id);

  if (error) {
    return <div className="p-24 text-center text-red-500">Error loading shelves: {error.message}</div>;
  }

  const bookIds = shelves?.map(s => s.book_id) || [];
  let savedBooks: any[] = [];

  if (bookIds.length > 0) {
    const { data: booksData, error: booksError } = await supabase
      .from('books')
      .select(`
        id,
        title,
        author,
        cover_image_url,
        expert_rating,
        difficulty_level,
        is_bestseller,
        genre_id,
        isbn,
        genres (
          id,
          name,
          slug,
          icon,
          color
        )
      `)
      .in('id', bookIds);

    if (!booksError && booksData) {
      savedBooks = booksData;
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] pb-24">
      {/* Header */}
      <div className="bg-[#0a0a0a] text-white pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 
              className="text-5xl md:text-7xl font-black mb-4 uppercase"
              style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.02em' }}
            >
              Saved Books
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl">
              All the books you've saved to your library.
            </p>
          </div>
          <form action={logout}>
            <button className="btn-ghost text-red-400 hover:text-red-300">
              Sign Out
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-12">
        {savedBooks.length === 0 ? (
          <div className="p-16 border-4 border-dashed border-[#0a0a0a] rounded-2xl text-center flex flex-col items-center justify-center">
            <h2 className="text-2xl font-black mb-2 text-[#0a0a0a]">Your library is empty</h2>
            <p className="text-gray-500 font-medium mb-6">Time to discover new books and save them here!</p>
            <a 
              href="/" 
              className="px-6 py-3 font-bold bg-[#f5e642] text-[#0a0a0a] border-2 border-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#0a0a0a] transition-all"
              style={{ borderRadius: '12px' }}
            >
              Explore Books
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {savedBooks.map((b) => <BookCard key={b.id} book={b} />)}
          </div>
        )}
      </div>
    </div>
  );
}
