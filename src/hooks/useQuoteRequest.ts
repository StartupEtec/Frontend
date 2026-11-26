import { useState } from 'react';
import { apiClient } from '../services/api';

export interface QuoteRequestData {
  worker_id: string;
  category_id: string;
  location_id: string | null;
  description?: string | null;
}

export interface QuoteRequestResponse {
  id: string;
  client_id: string;
  worker_id: string;
  category_id: string;
  category_name: string | null;
  category: string | null;
  location_id: string | null;
  location_address: string | null;
  location: string | null;
  description: string | null;
  status: string;
  order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UseQuoteRequestReturn {
  requestQuote: (data: QuoteRequestData) => Promise<QuoteRequestResponse>;
  isSending: boolean;
  error: string | null;
  resetError: () => void;
}

/**
 * Hook para solicitar una cotización desde el chat hacia un trabajador.
 *
 * Envía una solicitud al backend vía POST /api/v1/quote-requests/requests.
 * El trabajador recibirá una notificación y podrá aceptar o rechazar.
 */
export const useQuoteRequest = (): UseQuoteRequestReturn => {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestQuote = async (data: QuoteRequestData): Promise<QuoteRequestResponse> => {
    setIsSending(true);
    setError(null);

    try {
      const response = await apiClient<{ quote_request: QuoteRequestResponse }>(
        '/quote-requests/requests',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );

      return response.quote_request;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al solicitar cotización';
      setError(message);
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  const resetError = () => {
    setError(null);
  };

  return {
    requestQuote,
    isSending,
    error,
    resetError,
  };
};

export default useQuoteRequest;
