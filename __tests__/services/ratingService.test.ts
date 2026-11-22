import { ratingService, REVIEWS_PAGE_SIZE } from '../../src/services/ratingService';
import { apiClient } from '../../src/services/api';

jest.mock('../../src/services/api', () => ({
  apiClient: jest.fn(),
}));

const mockApiClient = apiClient as jest.Mock;

describe('ratingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClient.mockResolvedValue({
      ratings: [],
      count: 0,
      limit: 20,
      offset: 0,
    });
  });

  it('queries GET /users/:id/ratings with limit and offset', async () => {
    await ratingService.listByUser('user-456', { limit: 20, offset: 0 });

    expect(mockApiClient).toHaveBeenCalledWith('/users/user-456/ratings?limit=20&offset=0', {
      method: 'GET',
    });
  });

  it('uses default page size when no params are provided', async () => {
    await ratingService.listByUser('user-456');

    expect(mockApiClient).toHaveBeenCalledWith(
      `/users/user-456/ratings?limit=${REVIEWS_PAGE_SIZE}&offset=0`,
      { method: 'GET' }
    );
  });

  it('normalizes an unexpected body to an empty reviews list', async () => {
    mockApiClient.mockResolvedValue({} as never);

    const result = await ratingService.listByUser('user-456');

    expect(result.ratings).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('propagates api errors', async () => {
    const failure = new Error('offline');
    mockApiClient.mockRejectedValueOnce(failure);

    await expect(ratingService.listByUser('user-456')).rejects.toThrow('offline');
  });
});
