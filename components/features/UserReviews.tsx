'use client';

import { useActionState, useState } from 'react';
import type { Review } from '@/types/database';
import { submitReview } from '@/app/actions/reviews';
import RatingStars from '@/components/ui/RatingStars';
import { Star, AlertCircle } from 'lucide-react';

interface UserReviewsProps {
  bookId: string;
  initialReviews: Review[];
  currentUserId: string | null;
}

/** Interactive star rating selector */
function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="p-0.5 transition-transform hover:scale-110"
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          <Star
            size={24}
            fill={(hovered || value) >= star ? '#f59e0b' : 'none'}
            stroke={(hovered || value) >= star ? '#f59e0b' : '#d1d5db'}
            strokeWidth={2}
            className="transition-colors"
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm font-semibold text-gray-600">
          {value === 5 ? 'Excellent' : value === 4 ? 'Very Good' : value === 3 ? 'Average' : value === 2 ? 'Poor' : 'Terrible'}
        </span>
      )}
    </div>
  );
}

const MAX_REVIEW_LENGTH = 2000;

export default function UserReviews({ bookId, initialReviews, currentUserId }: UserReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(submitReview, null);
  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const avgRating = reviews.length > 0 
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
    : 0;

  const charCount = reviewContent.length;

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
        <h2 className="font-bold text-gray-900 font-serif text-2xl">Reader Reviews</h2>
        
        {reviews.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-gray-900">
              {avgRating.toFixed(1)} <span className="text-gray-400 text-sm font-normal">/ 5.0</span>
            </span>
            <div className="flex text-gray-500">
              <RatingStars rating={Math.round(avgRating)} size="sm" />
            </div>
          </div>
        )}
      </div>

      {!isFormOpen ? (
        <div className="mb-8 flex justify-end">
          <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-gray-50 text-gray-700 font-semibold rounded-xl px-5 py-2.5 hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
            Write a Review
          </button>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4">Leave your review</h3>
          <form action={async (formData) => {
            setFormError(null);
            formData.append('bookId', bookId);
            formData.append('rating', String(selectedRating));
            
            // Client-side validation
            const name = formData.get('reviewerName') as string;
            const content = formData.get('content') as string;
            
            if (!name || name.trim().length < 2) {
              setFormError('Please enter your name (at least 2 characters).');
              return;
            }
            if (!content || content.trim().length < 10) {
              setFormError('Please write a review with at least 10 characters.');
              return;
            }
            if (content.length > MAX_REVIEW_LENGTH) {
              setFormError(`Review is too long. Maximum ${MAX_REVIEW_LENGTH} characters.`);
              return;
            }
            if (selectedRating < 1 || selectedRating > 5) {
              setFormError('Please select a rating.');
              return;
            }

            const result = await submitReview(null, formData);
            if (result.success) {
              setIsFormOpen(false);
              setReviewContent('');
              setSelectedRating(5);
              // Optimistic update
              const newReview: Review = {
                id: Math.random().toString(),
                book_id: bookId,
                user_id: currentUserId,
                reviewer_name: name,
                rating: selectedRating,
                content: content,
                created_at: new Date().toISOString(),
                source: 'local',
                external_author_name: null,
                external_author_image_url: null,
              };
              setReviews([newReview, ...reviews]);
            } else if (result.error) {
              setFormError(result.error);
            }
          }} className="flex flex-col gap-4">
            
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Your Name</label>
              <input 
                type="text" 
                name="reviewerName" 
                required 
                minLength={2}
                maxLength={50}
                placeholder="e.g. Alex"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:outline-none bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Rating</label>
              <StarRatingInput value={selectedRating} onChange={setSelectedRating} />
              {/* Hidden input for form submission */}
              <input type="hidden" name="rating" value={selectedRating} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-700 uppercase">Your Review</label>
                <span className={`text-xs font-medium ${charCount > MAX_REVIEW_LENGTH ? 'text-red-500' : charCount > MAX_REVIEW_LENGTH * 0.9 ? 'text-amber-500' : 'text-gray-400'}`}>
                  {charCount}/{MAX_REVIEW_LENGTH}
                </span>
              </div>
              <textarea 
                name="content" 
                required 
                rows={4}
                minLength={10}
                maxLength={MAX_REVIEW_LENGTH}
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                placeholder="What did you think about this book? Be specific — your review helps other readers!"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:outline-none resize-none bg-white"
              ></textarea>
            </div>

            {/* Inline Error Display (replaces alert()) */}
            {(formError || state?.error) && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{formError || state?.error}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-2">
              <button 
                type="button" 
                onClick={() => { setIsFormOpen(false); setFormError(null); setReviewContent(''); }}
                className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isPending || charCount > MAX_REVIEW_LENGTH}
                className="bg-gray-900 text-white font-semibold rounded-lg px-6 py-2.5 hover:bg-gray-800 transition-colors disabled:opacity-50 shadow-sm"
              >
                {isPending ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Review List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 mt-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-4 text-gray-400">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <h3 className="font-bold text-gray-900 mb-2">No Reviews Yet</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
            Be the first to share your thoughts on this book. Your review helps other readers decide what to read next!
          </p>
          {!isFormOpen && (
            <button 
              onClick={() => setIsFormOpen(true)}
              className="bg-gray-900 text-white font-semibold rounded-lg px-6 py-2.5 hover:bg-gray-800 transition-colors shadow-sm"
            >
              Write the first review
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {reviews.map((review) => (
            <div key={review.id} className="pb-6 border-b border-gray-50 last:border-0 last:pb-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {review.external_author_image_url ? (
                    <img 
                      src={review.external_author_image_url} 
                      alt={review.reviewer_name}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-emerald-700 font-bold text-xs uppercase">
                      {review.reviewer_name.slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-gray-900 block">{review.external_author_name || review.reviewer_name}</span>
                    {review.source === 'goodreads' && (
                      <span className="text-xs text-gray-500">via Goodreads</span>
                    )}
                  </div>
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
