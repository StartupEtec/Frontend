import { useCallback, useEffect, useState } from 'react';
import { WorkerReview } from '../types/rating';
import { ratingService, REVIEWS_PAGE_SIZE } from '../services/ratingService';
import { ApiError } from '../services/api';

export type WorkerReviewsStatus = 'loading' | 'success' | 'error';

function reviewsErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.message) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return 'No pudimos cargar las reseñas. Reintentá.';
}

/** Agrega reseñas nuevas sin duplicar las que ya estaban en pantalla. */
function mergeUnique(current: WorkerReview[], next: WorkerReview[]): WorkerReview[] {
  const seen = new Set(current.map((review) => review.id));
  const merged = [...current];
  for (const review of next) {
    if (!seen.has(review.id)) {
      seen.add(review.id);
      merged.push(review);
    }
  }
  return merged;
}

/**
 * Carga las reseñas de un usuario con paginación (GET /users/:id/ratings).
 *
 * La primera página se pide al montar la pantalla porque el total alimenta
 * el contador del tab. "Ver más" agrega la página siguiente sin vaciar lo
 * que ya se ve; si esa carga falla, se conserva la lista y se muestra un
 * error aparte.
 */
export const useWorkerReviews = (userId: string) => {
  const [reviews, setReviews] = useState<WorkerReview[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [status, setStatus] = useState<WorkerReviewsStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    setLoadMoreError(null);
    try {
      const result = await ratingService.listByUser(userId, {
        limit: REVIEWS_PAGE_SIZE,
        offset: 0,
      });
      setReviews(result.ratings);
      setTotal(result.count);
      setStatus('success');
    } catch (err: unknown) {
      setReviews([]);
      setTotal(null);
      setError(reviewsErrorMessage(err));
      setStatus('error');
    }
  }, [userId]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    if (total != null && reviews.length >= total) return;

    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const result = await ratingService.listByUser(userId, {
        limit: REVIEWS_PAGE_SIZE,
        offset: reviews.length,
      });
      setReviews((current) => mergeUnique(current, result.ratings));
      setTotal(result.count);
    } catch (err: unknown) {
      setLoadMoreError(reviewsErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, reviews.length, total, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    reviews,
    total,
    status,
    error,
    loadingMore,
    loadMoreError,
    hasMore: total != null && reviews.length < total,
    reload: load,
    loadMore,
  };
};

export default useWorkerReviews;
