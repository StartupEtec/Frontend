import { apiClient, ApiError } from "../../src/services/api";
import { tokenStorage } from "../../src/services/tokenStorage";

jest.mock("../../src/services/tokenStorage", () => ({
  tokenStorage: {
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    getUserId: jest.fn(),
    saveAuth: jest.fn(),
    clear: jest.fn(),
  },
}));

const jsonRes = (body: unknown, init: { ok: boolean; status?: number } = { ok: true }) => ({
  ok: init.ok,
  status: init.status ?? (init.ok ? 200 : 500),
  headers: { get: () => "application/json" },
  json: async () => body,
});

describe("apiClient", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    (tokenStorage.getAccessToken as jest.Mock).mockResolvedValue("token-1");
    (tokenStorage.getRefreshToken as jest.Mock).mockResolvedValue("refresh-1");
    (tokenStorage.getUserId as jest.Mock).mockResolvedValue("user-123");
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("makes successful json request", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
      jsonRes({ success: true, data: "test" }),
    );

    const data = await apiClient<{ success: boolean; data: string }>("/test");
    expect(data).toEqual({ success: true, data: "test" });
  });

  it("throws ApiError on non-ok status code without retry when 400", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
      jsonRes({ message: "Bad request", error: "BAD_REQUEST" }, { ok: false, status: 400 }),
    );

    await expect(apiClient("/test")).rejects.toThrow(ApiError);
  });

  it("refreshes session and retries once on 403 expired token", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        jsonRes({ message: "Token inválido o expirado", error: "FORBIDDEN" }, { ok: false, status: 403 }),
      )
      .mockResolvedValueOnce(jsonRes({ accessToken: "a2", refreshToken: "r2" }))
      .mockResolvedValueOnce(jsonRes({ ok: true }));

    const data = await apiClient<{ ok: boolean }>("/users/user-123/client-profile");

    expect(tokenStorage.saveAuth).toHaveBeenCalledWith({
      accessToken: "a2",
      refreshToken: "r2",
      userId: "user-123",
    });
    expect(data).toEqual({ ok: true });
    const calls = (global.fetch as jest.Mock).mock.calls;
    expect(calls[1][0]).toContain("/auth/refresh-token");
  });

  it("throws SESSION_EXPIRED and clears storage when refresh fails", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        jsonRes({ message: "Token inválido o expirado", error: "FORBIDDEN" }, { ok: false, status: 403 }),
      )
      .mockResolvedValueOnce(
        jsonRes({ message: "Revocado", error: "INVALID_REFRESH_TOKEN" }, { ok: false, status: 401 }),
      );

    await expect(apiClient("/users/user-123")).rejects.toMatchObject({
      errorCode: "SESSION_EXPIRED",
    });
    expect(tokenStorage.clear).toHaveBeenCalled();
  });

  it("does not attempt refresh for /auth/* endpoints", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
      jsonRes({ message: "Bad", error: "X" }, { ok: false, status: 401 }),
    );

    await expect(apiClient("/auth/login")).rejects.toThrow(ApiError);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
