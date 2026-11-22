import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useWorkerReviews } from '../../src/hooks/useWorkerReviews';
import { ratingService } from '../../src/services/ratingService';
import { WorkerReview } from '../../src/types/rating';

jest.mock('../../src/services/ratingService', () => ({
  ratingService: { listByUser: jest.fn() },
  REVIEWS_PAGE_SIZE: 20,
}));

const listByUser = ratingService.listByUser as jest.Mock;

const makeReview = (overrides: Partial<WorkerReview> = {}): WorkerReview => ({
  id: 'r-1',
  order_id: 'o-1',
  rater_id: 'user-100',
  ratee_id: 'user-456',
  rating_stars: 5,
  review_text: 'Muy buena profesional.',
  created_at: '2026-11-20T10:00:00Z',
  rater: { user_id: 'user-100', full_name: 'Luis Gómez', avatar_url: null },
  ...overrides,
});

const responseFor = (reviews: WorkerReview[]) => ({
  ratings: reviews,
  count: reviews.length,
  limit: 20,
  offset: 0,
});

describe('useWorkerReviews', () => {
  beforeEach(() => {
    listByUser.mockReset();
  });

  it('loads the first page on mount', async () => {
    listByUser.mockResolvedValue(responseFor([makeReview()]));

    const { result } = renderHook(() => useWorkerReviews('user-456'));

    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.reviews).toHaveLength(1);
    expect(result.current.total).toBe(1);
    expect(listByUser).toHaveBeenCalledWith('user-456', {
      limit: 20,
      offset: 0,
    });
  });

  it('shows error when the first page fails', async () => {
    listByUser.mockRejectedValueOnce(new Error('offline'));

    const { result } = renderHook(() => useWorkerReviews('user-456'));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBeTruthy();
    expect(result.current.reviews).toEqual([]);
  });

  it('loads more reviews without duplicating existing ones', async () => {
    const first = makeReview({ id: 'r-1' });
    const second = makeReview({ id: 'r-2' });

    // Primera página: count = 2 (hay más), pero solo trae 1 review.
    listByUser.mockResolvedValueOnce({
      ratings: [first],
      count: 2,
      limit: 20,
      offset: 0,
    });
    listByUser.mockResolvedValueOnce(responseFor([second]));

    const { result } = renderHook(() => useWorkerReviews('user-456'));

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.reviews).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);

    // Simular que hay más resultados en la segunda página.
    listByUser.mockResolvedValueOnce({
      ratings: [second],
      count: 2,
      limit: 20,
      offset: 1,
    });

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.reviews).toHaveLength(2));
    expect(listByUser).toHaveBeenLastCalledWith('user-456', {
      limit: 20,
      offset: 1,
    });
  });

  it('does not load more when there are no more reviews', async () => {
    listByUser.mockResolvedValue(responseFor([makeReview(), makeReview({ id: 'r-2' })]));

    const { result } = renderHook(() => useWorkerReviews('user-456'));

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.hasMore).toBe(false);

    act(() => {
      result.current.loadMore();
    });

    // No debería haber llamado nuevamente a la API.
    expect(listByUser).toHaveBeenCalledTimes(1);
  });

  it('reloads the first page when reload is called', async () => {
    listByUser.mockResolvedValue(responseFor([makeReview()]));

    const { result } = renderHook(() => useWorkerReviews('user-456'));

    await waitFor(() => expect(result.current.status).toBe('success'));

    listByUser.mockResolvedValueOnce(responseFor([]));

    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.reviews).toHaveLength(0));
    expect(listByUser).toHaveBeenCalledTimes(2);
  });
});
