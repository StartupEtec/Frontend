/**
 * Tipos de las reseñas/calificaciones (Issue #26).
 * Espejo del contrato de GET /users/:id/ratings
 * (Backend/src/services/RatingService.js → listRatingsByUser).
 */

/** Autor de una reseña: el usuario que calificó. */
export interface ReviewAuthor {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

/** Calificación recibida por un usuario. */
export interface WorkerReview {
  id: string;
  order_id: string;
  rater_id: string;
  ratee_id: string;
  /** Entero de 1 a 5. */
  rating_stars: number;
  review_text: string | null;
  created_at: string;
  rater: ReviewAuthor;
}

/** Respuesta paginada de GET /users/:id/ratings. */
export interface WorkerReviewsResponse {
  ratings: WorkerReview[];
  count: number;
  limit: number;
  offset: number;
}

/** Query que acepta el schema Joi del backend (limit 1..100, offset >= 0). */
export interface WorkerReviewsParams {
  limit?: number;
  offset?: number;
}
