import { authService } from '../../src/services/authService';
import { apiClient, ApiError } from '../../src/services/api';

jest.mock('../../src/services/api', () => {
  const original = jest.requireActual('../../src/services/api');
  return {
    ...original,
    apiClient: jest.fn(),
  };
});

describe('authService', () => {
  it('calls apiClient with POST /auth/register and payload', async () => {
    (apiClient as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'OK',
    });

    const payload = {
      email: 'juan@example.com',
      phone: '+5491122334455',
      password: 'Password123!',
    };

    const res = await authService.register(payload);

    expect(apiClient).toHaveBeenCalledWith('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(res).toEqual({ success: true, message: 'OK' });
  });
});
