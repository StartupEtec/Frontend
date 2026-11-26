import { useCallback, useState } from 'react';
import { ratingService } from '../services/ratingService';
import type { CreateRatingPayload } from '../types/rating';
import { ApiError } from '../services/api';

type RatingStatus = 'idle' | 'submitting' | 'success' | 'error';

/**
 * Hook para enviar una calificación de servicio (Issue #48).
 *
 * Expone:
 * - submitRating(payload): envía la calificación al backend.
 * - status: 'idle' | 'submitting' | 'success' | 'error'.
 * - error: mensaje de error si falló el envío.
 * - reset: limpia el estado para permitir un nuevo envío.
 */
export const useRating = () => {
  const [status, setStatus] = useState<RatingStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const submitRating = useCallback(async (payload: CreateRatingPayload): Promise<boolean> => {
    setStatus('submitting');
    setError(null);
    try {
      await ratingService.createRating(payload);
      setStatus('success');
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'No se pudo enviar la calificación. Reintentá.';
      setError(message);
      setStatus('error');
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return { status, error, submitRating, reset };
};
