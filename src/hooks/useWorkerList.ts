import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_WORKER_LIST_FILTERS,
  NearbyWorker,
  WORKER_LIST_PAGE_SIZE,
  WorkerListFilters,
  WorkerSortOption,
} from "../types/worker";
import { applyWorkerListFilters, paginateWorkers } from "../utils/workerList";

/** Milisegundos de espera antes de aplicar la búsqueda por nombre. */
export const NAME_SEARCH_DEBOUNCE_MS = 300;

/**
 * Estado y derivación de la vista de lista de trabajadores (Issue #25):
 * filtros (nombre con debounce, calificación mínima), ordenamiento y
 * paginación en cliente sobre el conjunto que devuelve `GET /workers/nearby`.
 *
 * La lógica de filtrado/orden/paginado vive en `utils/workerList.ts` (pura y
 * testeable); este hook solo mantiene el estado de los controles y memoiza la
 * lista visible.
 *
 * `resetKey` permite reiniciar la paginación cuando cambia algo externo
 * (por ejemplo, el centro de búsqueda o la categoría): al cambiar, se vuelve a
 * la primera página. Los filtros NO se resetean (el usuario los eligió).
 */
export const useWorkerList = (
  workers: NearbyWorker[],
  options: { resetKey?: string | null } = {},
) => {
  const { resetKey = null } = options;

  // Texto del input (se actualiza en cada tecla) y el valor ya debounced que
  // alimenta el filtrado: evita recalcular en cada pulsación.
  const [nameInput, setNameInput] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [minRating, setMinRatingState] = useState(
    DEFAULT_WORKER_LIST_FILTERS.minRating,
  );
  const [sortBy, setSortByState] = useState<WorkerSortOption>(
    DEFAULT_WORKER_LIST_FILTERS.sortBy,
  );
  const [visibleCount, setVisibleCount] = useState(WORKER_LIST_PAGE_SIZE);

  useEffect(() => {
    const handle = setTimeout(
      () => setNameQuery(nameInput),
      NAME_SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(handle);
  }, [nameInput]);

  // Cada cambio de filtro u orden vuelve a la primera página.
  useEffect(() => {
    setVisibleCount(WORKER_LIST_PAGE_SIZE);
  }, [nameQuery, minRating, sortBy, resetKey]);

  const filters: WorkerListFilters = useMemo(
    () => ({ nameQuery, minRating, sortBy }),
    [nameQuery, minRating, sortBy],
  );

  const filtered = useMemo(
    () => applyWorkerListFilters(workers, filters),
    [workers, filters],
  );
  const { visible, hasMore } = useMemo(
    () => paginateWorkers(filtered, visibleCount),
    [filtered, visibleCount],
  );

  const setNameQueryInput = useCallback((value: string) => {
    setNameInput(value);
  }, []);

  const setMinRating = useCallback((value: number) => {
    setMinRatingState(value);
  }, []);

  const setSortBy = useCallback((value: WorkerSortOption) => {
    setSortByState(value);
  }, []);

  const loadMore = useCallback(() => {
    setVisibleCount((count) => count + WORKER_LIST_PAGE_SIZE);
  }, []);

  const clearFilters = useCallback(() => {
    setNameInput("");
    setNameQuery("");
    setMinRatingState(DEFAULT_WORKER_LIST_FILTERS.minRating);
    setSortByState(DEFAULT_WORKER_LIST_FILTERS.sortBy);
  }, []);

  // ¿Los datos crudos tienen resultados pero todos quedaron filtrados afuera?
  // La lista usa esto para distinguir "sin resultados" de "sin coincidencias".
  const hasActiveFilters = nameQuery.trim() !== "" || minRating > 0;

  return {
    /** Valor del input de búsqueda (con cada tecla). */
    nameInput,
    /** Filtros aplicados (ya con el nombre debounced). */
    filters,
    /** Lista visible (filtrada, ordenada y paginada). */
    workers: visible,
    /** Total de resultados que pasan filtros (sin paginar). */
    filteredCount: filtered.length,
    /** Total de resultados crudos recibidos del backend. */
    totalCount: workers.length,
    /** true si quedan páginas por mostrar. */
    hasMore,
    /** true si hay filtros activos (nombre no vacío o rating mínimo). */
    hasActiveFilters,
    setNameQuery: setNameQueryInput,
    setMinRating,
    setSortBy,
    loadMore,
    clearFilters,
  };
};

export default useWorkerList;
