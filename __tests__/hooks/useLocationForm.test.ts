import { renderHook, act } from "@testing-library/react-native";
import {
  useLocationForm,
  MIN_ADDRESS_LENGTH,
} from "../../src/hooks/useLocationForm";
import { geocodingService } from "../../src/services/geocodingService";
import { SavedLocation } from "../../src/types/location";

jest.mock("../../src/services/geocodingService", () => ({
  geocodingService: { search: jest.fn(), reverse: jest.fn() },
}));

const makeLocation = (
  overrides: Partial<SavedLocation> = {},
): SavedLocation => ({
  id: "loc-1",
  user_id: "user-123",
  address: "Av. Corrientes 1234",
  latitude: -34.6037,
  longitude: -58.3816,
  is_primary: false,
  ...overrides,
});

describe("useLocationForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (geocodingService.search as jest.Mock).mockResolvedValue([]);
    (geocodingService.reverse as jest.Mock).mockResolvedValue(null);
  });

  it("starts empty for creation", () => {
    const { result } = renderHook(() => useLocationForm(null));

    expect(result.current.address).toBe("");
    expect(result.current.coordinates).toBeNull();
    expect(result.current.isPrimary).toBe(false);
  });

  it("preloads an existing location for editing", () => {
    const { result } = renderHook(() =>
      useLocationForm(makeLocation({ is_primary: true })),
    );

    expect(result.current.address).toBe("Av. Corrientes 1234");
    expect(result.current.coordinates).toEqual({
      latitude: -34.6037,
      longitude: -58.3816,
    });
    expect(result.current.isPrimary).toBe(true);
  });

  it("flags missing address and coordinates", () => {
    const { result } = renderHook(() => useLocationForm(null));

    let valid = true;
    act(() => {
      valid = result.current.validate();
    });

    expect(valid).toBe(false);
    expect(result.current.errors.address).toBeDefined();
    expect(result.current.errors.coordinates).toBeDefined();
  });

  it("builds a trimmed payload once valid", () => {
    const { result } = renderHook(() => useLocationForm(null));

    act(() => {
      result.current.changeAddress("  Calle Falsa 123  ");
      result.current.setCoordinates({ latitude: -34.6, longitude: -58.4 });
    });

    let valid = false;
    act(() => {
      valid = result.current.validate();
    });

    expect(valid).toBe(true);
    expect(result.current.buildPayload()).toEqual({
      address: "Calle Falsa 123",
      latitude: -34.6,
      longitude: -58.4,
      is_primary: false,
      coverage_radius_km: null,
    });
  });

  it("accepts a comma decimal for the coverage radius", () => {
    const { result } = renderHook(() => useLocationForm(null));

    act(() => {
      result.current.changeAddress("Calle Falsa 123");
      result.current.setCoordinates({ latitude: -34.6, longitude: -58.4 });
      result.current.changeCoverageRadiusKm("2,5");
    });

    let valid = false;
    act(() => {
      valid = result.current.validate();
    });

    expect(valid).toBe(true);
    expect(result.current.buildPayload().coverage_radius_km).toBe(2.5);
  });

  it("rejects a non-numeric coverage radius", () => {
    const { result } = renderHook(() => useLocationForm(null));

    act(() => {
      result.current.changeCoverageRadiusKm("abc");
    });

    let valid = true;
    act(() => {
      valid = result.current.validate();
    });

    expect(valid).toBe(false);
    expect(result.current.errors.coverageRadiusKm).toBeTruthy();
  });

  it("searches from the minimum length and stores the results", async () => {
    (geocodingService.search as jest.Mock).mockResolvedValueOnce([
      { label: "Resultado", latitude: 1, longitude: 2 },
    ]);

    const { result } = renderHook(() => useLocationForm(null));
    await act(async () => {
      await result.current.searchAddress("Calle");
    });

    expect(geocodingService.search).toHaveBeenCalledWith("Calle");
    expect(result.current.results).toHaveLength(1);
    expect(result.current.searching).toBe(false);
  });

  it("skips the search for too-short queries", async () => {
    const { result } = renderHook(() => useLocationForm(null));
    await act(async () => {
      await result.current.searchAddress("a".repeat(MIN_ADDRESS_LENGTH - 1));
    });

    expect(geocodingService.search).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it("applies the selected result to address and coordinates", () => {
    const { result } = renderHook(() => useLocationForm(null));

    act(() => {
      result.current.selectResult({
        label: "Av. Siempreviva 742",
        latitude: -34.6,
        longitude: -58.4,
      });
    });

    expect(result.current.address).toBe("Av. Siempreviva 742");
    expect(result.current.coordinates).toEqual({
      latitude: -34.6,
      longitude: -58.4,
    });
    expect(result.current.results).toEqual([]);
  });

  it("reverse-geocodes when moving the pin without a typed address", async () => {
    (geocodingService.reverse as jest.Mock).mockResolvedValueOnce(
      "Calle Nueva 100",
    );

    const { result } = renderHook(() => useLocationForm(null));
    await act(async () => {
      await result.current.moveToCoordinates({
        latitude: -34.6,
        longitude: -58.4,
      });
    });

    expect(geocodingService.reverse).toHaveBeenCalledWith(-34.6, -58.4);
    expect(result.current.address).toBe("Calle Nueva 100");
    expect(result.current.resolving).toBe(false);
  });

  it("keeps a manually typed address when moving the pin", async () => {
    const { result } = renderHook(() => useLocationForm(null));

    act(() => {
      result.current.changeAddress("Mi dirección escrita");
    });
    await act(async () => {
      await result.current.moveToCoordinates({
        latitude: -34.6,
        longitude: -58.4,
      });
    });

    expect(geocodingService.reverse).not.toHaveBeenCalled();
    expect(result.current.address).toBe("Mi dirección escrita");
  });
});
