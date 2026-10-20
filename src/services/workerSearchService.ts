import { apiClient } from "./api";
import { NearbyWorkersParams, NearbyWorkersResponse } from "../types/worker";

/**
 * Cliente de la búsqueda de trabajadores cercanos (Issue #22 del backend).
 *
 * Ruta: GET /workers/nearby?latitude=&longitude=&radius_km=&category_id=&limit=&offset=
 * Requiere Bearer token; el `apiClient` compartido lo adjunta y lo renueva.
 *
 * Ojo: el schema Joi del backend rechaza parámetros desconocidos, así que la
 * query se arma únicamente con los nombres exactos del contrato.
 * `radius_km` es obligatorio (1..100 km).
 */
export const workerSearchService = {
  /** Busca trabajadores disponibles y certificados dentro de un radio (km). */
  async nearby(params: NearbyWorkersParams): Promise<NearbyWorkersResponse> {
    const parts = [
      `latitude=${params.latitude}`,
      `longitude=${params.longitude}`,
      `radius_km=${params.radius_km}`,
    ];
    if (params.category_id) {
      parts.push(`category_id=${encodeURIComponent(params.category_id)}`);
    }
    if (params.limit != null) parts.push(`limit=${params.limit}`);
    if (params.offset != null) parts.push(`offset=${params.offset}`);

    const res = await apiClient<NearbyWorkersResponse>(
      `/workers/nearby?${parts.join("&")}`,
      { method: "GET" },
    );
    // Respuesta defensiva: ante un cuerpo inesperado se trata como lista vacía.
    return { ...res, workers: res.workers ?? [] };
  },
};

export default workerSearchService;
