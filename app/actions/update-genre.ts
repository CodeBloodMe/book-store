'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/require-role';
import { revalidatePath } from 'next/cache';

export async function updateBookGenre(bookId: string, newGenreId: string) {
  const access = await requireRole(['Admin']);
  if (!access.ok) return { success: false, error: access.error };

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(bookId) || !uuidPattern.test(newGenreId)) {
    return { success: false, error: 'A valid book and genre ID are required.' };
  }

  const { error } = await supabaseAdmin
    .from('books')
    .update({ genre_id: newGenreId })
    .eq('id', bookId);

  if (error) {
    console.error('Failed to update genre:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/books/${bookId}`);
  // We also might want to revalidate the genre pages
  revalidatePath('/genres/[slug]', 'page');
  return { success: true };
}
