import { ApiError, apiClient } from "./api";
import {
  CreateLocationPayload,
  DeleteLocationApiResponse,
  LocationListApiResponse,
  LocationMutationApiResponse,
  SavedLocation,
  UpdateLocationPayload,
} from "../types/location";

/**
 * Cliente del módulo de ubicaciones guardadas.
 *
 * Rutas del backend:
 * - GET    /users/:id/locations          (opcional: ?lat=&lng= para distancia)
 * - POST   /users/:id/locations
 * - PATCH  /locations/:location_id
 * - DELETE /locations/:location_id
 *
 * La autenticación (Bearer token) y el refresh automático los resuelve el
 * `apiClient` compartido.
 *
 * `coverage_radius_km` viaja en el body porque el backend ya lo persiste (ver
 * migración `20261017000000_add_coverage_radius_to_locations`). Si el backend
 * desplegado todavía no tiene la columna, su schema Joi lo rechaza con un 400
 * "… is not allowed"; en ese caso reintentamos sin el campo para no romper el
 * alta/edición (el radio se sigue guardando local en `coverageRadiusStorage`).
 */

/** ¿El backend rechazó `coverage_radius_km` por no conocer el campo? */
function isUnsupportedRadiusError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.statusCode === 400 &&
    error.message.includes("coverage_radius_km")
  );
}

/** Copia del payload sin `coverage_radius_km` (fallback para backend viejo). */
function stripRadius<T extends object>(
  payload: T,
): Omit<T, "coverage_radius_km"> {
  const { coverage_radius_km: _omitted, ...rest } = payload as T & {
    coverage_radius_km?: unknown;
  };
  return rest;
}

/**
 * Envía la mutación con `coverage_radius_km`. Si el backend no soporta el
 * campo, reintenta una vez sin él.
 */
async function sendMutation<T>(
  endpoint: string,
  method: "POST" | "PATCH",
  payload: CreateLocationPayload | UpdateLocationPayload,
): Promise<SavedLocation> {
  const call = (body: object) =>
    apiClient<LocationMutationApiResponse>(endpoint, {
      method,
      body: JSON.stringify(body),
    });

  try {
    const res = await call(payload);
    return res.location;
  } catch (error) {
    if (!isUnsupportedRadiusError(error)) throw error;
    const res = await call(stripRadius(payload));
    return res.location;
  }
}

export const locationService = {
  /** Lista las ubicaciones del usuario autenticado. */
  async list(
    userId: string,
    reference?: { latitude: number; longitude: number },
  ): Promise<SavedLocation[]> {
    const query = reference
      ? `?lat=${reference.latitude}&lng=${reference.longitude}`
      : "";
    const res = await apiClient<LocationListApiResponse>(
      `/users/${userId}/locations${query}`,
      { method: "GET" },
    );
    return res.locations ?? [];
  },

  async create(
    userId: string,
    payload: CreateLocationPayload,
  ): Promise<SavedLocation> {
    return sendMutation(`/users/${userId}/locations`, "POST", payload);
  },

  async update(
    locationId: string,
    payload: UpdateLocationPayload,
  ): Promise<SavedLocation> {
    return sendMutation(`/locations/${locationId}`, "PATCH", payload);
  },

  async remove(locationId: string): Promise<void> {
    await apiClient<DeleteLocationApiResponse>(`/locations/${locationId}`, {
      method: "DELETE",
    });
  },
};

export default locationService;
