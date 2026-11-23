import { chatService } from '../../src/services/chatService';
import { apiClient } from '../../src/services/api';

jest.mock('../../src/services/api', () => ({
  apiClient: jest.fn(),
}));

const mockApiClient = apiClient as jest.Mock;

describe('chatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClient.mockResolvedValue({
      chats: [],
      count: 0,
      limit: 20,
      offset: 0,
    });
  });

  it('queries GET /users/me/chats with limit, offset, status and search', async () => {
    await chatService.list({ limit: 20, offset: 0, status: 'all', search: 'juan' });

    const [url] = mockApiClient.mock.calls[0];
    expect(url).toBe('/users/me/chats?limit=20&offset=0&status=all&search=juan');
    expect(mockApiClient).toHaveBeenCalledWith(expect.stringContaining('/users/me/chats'), {
      method: 'GET',
    });
  });

  it('uses default page size when no params are provided', async () => {
    await chatService.list();

    const [url] = mockApiClient.mock.calls[0];
    expect(url).toBe('/users/me/chats?limit=20&offset=0&status=all');
    expect(mockApiClient).toHaveBeenCalledWith(expect.stringContaining('/users/me/chats'), {
      method: 'GET',
    });
  });

  it('normalizes an unexpected body to an empty chats list', async () => {
    mockApiClient.mockResolvedValue({} as never);

    const result = await chatService.list();

    expect(result.chats).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('propagates api errors', async () => {
    const failure = new Error('offline');
    mockApiClient.mockRejectedValueOnce(failure);

    await expect(chatService.list()).rejects.toThrow('offline');
  });
});
