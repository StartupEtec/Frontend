/**
 * Tipos de la búsqueda de trabajadores (Issue #24) y del perfil público.
 * Espejo de los contratos del backend:
 * - GET /workers/nearby  (WorkerSearchService.formatRow)
 * - GET /users/:id       (UserService.getPublicProfile)
 */

/** Fila de trabajador cercano devuelta por GET /workers/nearby. */
export interface NearbyWorker {
  worker_id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  category_id: string | null;
  category_name: string | null;
  /** Puede ser null: la tarifa se define en un flujo posterior al alta. */
  hourly_rate: number | null;
  availability_status: string;
  certification_status: string;
  /** Promedio como texto con un decimal ("4.5"); null sin valoraciones. */
  average_rating: string | null;
  /** Distancia al centro de búsqueda en km (2 decimales). */
  distance_km: number;
  latitude: number;
  longitude: number;
}

export interface NearbyWorkersResponse {
  workers: NearbyWorker[];
  count: number;
  limit: number;
  offset: number;
}

/** Query exacta que acepta el schema Joi del backend (sin parámetros extra). */
export interface NearbyWorkersParams {
  latitude: number;
  longitude: number;
  /** En km, rango 1..100. */
  radius_km: number;
  category_id?: string | null;
  limit?: number;
  offset?: number;
}

/** Perfil público mínimo (GET /users/:id, sin autenticación). */
export interface PublicWorkerProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  average_rating: string | null;
  role: "worker" | "client";
}

export interface WorkerCategory {
  id: string;
  name: string;
}

/**
 * Catálogo de categorías: espejo de `Backend/src/database/seeds/01_categories.js`
 * (nombres e IDs exactos, UUIDs fijos del seed).
 *
 * El backend no expone un GET /categories, así que el filtro de categorías
 * vive en el frontend. Si el seed cambia, actualizar acá.
 */
export const WORKER_CATEGORIES: WorkerCategory[] = [
  { id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f001", name: "Limpieza" },
  { id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f002", name: "Plomería" },
  { id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f003", name: "Electricidad" },
  {
    id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f004",
    name: "Jardinería y Paisajismo",
  },
  { id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f005", name: "Pintura" },
  { id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f006", name: "Carpintería" },
  {
    id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f007",
    name: "Climatización y Refrigeración",
  },
  { id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f008", name: "Cuidado de Mascotas" },
  {
    id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f009",
    name: "Soporte Técnico e Informática",
  },
  { id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f010", name: "Cerrajería" },
  { id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f011", name: "Gasista Matriculado" },
  { id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f012", name: "Mudanzas y Fletes" },
  {
    id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f013",
    name: "Albañilería y Construcción",
  },
  { id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f014", name: "Herrería y Soldadura" },
  {
    id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f015",
    name: "Techista y Reparación de Techos",
  },
  {
    id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f016",
    name: "Fumigación y Control de Plagas",
  },
  {
    id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f017",
    name: "Seguridad y Cámaras (CCTV)",
  },
  {
    id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f018",
    name: "Reparación de Electrodomésticos",
  },
  { id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f019", name: "Durlock y Yesería" },
  {
    id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f020",
    name: "Tapicería y Restauración",
  },
  {
    id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f021",
    name: "Pulido y Plastificado de Pisos",
  },
  { id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f022", name: "Impermeabilización" },
  {
    id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f023",
    name: "Cuidado de Adultos Mayores",
  },
  {
    id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f024",
    name: "Cuidado Infantil y Niñera",
  },
  { id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f025", name: "Clases Particulares" },
  {
    id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f026",
    name: "Diseño y Decoración de Interiores",
  },
  {
    id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f027",
    name: "Organización de Espacios",
  },
  {
    id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f028",
    name: "Peluquería y Barbería a Domicilio",
  },
  { id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f029", name: "Masajes y Estética" },
  {
    id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f030",
    name: "Catering y Chef a Domicilio",
  },
  {
    id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f031",
    name: "Mantenimiento de Piletas / Piscinas",
  },
  {
    id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f032",
    name: "Vidriería y Cerramientos",
  },
];

/**
 * Radio fijo de búsqueda (km). La pantalla no expone filtro de distancia:
 * se envía el máximo que acepta el backend para no perder trabajadores.
 */
export const NEARBY_FIXED_RADIUS_KM = 100;

/**
 * Límite de trabajadores por consulta. El backend acepta 1..100 y devuelve
 * solo la página pedida (sin total real), así que al llegar a este límite
 * la UI muestra el contador como "N+".
 */
export const NEARBY_MAX_LIMIT = 50;
