import {
  geocodingService,
  GEOCODING_CONFIG,
} from "../../src/services/geocodingService";
import { ApiError } from "../../src/services/api";

jest.mock("../../src/services/api", () => {
  class ApiError extends Error {
    statusCode: number;
    errorCode?: string;
    constructor(message: string, statusCode: number, errorCode?: string) {
      super(message);
      this.name = "ApiError";
      this.statusCode = statusCode;
      this.errorCode = errorCode;
    }
  }
  return { ApiError };
});

const mockFetch = jest.fn();

const okResponse = (json: unknown) => ({
  ok: true,
  status: 200,
  json: async () => json,
});

describe("geocodingService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as unknown as { fetch: jest.Mock }).fetch = mockFetch;
  });

  describe("search", () => {
    it("returns [] without calling fetch for short queries", async () => {
      await expect(geocodingService.search("ab")).resolves.toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("maps Nominatim results to label + coordinates", async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse([
          {
            display_name: "Av. Corrientes 1234, CABA",
            lat: "-34.6037",
            lon: "-58.3816",
          },
        ]),
      );

      const results = await geocodingService.search("Av. Corrientes");

      expect(results).toEqual([
        {
          label: "Av. Corrientes 1234, CABA",
          latitude: -34.6037,
          longitude: -58.3816,
        },
      ]);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain(`${GEOCODING_CONFIG.BASE_URL}/search?`);
      expect(url).toContain("q=Av.+Corrientes");
      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: "GET" });
    });

    it("ignores results with invalid or missing coordinates", async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse([
          { display_name: "sin coords" },
          { display_name: "fuera de rango", lat: "999", lon: "999" },
          { display_name: "ok", lat: "10", lon: "20" },
        ]),
      );

      const results = await geocodingService.search("calle");

      expect(results).toEqual([{ label: "ok", latitude: 10, longitude: 20 }]);
    });

    it("throws an ApiError when the service responds with an error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({}),
      });

      await expect(geocodingService.search("calle")).rejects.toBeInstanceOf(
        ApiError,
      );
    });

    it("throws a timeout ApiError when the request aborts", async () => {
      const abortError = new Error("aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValueOnce(abortError);

      await expect(geocodingService.search("calle")).rejects.toMatchObject({
        statusCode: 408,
      });
    });
  });

  describe("reverse", () => {
    it("returns the display name for coordinates", async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ display_name: "Av. Siempreviva 742" }),
      );

      await expect(geocodingService.reverse(-34.6, -58.38)).resolves.toBe(
        "Av. Siempreviva 742",
      );

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain(`${GEOCODING_CONFIG.BASE_URL}/reverse?`);
      expect(url).toContain("lat=-34.6");
      expect(url).toContain("lon=-58.38");
    });

    it("returns null when the request fails (soft-fail)", async () => {
      mockFetch.mockRejectedValueOnce(new Error("network"));

      await expect(geocodingService.reverse(-34.6, -58.38)).resolves.toBeNull();
    });

    it("returns null when there is no display name", async () => {
      mockFetch.mockResolvedValueOnce(okResponse({}));

      await expect(geocodingService.reverse(-34.6, -58.38)).resolves.toBeNull();
    });
  });
});
