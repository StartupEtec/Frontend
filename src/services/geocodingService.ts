import { ApiError } from "./api";

/**
 * Geocoding con OpenStreetMap Nominatim (sin API key).
 *
 * Se usa solo para buscar direcciones y hacer reverse-geocoding desde el
 * selector de ubicaciones. No pasa por el `apiClient` porque es un servicio
 * externo (sin token propio, con su propio timeout y errores).
 *
 * Política de uso de Nominatim:
 * - Se identifica la app con un User-Agent (el header "User-Agent" de RN se
 *   envía tal cual en Android/iOS).
 * - Se respeta `accept-language=es` para rótulos en español.
 *
 * La URL base es configurable con EXPO_PUBLIC_GEOCODING_URL (por si más
 * adelante se migra a Google Geocoding u otro proveedor).
 */
export const GEOCODING_CONFIG = {
  BASE_URL:
    process.env.EXPO_PUBLIC_GEOCODING_URL ??
    "https://nominatim.openstreetmap.org",
  TIMEOUT: 10000,
  MAX_RESULTS: 5,
  USER_AGENT: "StartupApp/1.0",
} as const;

export interface GeocodeResult {
  label: string;
  latitude: number;
  longitude: number;
}

interface NominatimItem {
  display_name?: string;
  lat?: string | number;
  lon?: string | number;
}

const ACCEPT_LANGUAGE = "es";

function buildHeaders(): Record<string, string> {
  return {
    Accept: "application/json",
    "Accept-Language": ACCEPT_LANGUAGE,
    "User-Agent": GEOCODING_CONFIG.USER_AGENT,
  };
}

/** GET JSON con timeout explícito; lanza ApiError ante fallo. */
async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODING_CONFIG.TIMEOUT);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: buildHeaders(),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ApiError(
        "No pudimos buscar direcciones. Reintentá.",
        response.status,
        "GEOCODING_ERROR",
      );
    }
    return await response.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(
        "La búsqueda de direcciones tardó demasiado. Reintentá.",
        408,
        "GEOCODING_TIMEOUT",
      );
    }
    throw new ApiError(
      "No pudimos conectar con el servicio de direcciones.",
      0,
      "GEOCODING_NETWORK_ERROR",
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Normaliza lat/lon de Nominatim; null si faltan o quedan fuera de rango. */
function toCoordinates(
  item: NominatimItem,
): { latitude: number; longitude: number } | null {
  const latitude = Number(item.lat);
  const longitude = Number(item.lon);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return { latitude, longitude };
}

export const geocodingService = {
  /**
   * Busca direcciones por texto. Devuelve los resultados o lista vacía si no
   * hay coincidencias; lanza ApiError si el servicio falla.
   */
  async search(query: string): Promise<GeocodeResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < 3) return [];

    const url =
      `${GEOCODING_CONFIG.BASE_URL}/search?` +
      new URLSearchParams({
        q: trimmed,
        format: "jsonv2",
        addressdetails: "0",
        limit: String(GEOCODING_CONFIG.MAX_RESULTS),
        "accept-language": ACCEPT_LANGUAGE,
      }).toString();

    const data = (await fetchJson(url)) as NominatimItem[];
    if (!Array.isArray(data)) return [];

    const results: GeocodeResult[] = [];
    for (const item of data) {
      const coordinates = toCoordinates(item);
      const label = item.display_name?.trim() ?? "";
      if (!coordinates || !label) continue;
      results.push({ label, ...coordinates });
    }
    return results;
  },

  /** Dirección a partir de coordenadas. null si no se pudo resolver. */
  async reverse(latitude: number, longitude: number): Promise<string | null> {
    const url =
      `${GEOCODING_CONFIG.BASE_URL}/reverse?` +
      new URLSearchParams({
        lat: String(latitude),
        lon: String(longitude),
        format: "jsonv2",
        "accept-language": ACCEPT_LANGUAGE,
      }).toString();

    try {
      const data = (await fetchJson(url)) as NominatimItem;
      return data?.display_name?.trim() || null;
    } catch {
      // Soft-fail: se conserva la dirección que ya tenía el usuario.
      return null;
    }
  },
};

export default geocodingService;
