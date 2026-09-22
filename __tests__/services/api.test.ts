import { apiClient, ApiError } from "../../src/services/api";
import { tokenStorage } from "../../src/services/tokenStorage";

describe("apiClient", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("makes successful json request", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ success: true, data: "test" }),
    });

    const data = await apiClient<{ success: boolean; data: string }>("/test");
    expect(data).toEqual({ success: true, data: "test" });
  });

  it("throws ApiError on non-ok status code without retry when 400", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: { get: () => "application/json" },
      json: async () => ({ message: "Bad request", error: "BAD_REQUEST" }),
    });

    await expect(apiClient("/test")).rejects.toThrow(ApiError);
  });

  it("refreshes the token and retries the request with it on 401", async () => {
    jest
      .spyOn(tokenStorage, "getRefreshToken")
      .mockResolvedValue("refresh-token-1");
    let storedAccess: string | null = null;
    jest
      .spyOn(tokenStorage, "getAccessToken")
      .mockImplementation(async () => storedAccess);
    const setAccessSpy = jest
      .spyOn(tokenStorage, "setAccessToken")
      .mockImplementation(async (token) => {
        storedAccess = token;
      });
    const setRefreshSpy = jest
      .spyOn(tokenStorage, "setRefreshToken")
      .mockResolvedValue();

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: () => "application/json" },
        json: async () => ({
          message: "Token de acceso invalido o expirado",
          error: "INVALID_ACCESS_TOKEN",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({ ok: true }),
      });
    global.fetch = fetchMock;

    const data = await apiClient<{ ok: boolean }>("/secured/resource");
    expect(data).toEqual({ ok: true });

    const calls = fetchMock.mock.calls;
    expect(calls).toHaveLength(3);
    expect(calls[0][0]).toContain("/secured/resource");
    expect(calls[1][0]).toContain("/auth/refresh-token");
    expect(calls[2][0]).toContain("/secured/resource");

    const retryHeaders = calls[2][1].headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe("Bearer new-access-token");
    expect(setAccessSpy).toHaveBeenCalledWith("new-access-token");
    expect(setRefreshSpy).toHaveBeenCalledWith("new-refresh-token");
  });

  it("rejects with the original 401 when the refresh token is invalid", async () => {
    jest
      .spyOn(tokenStorage, "getRefreshToken")
      .mockResolvedValue("refresh-token-1");

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: () => "application/json" },
        json: async () => ({
          message: "Token de acceso invalido o expirado",
          error: "INVALID_ACCESS_TOKEN",
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: () => "application/json" },
        json: async () => ({
          message: "Token de refresco inválido, expirado o ya utilizado",
          error: "INVALID_REFRESH_TOKEN",
        }),
      });

    await expect(apiClient("/secured/resource")).rejects.toMatchObject({
      statusCode: 401,
      message: "Token de acceso invalido o expirado",
    });
  });

  it("rejects with 401 without trying to refresh when no refresh token exists", async () => {
    jest.spyOn(tokenStorage, "getRefreshToken").mockResolvedValue(null);

    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => "application/json" },
      json: async () => ({
        message: "Token de acceso invalido o expirado",
        error: "INVALID_ACCESS_TOKEN",
      }),
    });
    global.fetch = fetchMock;

    await expect(apiClient("/secured/resource")).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
