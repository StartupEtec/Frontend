/**
 * Helpers de presentación de calificaciones (Issue #26).
 * Funciones puras para poder testearlas sin renderizar componentes.
 */

/** "4.5" → "4,5"; null si no hay valoraciones o el valor no es numérico.
 * Acepta tanto punto como coma decimal (el backend usa punto, la UI muestra coma). */
export function formatRating(value: string | number | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const rating = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(rating)) return null;
  return rating.toFixed(1).replace('.', ',');
}

/** Cantidad de estrellas llenas (0..5) para un promedio, redondeado. */
export function ratingStars(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.min(5, Math.max(0, Math.round(value)));
}

/** ISO → "22/11/2026" (fecha local); "" si el valor no es una fecha válida. */
export function formatReviewDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}
