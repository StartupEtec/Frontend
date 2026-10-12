import { apiClient, API_CONFIG, apiOrigin, ApiError, refreshSession } from "./api";
import { tokenStorage } from "./tokenStorage";
import * as FileSystem from "expo-file-system/legacy";
import { File, UploadType } from "expo-file-system";
import {
  UpdateProfilePayload,
  CreateClientProfilePayload,
  CreateWorkerProfilePayload,
  UpdateClientProfilePayload,
  UpdateWorkerProfilePayload,
  CreateIdentityPayload,
  UpdateIdentityPayload,
  IdentityApiResponse,
  IdentityPayload,
  ProfileUpdateApiResponse,
  UploadImageApiResponse,
} from "../types/profile";

function mimeTypeFromUri(uri: string): string {
  const lower = uri.split("?")[0].toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await tokenStorage.getAccessToken();
  const headers: Record<string, string> = {
    "ngrok-skip-browser-warning": "true",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * URI lista para mostrar en <Image>: las URLs relativas /uploads/...
 * se absolutizan con el origen del backend; el resto pasa intacto.
 */
export function toDisplayUri(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return `${apiOrigin()}${url}`;
  return url;
}

/**
 * URL lista para persistir: si es absoluta y apunta a nuestro backend,
 * se guarda relativa (/uploads/...) para no atarla al túnel actual.
 */
export function toStoredUrl(url: string): string {
  const origin = apiOrigin();
  if (url.startsWith(origin + "/")) return url.slice(origin.length);
  return url;
}

/** ¿Es un archivo local que todavía hay que subir? */
export function isLocalUri(uri: string): boolean {
  return uri.startsWith("file://") || uri.startsWith("content://");
}

async function attemptUpload(
  url: string,
  dest: string,
  mimeType: string,
  headers: Record<string, string>,
): Promise<{ status: number; body: string }> {
  try {
    const result = await FileSystem.uploadAsync(url, dest, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "file",
      mimeType,
      headers,
    });
    return { status: result.status, body: result.body };
  } catch {
    const result = await new File(dest).upload(url, {
      httpMethod: "POST",
      uploadType: UploadType.MULTIPART,
      fieldName: "file",
      mimeType,
      headers,
    });
    return { status: result.status, body: result.body };
  }
}

function parseUploadBody(
  status: number,
  body: string,
): UploadImageApiResponse & { error?: string } {
  try {
    return JSON.parse(body) as UploadImageApiResponse & { error?: string };
  } catch {
    throw new ApiError(
      "Respuesta inválida del servidor al subir la imagen.",
      status,
      "UPLOAD_ERROR",
    );
  }
}

export const profileService = {
  /**
   * Identidad única (vale para cliente y trabajador). Un solo GET/PATCH
   * por usuario: no hay que completar dos veces.
   */
  async getIdentity(userId: string): Promise<IdentityPayload | null> {
    try {
      return await apiClient<IdentityPayload>(`/users/${userId}/identity`, {
        method: "GET",
      });
    } catch (e: unknown) {
      // 404 = usuario inexistente (o backend viejo). Los parciales vienen
      // con 200 + is_complete:false para precargar el formulario.
      if (e instanceof ApiError && e.statusCode === 404) return null;
      throw e;
    }
  },

  async upsertIdentity(
    userId: string,
    data: CreateIdentityPayload | UpdateIdentityPayload,
  ): Promise<IdentityApiResponse> {
    return apiClient<IdentityApiResponse>(`/users/${userId}/identity`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async updateProfile(
    userId: string,
    data: UpdateProfilePayload,
  ): Promise<ProfileUpdateApiResponse> {
    return apiClient<ProfileUpdateApiResponse>(`/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async createClientProfile(
    userId: string,
    data: CreateClientProfilePayload,
  ): Promise<ProfileUpdateApiResponse> {
    return apiClient<ProfileUpdateApiResponse>(
      `/users/${userId}/client-profile`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },

  async createWorkerProfile(
    userId: string,
    data: CreateWorkerProfilePayload,
  ): Promise<ProfileUpdateApiResponse> {
    return apiClient<ProfileUpdateApiResponse>(
      `/users/${userId}/worker-profile`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },

  async updateClientProfile(
    userId: string,
    data: UpdateClientProfilePayload,
  ): Promise<ProfileUpdateApiResponse> {
    return apiClient<ProfileUpdateApiResponse>(
      `/users/${userId}/client-profile`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
  },

  async updateWorkerProfile(
    userId: string,
    data: UpdateWorkerProfilePayload,
  ): Promise<ProfileUpdateApiResponse> {
    return apiClient<ProfileUpdateApiResponse>(
      `/users/${userId}/worker-profile`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
  },

  async getClientProfile(userId: string): Promise<unknown> {
    return apiClient(`/users/${userId}/client-profile`, {
      method: "GET",
    });
  },

  async getWorkerProfile(userId: string): Promise<unknown> {
    return apiClient(`/users/${userId}/worker-profile`, {
      method: "GET",
    });
  },

  /**
   * Sube una imagen local (file://, content://) al backend y devuelve la URL
   * pública (/uploads/....jpg) lista para avatar_url / dni_*_url.
   *
   * Usa FileSystem.uploadAsync en lugar de fetch + FormData: el fetch global
   * de RN/Expo solo acepta Blob/File en FormData y rechaza el objeto
   * {uri, name, type} con "Unsupported FormDataPart implementation".
   *
   * Robusto contra URIs ajenas (DocumentPicker): verifica que el archivo
   * exista, lo copia a un directorio propio del caché y, si la vía legacy
   * falla (ej. "isn't readable" en Android), reintenta con la API nueva
   * (File.upload), que usa otro camino nativo.
   */
  async uploadProfileImage(uri: string, prefix = "profile"): Promise<string> {
    const ext = uri.split("?")[0].toLowerCase().endsWith(".png")
      ? "png"
      : "jpg";
    const mimeType = mimeTypeFromUri(uri);
    const url = `${API_CONFIG.BASE_URL}/uploads/profile-image`;

    // 1. El archivo tiene que existir todavía (el caché de Expo Go se puede
    // evictar entre sesiones; en ese caso hay que volver a elegir la foto).
    // 2. Copiar a un directorio propio: los URIs de DocumentPicker a veces
    // no son legibles directamente por el uploader nativo.
    // Todo error nativo de esta fase se envuelve en ApiError para no perder
    // el mensaje original (el hook lo muestra en el banner).
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      throw new ApiError("No hay almacenamiento disponible.", 0, "NO_CACHE");
    }
    const dir = `${cacheDir}profile-uploads/`;
    let dest: string;
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) {
        throw new Error("archivo inexistente");
      }
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      dest = `${dir}${prefix}-${Date.now()}.${ext}`;
      await FileSystem.copyAsync({ from: uri, to: dest });
    } catch (e: unknown) {
      if (e instanceof ApiError) throw e;
      const detail = e instanceof Error ? e.message : String(e);
      if (/inexistente/.test(detail)) {
        throw new ApiError(
          "La imagen ya no está disponible. Elegila de nuevo.",
          0,
          "FILE_MISSING",
        );
      }
      throw new ApiError(
        `No se pudo preparar la imagen: ${detail}`,
        0,
        "FILE_PREP_ERROR",
      );
    }

    // 3. Subir: vía legacy primero, vía nueva API como fallback. Si el token
    // expiró a mitad del flujo (401/403), refrescar y reintentar una vez.
    let status: number;
    let body: string;
    try {
      const first = await attemptUpload(url, dest, mimeType, await authHeaders());
      status = first.status;
      body = first.body;
      if ((status === 401 || status === 403) && (await refreshSession())) {
        const retry = await attemptUpload(url, dest, mimeType, await authHeaders());
        status = retry.status;
        body = retry.body;
      }
    } catch {
      throw new ApiError(
        "No se pudo subir la imagen. Probá con otra foto.",
        0,
        "NETWORK_ERROR",
      );
    }

    // Limpieza best-effort de la copia temporal.
    try {
      await FileSystem.deleteAsync(dest, { idempotent: true });
    } catch {
      // ignorar: el SO evicta el caché solo
    }

    const data = parseUploadBody(status, body);
    if (status === 401 || status === 403) {
      throw new ApiError(
        "Sesión expirada. Volvé a iniciar sesión.",
        status,
        "SESSION_EXPIRED",
      );
    }
    if (status < 200 || status >= 300 || !data.url) {
      throw new ApiError(
        data.message || data.error || `Error HTTP ${status}`,
        status,
        data.error || "UPLOAD_ERROR",
      );
    }
    return data.url;
  },
};
