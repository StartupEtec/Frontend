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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Try to refresh the access token using the stored refresh token.
 * Stores the new tokens on success. Returns null on any failure so the
 * caller can surface the original 401 error.
 */
async function refreshTokens(): Promise<RefreshTokenResponse | null> {
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    API_CONFIG.DEFAULT_TIMEOUT,
  );

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const data = (await response.json()) as RefreshTokenResponse;
    if (!data.accessToken || !data.refreshToken) return null;

    await tokenStorage.setAccessToken(data.accessToken);
    await tokenStorage.setRefreshToken(data.refreshToken);
    return data;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = API_CONFIG.MAX_RETRIES,
  retryDelay = API_CONFIG.INITIAL_RETRY_DELAY,
  allowRefresh = true,
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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
    ...((options.headers as Record<string, string>) || {}),
  };
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

      // Retry on transient 5xx server errors if retries remaining
      if (response.status >= 500 && retries > 0) {
        await delay(retryDelay);
        return apiClient<T>(endpoint, options, retries - 1, retryDelay * 2);
      }

      // Auto-refresh the access token once on 401, then retry the request
      if (
        response.status === 401 &&
        allowRefresh &&
        !endpoint.endsWith("/auth/refresh-token")
      ) {
        const refreshed = await refreshTokens();
        if (refreshed) {
          return apiClient<T>(endpoint, options, retries, retryDelay, false);
        }
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
