import { apiClient } from './api';
import type {
  CreateRatingPayload,
  CreateRatingResponse,
  WorkerReviewsParams,
  WorkerReviewsResponse,
} from '../types/rating';

/** Tamaño de página por defecto para la lista de reseñas. */
export const REVIEWS_PAGE_SIZE = 20;

/**
 * Cliente de reseñas/calificaciones (Issue #26 e Issue #48).
 *
 * - GET /users/:id/ratings devuelve las calificaciones recibidas por el usuario.
 * - POST /ratings crea una calificación tras completar un servicio.
 *
 * El apiClient compartido adjunta el Bearer token y gestiona el refresh de sesión.
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

  /**
   * Crea una calificación para una orden completada.
   * POST /ratings
   *
   * El backend valida que la orden esté en estado COMPLETED, que el usuario
   * autenticado sea cliente o trabajador de la orden, y que no exista ya una
   * calificación previa para esa orden por parte del mismo usuario.
   */
  async createRating(payload: CreateRatingPayload): Promise<CreateRatingResponse> {
    const res = await apiClient<CreateRatingResponse>('/ratings', {
      method: 'POST',
      body: JSON.stringify({
        order_id: payload.order_id,
        rating_stars: payload.rating_stars,
        review_text: payload.review_text ?? null,
      }),
    });
    return res;
  },
};

export default ratingService;
