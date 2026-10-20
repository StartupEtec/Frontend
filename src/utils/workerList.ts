import {
  NearbyWorker,
  WorkerListFilters,
  WorkerSortOption,
} from "../types/worker";

/**
 * Lógica pura de la vista de lista de trabajadores (Issue #25): filtrado por
 * nombre, filtrado por calificación mínima, ordenamiento y paginación.
 *
 * Vive fuera de React para poder testearse sin montar componentes y para que
 * `useWorkerList` quede como una capa delgada de estado/derivación.
 *
 * El backend NO ofrece `sort`, `min_rating`, `search` ni un total real: todo
 * esto se resuelve en el cliente sobre el conjunto ya traído por
 * `GET /workers/nearby` (radio fijo de 100 km).
 */

/**
 * Normaliza texto para comparar: minúsculas y sin acentos, para que "jose"
 * encuentre a "José" y "perez" a "Pérez". `NFD` separa el acento de la letra
 * base y el rango `\u0300-\u036f` (marcas diacríticas) lo elimina.
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Calificación numérica de un trabajador; null si no tiene valoraciones. */
export function numericRating(worker: NearbyWorker): number | null {
  if (worker.average_rating == null) return null;
  const rating = Number(worker.average_rating);
  return Number.isFinite(rating) ? rating : null;
}

/**
 * Aplica los filtros de nombre y calificación mínima. No ordena: eso lo hace
 * `sortWorkers` para mantener cada paso con una única responsabilidad.
 */
export function filterWorkers(
  workers: NearbyWorker[],
  filters: Pick<WorkerListFilters, "nameQuery" | "minRating">,
): NearbyWorker[] {
  const query = normalizeSearchText(filters.nameQuery);
  const minRating = filters.minRating;

  return workers.filter((worker) => {
    if (query && !normalizeSearchText(worker.full_name).includes(query)) {
      return false;
    }
    // Sin filtro de rating (0) no se descarta a quien no tiene valoraciones:
    // el worker sin reviews sigue siendo visible.
    if (minRating > 0) {
      const rating = numericRating(worker);
      if (rating == null || rating < minRating) return false;
    }
    return true;
  });
}

/**
 * Compara dos trabajadores por un criterio. Los empates se desempatan por
 * distancia ascendente para que el orden sea estable y predecible.
 *
 * - distance: más cercano primero.
 * - rating: mejor calificado primero; sin valoraciones al final.
 */
export function compareWorkers(
  a: NearbyWorker,
  b: NearbyWorker,
  sortBy: WorkerSortOption,
): number {
  if (sortBy === "rating") {
    const ra = numericRating(a);
    const rb = numericRating(b);
    if (ra == null && rb == null) return a.distance_km - b.distance_km;
    if (ra == null) return 1;
    if (rb == null) return -1;
    if (rb !== ra) return rb - ra;
    return a.distance_km - b.distance_km;
  }

  // Por defecto (y "distance"): más cercano primero.
  return a.distance_km - b.distance_km;
}

/** Devuelve una copia ordenada (no muta la entrada). */
export function sortWorkers(
  workers: NearbyWorker[],
  sortBy: WorkerSortOption,
): NearbyWorker[] {
  return [...workers].sort((a, b) => compareWorkers(a, b, sortBy));
}

/**
 * Aplica filtros y orden en un solo paso. Útil para derivar la lista visible
 * con `useMemo`.
 */
export function applyWorkerListFilters(
  workers: NearbyWorker[],
  filters: WorkerListFilters,
): NearbyWorker[] {
  return sortWorkers(filterWorkers(workers, filters), filters.sortBy);
}

/**
 * Recorta la lista a las primeras `visibleCount` fichas. Devuelve además si
 * quedan más resultados por mostrar, para habilitar "Cargar más".
 */
export function paginateWorkers(
  workers: NearbyWorker[],
  visibleCount: number,
): { visible: NearbyWorker[]; hasMore: boolean } {
  const safeCount = Math.max(0, Math.floor(visibleCount));
  return {
    visible: workers.slice(0, safeCount),
    hasMore: workers.length > safeCount,
  };
}
