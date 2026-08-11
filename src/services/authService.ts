import { apiClient } from './api';
import { RegisterApiPayload, RegisterApiResponse } from '../types/auth';

export const authService = {
  /**
   * Register a new user
   * POST /auth/register
   */
  async register(payload: RegisterApiPayload): Promise<RegisterApiResponse> {
    return apiClient<RegisterApiResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
