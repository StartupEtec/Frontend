import { act, renderHook } from '@testing-library/react-native';
import { useQuoteRequest } from '../../src/hooks/useQuoteRequest';
import { apiClient } from '../../src/services/api';

jest.mock('../../src/services/api', () => ({
  apiClient: jest.fn(),
}));

const mockApiClient = apiClient as jest.Mock;

describe('useQuoteRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends quote request and returns the response', async () => {
    const mockResponse = {
      id: 'qr-1',
      client_id: 'client-1',
      worker_id: 'worker-100',
      category_id: 'category-1',
      category_name: 'Plomería',
      category: 'Plomería',
      location_id: 'location-1',
      location_address: 'Av. Siempre Viva 123',
      location: 'Av. Siempre Viva 123',
      description: 'Reparar fuga',
      status: 'PENDING',
      order_id: null,
      created_at: '2026-11-24T10:00:00Z',
      updated_at: '2026-11-24T10:00:00Z',
    };

    mockApiClient.mockResolvedValue({ quote_request: mockResponse });

    const { result } = renderHook(() => useQuoteRequest());

    let response: any;
    await act(async () => {
      response = await result.current.requestQuote({
        worker_id: 'worker-100',
        category_id: 'category-1',
        location_id: 'location-1',
        description: 'Reparar fuga',
      });
    });

    expect(response).toEqual(mockResponse);
    expect(mockApiClient).toHaveBeenCalledWith(
      '/quote-requests/requests',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          worker_id: 'worker-100',
          category_id: 'category-1',
          location_id: 'location-1',
          description: 'Reparar fuga',
        }),
      })
    );
    expect(result.current.isSending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error when request fails', async () => {
    mockApiClient.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useQuoteRequest());

    await act(async () => {
      await expect(
        result.current.requestQuote({
          worker_id: 'worker-100',
          category_id: 'category-1',
          location_id: 'location-1',
        })
      ).rejects.toThrow('Network error');
    });

    expect(result.current.isSending).toBe(false);
    expect(result.current.error).toBe('Network error');
  });

  it('resets error', () => {
    const { result } = renderHook(() => useQuoteRequest());

    act(() => {
      result.current.resetError();
    });

    expect(result.current.error).toBeNull();
  });
});
