import { tokenStorage } from "./tokenStorage";

/**
 * Centralized API Client with Timeout and Exponential Backoff Retries
 */

export interface ApiErrorData {
  error?: string;
  message?: string;
  statusCode?: number;
}

export class ApiError extends Error {
  public statusCode: number;
  public errorCode?: string;

  constructor(message: string, statusCode: number, errorCode?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3000/api/v1",
  DEFAULT_TIMEOUT: 10000, // 10s
  MAX_RETRIES: 2,
  INITIAL_RETRY_DELAY: 500, // ms
};

/** Origen sin el sufijo /api/v1 (para mostrar archivos de /uploads/...). */
export function apiOrigin(): string {
  return API_CONFIG.BASE_URL.replace(/\/api\/v1\/?$/, "");
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Refresh de sesión compartido (una sola llamada en vuelo aunque varios
// requests reciban 401/403 a la vez). El backend rota el refresh token.
let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  try {
    const [refreshToken, userId] = await Promise.all([
      tokenStorage.getRefreshToken(),
      tokenStorage.getUserId(),
    ]);
    if (!refreshToken || !userId) return false;
    const res = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      // Refresh inválido/expirado/revocado: no hay sesión que salvar.
      if (res.status === 401 || res.status === 403) {
        await tokenStorage.clear();
      }
      return false;
    }
    const data = (await res.json()) as {
      accessToken?: string;
      refreshToken?: string;
    };
    if (!data.accessToken || !data.refreshToken) return false;
    await tokenStorage.saveAuth({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      userId,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Renueva la sesión si es necesario. Devuelve true si hay access token
 * utilizable después del intento (ya sea porque se refrescó o porque otro
 * llamado concurrente lo refrescó).
 */
export function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** Los endpoints de auth nunca intentan refresh (evita loops). */
function isAuthEndpoint(endpoint: string): boolean {
  return endpoint.startsWith("/auth/");
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = API_CONFIG.MAX_RETRIES,
  retryDelay = API_CONFIG.INITIAL_RETRY_DELAY,
  retriedAfterRefresh = false,
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_CONFIG.BASE_URL}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    API_CONFIG.DEFAULT_TIMEOUT,
  );

  const token = await tokenStorage.getAccessToken();
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (isFormData) {
    // fetch genera el boundary de multipart automáticamente
    delete headers["Content-Type"];
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");
    const data: ApiErrorData & T = isJson ? await response.json() : {};

    if (!response.ok) {
      const errorMessage =
        data.message || data.error || `Error HTTP ${response.status}`;
      const errorCode = data.error || "SERVER_ERROR";

      // Access token expirado o inválido (el backend usa 401 sin token y
      // 403 con token inválido/expirado): refrescar una vez y reintentar.
      // No importa cuánto tiempo pasó desde el login.
      if (
        (response.status === 401 || response.status === 403) &&
        !retriedAfterRefresh &&
        !isAuthEndpoint(endpoint)
      ) {
        const refreshed = await refreshSession();
        if (refreshed) {
          return apiClient<T>(endpoint, options, retries, retryDelay, true);
        }
        throw new ApiError(
          "Sesión expirada. Volvé a iniciar sesión.",
          response.status,
          "SESSION_EXPIRED",
        );
      }

      // Retry on transient 5xx server errors if retries remaining
      if (response.status >= 500 && retries > 0) {
        await delay(retryDelay);
        return apiClient<T>(
          endpoint,
          options,
          retries - 1,
          retryDelay * 2,
          retriedAfterRefresh,
        );
      }

      throw new ApiError(errorMessage, response.status, errorCode);
    }

    return data as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    // Network timeout or connection drop retries
    if (retries > 0 && error.name !== "AbortError") {
      await delay(retryDelay);
      return apiClient<T>(endpoint, options, retries - 1, retryDelay * 2);
    }

    if (error.name === "AbortError") {
      throw new ApiError(
        "La solicitud ha superado el tiempo de espera. Reintenta.",
        408,
        "TIMEOUT",
      );
    }

    throw new ApiError(
      error.message || "Error de conexión a la red. Verifica tu internet.",
      0,
      "NETWORK_ERROR",
    );
  }
}
