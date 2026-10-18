import { useCallback, useEffect, useRef, useState } from "react";
import { tokenStorage } from "../services/tokenStorage";
import { locationService } from "../services/locationService";
import { coverageRadiusStorage } from "../services/coverageRadiusStorage";
import { ApiError } from "../services/api";
import {
  Coordinates,
  CreateLocationPayload,
  SavedLocation,
  UpdateLocationPayload,
} from "../types/location";

export type LocationsStatus = "loading" | "success" | "error";

/** Muestra primero la ubicación principal; el resto conserva el orden original. */
function sortPrimaryFirst(list: SavedLocation[]): SavedLocation[] {
  return [...list].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
}

/**
 * Ordena la lista por cercanía a la referencia (como Google Maps: lo más
 * cercano primero). Ante distancias iguales o faltantes, la principal queda
 * arriba y, en último término, se conserva el orden original (sort estable).
 *
 * Sin referencia se mantiene el criterio histórico: principal primero.
 */
function sortLocations(
  list: SavedLocation[],
  reference: Coordinates | null,
): SavedLocation[] {
  if (!reference) return sortPrimaryFirst(list);

  return [...list].sort((a, b) => {
    const distanceA = a.distance_m ?? Number.POSITIVE_INFINITY;
    const distanceB = b.distance_m ?? Number.POSITIVE_INFINITY;
    if (distanceA !== distanceB) return distanceA - distanceB;
    return Number(b.is_primary) - Number(a.is_primary);
  });
}

/**
 * Aplica el resultado de una mutación a la lista local sin recargar todo:
 * - si el resultado es principal, ninguna otra ubicación puede serlo;
 * - reemplaza o agrega la ubicación y reordena.
 */
function applyMutation(
  list: SavedLocation[],
  updated: SavedLocation,
  reference: Coordinates | null,
): SavedLocation[] {
  const next = list.some((l) => l.id === updated.id)
    ? list.map((l) => (l.id === updated.id ? updated : l))
    : [...list, updated];

  const normalized = updated.is_primary
    ? next.map((l) => (l.id === updated.id ? l : { ...l, is_primary: false }))
    : next;

  return sortLocations(normalized, reference);
}

function messageFor(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/**
 * El backend todavía no guarda el radio de cobertura, así que lo traemos del
 * almacenamiento local y lo superponemos a la respuesta de la API. Si algún día
 * el backend devuelve `coverage_radius_km`, el valor de la API tiene prioridad.
 */
function applyRadiusOverlay(
  list: SavedLocation[],
  radii: Record<string, number>,
): SavedLocation[] {
  return list.map((location) => {
    if (location.coverage_radius_km != null) return location;
    const radius = radii[location.id];
    return radius == null
      ? location
      : { ...location, coverage_radius_km: radius };
  });
}

/**
 * Carga y administra las ubicaciones guardadas del usuario.
 *
 * Si se pasa `reference` (la posición del dispositivo), la lista se pide con
 * las coordenadas y se ordena por cercanía; además se vuelve a consultar cada
 * vez que la referencia cambia.
 *
 * Expone el estado de lista (loading / success / error), el pull-to-refresh
 * y las operaciones create / update / setPrimary / delete con su propio estado
 * de "guardando" y "eliminando".
 */
export const useLocations = (reference?: Coordinates | null) => {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [status, setStatus] = useState<LocationsStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const userIdRef = useRef<string | null>(null);

  // Se guarda en un ref con las coordenadas primitivas como dependencia para
  // no re-disparar la carga con cada render (la referencia es un objeto nuevo).
  const referenceRef = useRef<Coordinates | null>(null);
  const hasReference =
    reference != null &&
    Number.isFinite(reference.latitude) &&
    Number.isFinite(reference.longitude);
  referenceRef.current = hasReference
    ? { latitude: reference!.latitude, longitude: reference!.longitude }
    : null;
  const referenceLat = referenceRef.current?.latitude ?? null;
  const referenceLng = referenceRef.current?.longitude ?? null;

  const hasLoadedRef = useRef(false);

  const requireUserId = useCallback(async (): Promise<string> => {
    const userId = userIdRef.current ?? (await tokenStorage.getUserId());
    if (!userId) {
      throw new ApiError(
        "Sesión expirada. Volvé a iniciar sesión.",
        401,
        "SESSION_EXPIRED",
      );
    }
    userIdRef.current = userId;
    return userId;
  }, []);

  const fetchList = useCallback(
    async (showLoading: boolean) => {
      if (showLoading) setStatus("loading");
      setError(null);
      try {
        const userId = await requireUserId();
        const ref = referenceRef.current;
        const list = ref
          ? await locationService.list(userId, ref)
          : await locationService.list(userId);
        const radii = await coverageRadiusStorage.getAll();
        setLocations(
          sortLocations(applyRadiusOverlay(list, radii), referenceRef.current),
        );
        setStatus("success");
        hasLoadedRef.current = true;
      } catch (err: unknown) {
        setError(
          messageFor(err, "No pudimos cargar tus ubicaciones. Reintentá."),
        );
        setStatus("error");
      } finally {
        setRefreshing(false);
      }
    },
    // referenceLat/Lng no se usan dentro, pero fuerzan una nueva identidad de
    // fetchList al cambiar la referencia → el efecto de abajo recarga la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requireUserId, referenceLat, referenceLng],
  );

  useEffect(() => {
    // Primera carga con spinner; recargas por cambio de referencia en silencio.
    void fetchList(!hasLoadedRef.current);
  }, [fetchList]);

  const reload = useCallback(() => fetchList(true), [fetchList]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    return fetchList(false);
  }, [fetchList]);

  const clearActionError = useCallback(() => setActionError(null), []);

  const createLocation = useCallback(
    async (payload: CreateLocationPayload): Promise<SavedLocation | null> => {
      setSaving(true);
      setActionError(null);
      try {
        const userId = await requireUserId();
        const created = await locationService.create(userId, payload);
        const radius = payload.coverage_radius_km ?? null;
        if (radius != null) await coverageRadiusStorage.set(created.id, radius);
        setLocations((prev) =>
          applyMutation(
            prev,
            { ...created, coverage_radius_km: radius },
            referenceRef.current,
          ),
        );
        return { ...created, coverage_radius_km: radius };
      } catch (err: unknown) {
        setActionError(
          messageFor(err, "No pudimos guardar la ubicación. Reintentá."),
        );
        return null;
      } finally {
        setSaving(false);
      }
    },
    [requireUserId],
  );

  const updateLocation = useCallback(
    async (
      locationId: string,
      payload: UpdateLocationPayload,
    ): Promise<SavedLocation | null> => {
      setSaving(true);
      setActionError(null);
      try {
        const updated = await locationService.update(locationId, payload);
        const incomingRadius =
          payload.coverage_radius_km !== undefined
            ? payload.coverage_radius_km
            : undefined;
        if (incomingRadius !== undefined) {
          await coverageRadiusStorage.set(locationId, incomingRadius);
        }
        setLocations((prev) => {
          const prior = prev.find((l) => l.id === locationId);
          const merged: SavedLocation = {
            ...updated,
            coverage_radius_km:
              incomingRadius !== undefined
                ? incomingRadius
                : (prior?.coverage_radius_km ?? null),
          };
          return applyMutation(prev, merged, referenceRef.current);
        });
        return {
          ...updated,
          coverage_radius_km: incomingRadius ?? updated.coverage_radius_km,
        };
      } catch (err: unknown) {
        setActionError(
          messageFor(err, "No pudimos guardar la ubicación. Reintentá."),
        );
        return null;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const setPrimary = useCallback(
    async (locationId: string): Promise<boolean> => {
      const updated = await updateLocation(locationId, { is_primary: true });
      return updated !== null;
    },
    [updateLocation],
  );

  const deleteLocation = useCallback(
    async (locationId: string): Promise<boolean> => {
      setDeletingId(locationId);
      setActionError(null);
      try {
        await locationService.remove(locationId);
        await coverageRadiusStorage.remove(locationId);
        setLocations((prev) => prev.filter((l) => l.id !== locationId));
        return true;
      } catch (err: unknown) {
        setActionError(messageFor(err, "No pudimos eliminar la ubicación."));
        return false;
      } finally {
        setDeletingId(null);
      }
    },
    [],
  );

  return {
    locations,
    status,
    error,
    actionError,
    saving,
    deletingId,
    refreshing,
    reload,
    refresh,
    clearActionError,
    createLocation,
    updateLocation,
    setPrimary,
    deleteLocation,
  };
};
