/**
 * Tipos de las reseñas/calificaciones (Issue #26 y Issue #48).
 * Espejo del contrato del backend:
 * - GET /users/:id/ratings → RatingService.js → listRatingsByUser
 * - POST /ratings → RatingService.js → createRating
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

/** Payload para crear una calificación (POST /ratings). */
export interface CreateRatingPayload {
  /** ID de la orden completada. */
  order_id: string;
  /** Estrella seleccionada (1-5). Obligatorio. */
  rating_stars: number;
  /** Reseña opcional, máximo 500 caracteres. */
  review_text?: string | null;
}

/** Respuesta de POST /ratings. */
export interface CreateRatingResponse {
  message: string;
  rating: {
    id: string;
    order_id: string;
    rater_id: string;
    ratee_id: string;
    rating_stars: number;
    review_text: string | null;
    created_at: string;
  };
}

/** Información del usuario a calificar (obtenida del detalle de la orden). */
export interface RateeInfo {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  service: string;
}
