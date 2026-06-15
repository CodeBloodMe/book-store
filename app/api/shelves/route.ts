import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { bookId, status } = await request.json();
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('user_shelves')
      .upsert({ 
        user_id: user.id, 
        book_id: bookId, 
        status: status || 'want_to_read',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, book_id' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!bookId) {
      return NextResponse.json({ error: 'Book ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_shelves')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', bookId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
