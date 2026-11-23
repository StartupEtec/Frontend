import { apiClient } from './api';
import { WorkerReviewsParams, WorkerReviewsResponse } from '../types/rating';

/** Tamaño de página por defecto para la lista de reseñas. */
export const REVIEWS_PAGE_SIZE = 20;

/**
 * Cliente de reseñas/calificaciones (Issue #26).
 *
 * GET /users/:id/ratings devuelve las calificaciones recibidas por el usuario
 * e incluye el autor (`rater`), las estrellas, el texto y la fecha. Requiere
 * Bearer token; el `apiClient` compartido lo adjunta y lo renueva.
 */
export const ratingService = {
  async listByUser(
    userId: string,
    params: WorkerReviewsParams = {}
  ): Promise<WorkerReviewsResponse> {
    const limit = params.limit ?? REVIEWS_PAGE_SIZE;
    const offset = params.offset ?? 0;

    const res = await apiClient<WorkerReviewsResponse>(
      `/users/${userId}/ratings?limit=${limit}&offset=${offset}`,
      { method: 'GET' }
    );

    // Respuesta defensiva: ante un cuerpo inesperado se trata como lista vacía.
    const ratings = Array.isArray(res.ratings) ? res.ratings : [];
    return {
      ratings,
      count: typeof res.count === 'number' ? res.count : ratings.length,
      limit: typeof res.limit === 'number' ? res.limit : limit,
      offset: typeof res.offset === 'number' ? res.offset : offset,
    };
  },
};

export default ratingService;
