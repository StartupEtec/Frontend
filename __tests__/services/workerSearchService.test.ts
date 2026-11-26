import { workerSearchService } from "../../src/services/workerSearchService";
import { apiClient } from "../../src/services/api";

jest.mock("../../src/services/api", () => ({
  apiClient: jest.fn(),
}));

const mockApiClient = apiClient as jest.Mock;

describe("workerSearchService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClient.mockResolvedValue({
      workers: [],
      count: 0,
      limit: 50,
      offset: 0,
    });
  });

  it("queries GET /workers/nearby with the exact contract params", async () => {
    await workerSearchService.nearby({
      latitude: -34.6037,
      longitude: -58.3816,
      radius_km: 10,
    });

    expect(mockApiClient).toHaveBeenCalledWith(
      "/workers/nearby?latitude=-34.6037&longitude=-58.3816&radius_km=10",
      { method: "GET" },
    );
  });

  it("appends category, limit and offset only when provided", async () => {
    await workerSearchService.nearby({
      latitude: -34.6,
      longitude: -58.38,
      radius_km: 25,
      category_id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f003",
      limit: 50,
      offset: 0,
    });

    const url = (mockApiClient as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain("category_id=d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f003");
    expect(url).toContain("limit=50");
    expect(url).toContain("offset=0");
  });

  it("omits a null category so Joi never sees an empty param", async () => {
    await workerSearchService.nearby({
      latitude: -34.6,
      longitude: -58.38,
      radius_km: 1,
      category_id: null,
    });

    const url = (mockApiClient as jest.Mock).mock.calls[0][0] as string;
    expect(url).not.toContain("category_id");
    expect(url).not.toContain("limit");
    expect(url).not.toContain("offset");
  });

  it("normalizes an unexpected body to an empty workers list", async () => {
    mockApiClient.mockResolvedValue({} as never);

    const result = await workerSearchService.nearby({
      latitude: -34.6,
      longitude: -58.38,
      radius_km: 10,
    });

    expect(result.workers).toEqual([]);
  });

  it("propagates api errors", async () => {
    const failure = new Error("offline");
    mockApiClient.mockRejectedValueOnce(failure);

    await expect(
      workerSearchService.nearby({
        latitude: -34.6,
        longitude: -58.38,
        radius_km: 10,
      }),
    ).rejects.toThrow("offline");
  });
});
