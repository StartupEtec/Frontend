import { Coordinates } from "../types/location";

/** Centro inicial cuando todavía no hay coordenadas (Ciudad de Mendoza, AR). */
export const DEFAULT_CENTER: Coordinates = {
  latitude: -32.8895,
  longitude: -68.8458,
};

/** Zoom por defecto para una vista de contexto. */
export const DEFAULT_ZOOM = 12;
/** Zoom al centrar en la ubicación del dispositivo. */
export const REFERENCE_ZOOM = 14;
/** Zoom al centrar en un punto elegido. */
export const POINT_ZOOM = 16;
/** Zoom máximo permitido por los tiles de OSM. */
export const OSM_MAX_ZOOM = 19;

/**
 * Mosaicos (tiles) de OpenStreetMap, sin API key.
 *
 * El mapa se dibuja dentro de una WebView con Leaflet (ver
 * `components/location/LeafletMap.tsx`). Este proveedor no requiere API key y
 * funciona en Expo Go, a diferencia del mapa nativo de Google en Android.
 */
export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION = "&copy; OpenStreetMap";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampLatitude(latitude: number): number {
  return clamp(latitude, -90, 90);
}

export function clampLongitude(longitude: number): number {
  return clamp(longitude, -180, 180);
}

/** true si dos coordenadas representan (casi) el mismo punto. */
export function sameCoordinates(
  a: Coordinates | null | undefined,
  b: Coordinates | null | undefined,
  epsilon = 1e-9,
): boolean {
  if (!a || !b) return false;
  return (
    Math.abs(a.latitude - b.latitude) < epsilon &&
    Math.abs(a.longitude - b.longitude) < epsilon
  );
}

/**
 * Distancia legible: metros con redondeo, o kilómetros con un decimal.
 * Devuelve "" si el valor no es válido (p. ej. backend sin referencia).
 */
export function formatDistance(meters: number | null | undefined): string {
  if (meters == null || !Number.isFinite(meters) || meters < 0) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;

  const km = meters / 1000;
  const decimals = km < 10 ? 1 : 0;
  return `${km.toFixed(decimals).replace(".", ",")} km`;
}

/**
 * Zoom aproximado para que un círculo de `radiusKm` de radio entre en pantalla.
 *
 * Estimación heurística: se asumen ~300 px desde el centro del mapa hasta el
 * borde de la pantalla y la latitud del punto central. Se usa para encuadrar
 * el radio de búsqueda al cambiar de preset en la pantalla de búsqueda de
 * trabajadores (no es un cálculo de fitBounds exacto).
 */
export function zoomForRadius(
  radiusKm: number,
  latitude: number = DEFAULT_CENTER.latitude,
): number {
  const radiusMeters = Math.max(radiusKm, 0.1) * 1000;
  const metersPerPixel = radiusMeters / 300;
  const cosLatitude = Math.cos((latitude * Math.PI) / 180);
  const zoom = Math.log2((156543.03392 * cosLatitude) / metersPerPixel);
  return clamp(Math.round(zoom), 3, OSM_MAX_ZOOM - 1);
}
