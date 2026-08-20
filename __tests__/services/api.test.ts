import { apiClient, ApiError } from "../../src/services/api";

describe("apiClient", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
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
});
