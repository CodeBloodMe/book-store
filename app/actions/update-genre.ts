'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function updateBookGenre(bookId: string, newGenreId: string) {
  const { error } = await supabase
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
