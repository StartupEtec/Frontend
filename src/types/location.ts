/**
 * Tipos del módulo de ubicaciones guardadas.
 * Espejan la API del backend (LocationController / LocationService).
 */

/** Coordenadas en grados decimales (WGS84). */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Ubicación guardada de un usuario tal como la devuelve el backend. */
export interface SavedLocation {
  id: string;
  user_id: string;
  address: string;
  latitude: number;
  longitude: number;
  is_primary: boolean;
  /** Solo se calcula cuando se pide la lista con ?lat=&lng= de referencia. */
  distance_m?: number | null;
  /** Radio de cobertura en kilómetros (solo trabajadores). */
  coverage_radius_km?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateLocationPayload {
  address: string;
  latitude: number;
  longitude: number;
  is_primary?: boolean;
  /** Radio de cobertura en kilómetros (solo trabajadores). */
  coverage_radius_km?: number | null;
}

export type UpdateLocationPayload = Partial<CreateLocationPayload>;

export interface LocationListApiResponse {
  locations: SavedLocation[];
  count: number;
}

export interface LocationMutationApiResponse {
  message: string;
  location: SavedLocation;
}

export interface DeleteLocationApiResponse {
  message: string;
}

/** Máximo de ubicaciones por usuario (lo define el backend). */
export const MAX_LOCATIONS_PER_USER = 10;
