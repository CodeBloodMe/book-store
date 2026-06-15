'use client';

import { useActionState, useState } from 'react';
import type { Review } from '@/types/database';
import { submitReview } from '@/app/actions/reviews';
import RatingStars from '@/components/ui/RatingStars';

interface UserReviewsProps {
  bookId: string;
  initialReviews: Review[];
  currentUserId: string | null;
}

export default function UserReviews({ bookId, initialReviews, currentUserId }: UserReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(submitReview, null);

  const avgRating = reviews.length > 0 
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
    : 0;

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 mt-8">
      <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
        <h2 className="font-bold text-gray-900 font-serif text-2xl">Reader Reviews</h2>
        
        {reviews.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-gray-900">
              {avgRating.toFixed(1)} <span className="text-gray-400 text-sm font-normal">/ 5.0</span>
            </span>
            <div className="flex text-indigo-500">
              <RatingStars rating={Math.round(avgRating)} size="sm" />
            </div>
          </div>
        )}
      </div>

      {!isFormOpen ? (
        <div className="mb-8 flex justify-end">
          <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-indigo-50 text-indigo-700 font-semibold rounded-xl px-5 py-2.5 hover:bg-indigo-100 transition-colors flex items-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
            Write a Review
          </button>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4">Leave your review</h3>
          <form action={async (formData) => {
            formData.append('bookId', bookId);
            const result = await submitReview(null, formData);
            if (result.success) {
              setIsFormOpen(false);
              // Optimistic update for simple UX (in a real app, revalidatePath handles data refresh, 
              // but we need to fetch the new reviews or just append optimistically)
              const newReview: Review = {
                id: Math.random().toString(),
                book_id: bookId,
                user_id: currentUserId,
                reviewer_name: formData.get('reviewerName') as string,
                rating: parseInt(formData.get('rating') as string, 10),
                content: formData.get('content') as string,
                created_at: new Date().toISOString(),
              };
              setReviews([newReview, ...reviews]);
            } else if (result.error) {
              alert(result.error);
            }
          }} className="flex flex-col gap-4">
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Your Name</label>
                <input 
                  type="text" 
                  name="reviewerName" 
                  required 
                  placeholder="e.g. Alex"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Rating</label>
                <select 
                  name="rating" 
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                >
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Very Good</option>
                  <option value="3">3 - Average</option>
                  <option value="2">2 - Poor</option>
                  <option value="1">1 - Terrible</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Your Review</label>
              <textarea 
                name="content" 
                required 
                rows={4}
                placeholder="What did you think about this book?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
              ></textarea>
            </div>

            {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}

            <div className="flex items-center justify-end gap-3 mt-2">
              <button 
                type="button" 
                onClick={() => setIsFormOpen(false)}
                className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isPending}
                className="bg-indigo-600 text-white font-semibold rounded-lg px-6 py-2.5 hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Review List */}
      {reviews.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500">No reviews yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {reviews.map((review) => (
            <div key={review.id} className="pb-6 border-b border-gray-50 last:border-0 last:pb-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase">
                    {review.reviewer_name.slice(0, 2)}
                  </div>
                  <span className="font-bold text-gray-900">{review.reviewer_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex text-amber-400">
                    <RatingStars rating={review.rating} size="sm" />
                  </div>
                  <span className="text-xs text-gray-400 ml-2">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                  {currentUserId && review.user_id === currentUserId && (
                    <button 
                      onClick={async () => {
                        if (confirm('Are you sure you want to delete this review?')) {
                          setReviews(reviews.filter(r => r.id !== review.id));
                          await import('@/app/actions/reviews').then(m => m.deleteReview(review.id, bookId));
                        }
                      }}
                      className="ml-2 text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
                      title="Delete review"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                  )}
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mt-3 pl-11">
                {review.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
