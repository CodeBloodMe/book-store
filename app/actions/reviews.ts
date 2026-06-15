'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Review } from '@/types/database';

export async function getReviewsForBook(bookId: string): Promise<Review[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('book_id', bookId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }

  return data as Review[];
}

export async function submitReview(prevState: any, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const bookId = formData.get('bookId') as string;
  const rating = parseInt(formData.get('rating') as string, 10);
  const content = formData.get('content') as string;
  
  // Use the logged in user's email prefix as name, or the provided one if anonymous
  const rawReviewerName = formData.get('reviewerName') as string;
  const reviewerName = user ? (user.email?.split('@')[0] || 'User') : rawReviewerName;

  if (!bookId || !reviewerName || !rating || !content) {
    return { error: 'All fields are required.' };
  }

  if (rating < 1 || rating > 5) {
    return { error: 'Rating must be between 1 and 5.' };
  }

  if (reviewerName.trim().length < 2) {
    return { error: 'Name is too short.' };
  }

  if (content.trim().length < 10) {
    return { error: 'Review is too short. Please write at least 10 characters.' };
  }

  const { error } = await supabase
    .from('reviews')
    .insert({
      book_id: bookId,
      user_id: user ? user.id : null,
      reviewer_name: reviewerName.trim(),
      rating,
      content: content.trim(),
    });

  if (error) {
    console.error('Error submitting review:', error);
    return { error: 'Failed to submit review. Please try again later.' };
  }

  revalidatePath(`/books/${bookId}`);
  return { success: true };
}

export async function deleteReview(reviewId: string, bookId: string) {
  if (!reviewId) return { error: 'Review ID is required.' };
  
  const supabase = await createClient();
  // RLS policies will ensure only the author can delete their review
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId);

  if (error) {
    console.error('Error deleting review:', error);
    return { error: 'Failed to delete review.' };
  }

  revalidatePath(`/books/${bookId}`);
  return { success: true };
}
