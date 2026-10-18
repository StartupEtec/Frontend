import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../services/api";
import { workerSearchService } from "../services/workerSearchService";
import { Coordinates } from "../types/location";
import { NearbyWorker, NEARBY_MAX_LIMIT } from "../types/worker";

export type NearbyWorkersStatus = "idle" | "loading" | "success" | "error";

interface UseNearbyWorkersOptions {
  /** Centro del radio de búsqueda (mapa o ubicación del dispositivo). */
  center: Coordinates | null;
  /** Radio en km (1..100 según el backend). */
  radiusKm: number;
  /** Categoría opcional (null = todas). */
  categoryId?: string | null;
}

function messageFor(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/**
 * Busca trabajadores cercanos con GET /workers/nearby.
 *
 * Se reconsulta cada vez que cambia el centro (al mover el mapa, por ejemplo),
 * el radio o la categoría. La primera carga muestra spinner (`status`);
 * las recargas posteriores son silenciosas y solo levantan `refreshing`,
 * para no vaciar el mapa mientras se actualizan los resultados.
 *
 * Las respuestas fuera de orden se descartan: solo la última petición
 * autorizada puede escribir en estado.
 */
export const useNearbyWorkers = ({
  center,
  radiusKm,
  categoryId,
}: UseNearbyWorkersOptions) => {
  const [workers, setWorkers] = useState<NearbyWorker[]>([]);
  const [status, setStatus] = useState<NearbyWorkersStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const sequenceRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const lat = center?.latitude ?? null;
  const lng = center?.longitude ?? null;
  const hasCenter =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);

  const fetchWorkers = useCallback(
    async (showLoading: boolean) => {
      if (lat == null || lng == null) return;
      const sequence = ++sequenceRef.current;
      if (showLoading) setStatus("loading");
      setRefreshing(true);
      setError(null);
      try {
        const result = await workerSearchService.nearby({
          latitude: lat,
          longitude: lng,
          radius_km: radiusKm,
          category_id: categoryId ?? undefined,
          limit: NEARBY_MAX_LIMIT,
        });
        if (sequence !== sequenceRef.current) return; // respuesta vieja
        setWorkers(result.workers);
        setStatus("success");
        hasLoadedRef.current = true;
      } catch (err: unknown) {
        if (sequence !== sequenceRef.current) return;
        setError(messageFor(err, "No pudimos buscar trabajadores. Reintentá."));
        setStatus("error");
      } finally {
        if (sequence === sequenceRef.current) setRefreshing(false);
      }
    },
    // lat/lng/radiusKm/categoryId como primitivos: un nuevo valor genera una
    // nueva identidad de fetchWorkers y dispara la búsqueda en el efecto.
    [lat, lng, radiusKm, categoryId],
  );

  useEffect(() => {
    // Sin centro todavía (permiso de ubicación pendiente) no se busca.
    if (!hasCenter) return;
    // Primera carga con spinner; cambios de centro/radio/categoría en silencio.
    void fetchWorkers(!hasLoadedRef.current);
  }, [fetchWorkers, hasCenter]);

  /** Recarga visible (botón "Reintentar"): siempre con spinner. */
  const reload = useCallback(() => {
    hasLoadedRef.current = false;
    void fetchWorkers(true);
  }, [fetchWorkers]);

  return {
    /** Últimos trabajadores encontrados (se conservan durante recargas). */
    workers,
    /** idle = sin centro aún; loading = primera carga; success/error. */
    status,
    error,
    /** true mientras se reconsulta en segundo plano (cambio de filtros/mapa). */
    refreshing,
    reload,
  };
};

export default useNearbyWorkers;
