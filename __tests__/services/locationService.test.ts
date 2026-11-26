import { locationService } from "../../src/services/locationService";
import { apiClient, ApiError } from "../../src/services/api";
import { SavedLocation } from "../../src/types/location";

jest.mock("../../src/services/api", () => {
  const actual = jest.requireActual("../../src/services/api");
  return { ...actual, apiClient: jest.fn() };
});

const mockApiClient = apiClient as jest.Mock;

const makeLocation = (
  overrides: Partial<SavedLocation> = {},
): SavedLocation => ({
  id: "loc-1",
  user_id: "user-123",
  address: "Av. Corrientes 1234, CABA",
  latitude: -34.6037,
  longitude: -58.3816,
  is_primary: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("locationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists the user locations", async () => {
    const location = makeLocation();
    mockApiClient.mockResolvedValueOnce({ locations: [location], count: 1 });

    const result = await locationService.list("user-123");

    expect(mockApiClient).toHaveBeenCalledWith("/users/user-123/locations", {
      method: "GET",
    });
    expect(result).toEqual([location]);
  });

  it("adds reference coordinates as query params", async () => {
    mockApiClient.mockResolvedValueOnce({ locations: [], count: 0 });

    await locationService.list("user-123", {
      latitude: -34.6,
      longitude: -58.38,
    });

    expect(mockApiClient).toHaveBeenCalledWith(
      "/users/user-123/locations?lat=-34.6&lng=-58.38",
      { method: "GET" },
    );
  });

  it("returns an empty array when the response has no locations", async () => {
    mockApiClient.mockResolvedValueOnce({ count: 0 });

    await expect(locationService.list("user-123")).resolves.toEqual([]);
  });

  it("creates a location", async () => {
    const location = makeLocation({ is_primary: false });
    mockApiClient.mockResolvedValueOnce({ message: "ok", location });

    const payload = {
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      is_primary: false,
    };
    const result = await locationService.create("user-123", payload);

    expect(mockApiClient).toHaveBeenCalledWith("/users/user-123/locations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(location);
  });

  it("updates a location", async () => {
    const location = makeLocation();
    mockApiClient.mockResolvedValueOnce({ message: "ok", location });

    const result = await locationService.update("loc-1", { is_primary: true });

    expect(mockApiClient).toHaveBeenCalledWith("/locations/loc-1", {
      method: "PATCH",
      body: JSON.stringify({ is_primary: true }),
    });
    expect(result).toEqual(location);
  });

  it("sends coverage_radius_km to the backend", async () => {
    // El backend ya persiste el campo, así que viaja en el body.
    mockApiClient.mockResolvedValueOnce({
      message: "ok",
      location: makeLocation(),
    });

    await locationService.create("user-123", {
      address: "Av. Corrientes 1234",
      latitude: -34.6,
      longitude: -58.4,
      is_primary: false,
      coverage_radius_km: 2.5,
    });

    const body = (mockApiClient.mock.calls[0][1] as { body: string }).body;
    expect(JSON.parse(body)).toHaveProperty("coverage_radius_km", 2.5);
  });

  it("retries without coverage_radius_km when the backend rejects it", async () => {
    // Backend viejo (sin la migración): Joi responde 400 "… is not allowed".
    mockApiClient
      .mockRejectedValueOnce(
        new ApiError('"coverage_radius_km" is not allowed.', 400),
      )
      .mockResolvedValueOnce({ message: "ok", location: makeLocation() });

    await locationService.update("loc-1", {
      address: "Av. Corrientes 1234",
      coverage_radius_km: 5,
    });

    expect(mockApiClient).toHaveBeenCalledTimes(2);
    const first = JSON.parse(
      (mockApiClient.mock.calls[0][1] as { body: string }).body,
    );
    const second = JSON.parse(
      (mockApiClient.mock.calls[1][1] as { body: string }).body,
    );
    expect(first).toHaveProperty("coverage_radius_km", 5);
    expect(second).not.toHaveProperty("coverage_radius_km");
    expect(second).toEqual({ address: "Av. Corrientes 1234" });
  });

  it("propagates unrelated validation errors without retrying", async () => {
    mockApiClient.mockRejectedValueOnce(
      new ApiError("La dirección es requerida", 400),
    );

    await expect(
      locationService.update("loc-1", {
        address: "Av. Corrientes 1234",
        coverage_radius_km: 5,
      }),
    ).rejects.toThrow("La dirección es requerida");

    expect(mockApiClient).toHaveBeenCalledTimes(1);
  });

  it("deletes a location", async () => {
    mockApiClient.mockResolvedValueOnce({ message: "ok" });

    await locationService.remove("loc-1");

    expect(mockApiClient).toHaveBeenCalledWith("/locations/loc-1", {
      method: "DELETE",
    });
  });
});
