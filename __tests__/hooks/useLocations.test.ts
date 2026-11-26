import { renderHook, act } from "@testing-library/react-native";
import { useLocations } from "../../src/hooks/useLocations";
import { locationService } from "../../src/services/locationService";
import { tokenStorage } from "../../src/services/tokenStorage";
import { coverageRadiusStorage } from "../../src/services/coverageRadiusStorage";
import { ApiError } from "../../src/services/api";
import { Coordinates, SavedLocation } from "../../src/types/location";

jest.mock("../../src/services/locationService", () => ({
  locationService: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock("../../src/services/tokenStorage", () => ({
  tokenStorage: { getUserId: jest.fn() },
}));

const flush = () => act(async () => {});

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

describe("useLocations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (tokenStorage.getUserId as jest.Mock).mockResolvedValue("user-123");
    (locationService.list as jest.Mock).mockResolvedValue([makeLocation()]);
  });

  it("loads the locations on mount", async () => {
    const { result } = renderHook(() => useLocations());
    await flush();

    expect(result.current.status).toBe("success");
    expect(result.current.locations).toHaveLength(1);
    expect(locationService.list).toHaveBeenCalledWith("user-123");
  });

  it("shows the server error when loading fails", async () => {
    (locationService.list as jest.Mock).mockRejectedValueOnce(
      new ApiError("No pudimos cargar", 500, "SERVER_ERROR"),
    );

    const { result } = renderHook(() => useLocations());
    await flush();

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("No pudimos cargar");
  });

  it("shows a session error when there is no userId", async () => {
    (tokenStorage.getUserId as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useLocations());
    await flush();

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe(
      "Sesión expirada. Volvé a iniciar sesión.",
    );
    expect(locationService.list).not.toHaveBeenCalled();
  });

  it("sorts the primary location first", async () => {
    (locationService.list as jest.Mock).mockResolvedValueOnce([
      makeLocation({ id: "a", is_primary: false }),
      makeLocation({ id: "b", is_primary: true }),
    ]);

    const { result } = renderHook(() => useLocations());
    await flush();

    expect(result.current.locations[0].id).toBe("b");
  });

  it("creates a location and puts it first when primary", async () => {
    const created = makeLocation({
      id: "loc-2",
      address: "Nueva 1",
      is_primary: true,
    });
    (locationService.create as jest.Mock).mockResolvedValueOnce(created);

    const { result } = renderHook(() => useLocations());
    await flush();

    let returned: SavedLocation | null = null;
    await act(async () => {
      returned = await result.current.createLocation({
        address: "Nueva 1",
        latitude: 1,
        longitude: 2,
        is_primary: true,
      });
    });

    expect(locationService.create).toHaveBeenCalledWith("user-123", {
      address: "Nueva 1",
      latitude: 1,
      longitude: 2,
      is_primary: true,
    });
    expect(returned).toEqual({ ...created, coverage_radius_km: null });
    expect(result.current.locations[0].id).toBe("loc-2");
    expect(result.current.actionError).toBeNull();
  });

  it("demotes the previous primary when a new primary is created", async () => {
    (locationService.list as jest.Mock).mockResolvedValueOnce([
      makeLocation({ id: "old", is_primary: true }),
    ]);
    (locationService.create as jest.Mock).mockResolvedValueOnce(
      makeLocation({ id: "new", is_primary: true }),
    );

    const { result } = renderHook(() => useLocations());
    await flush();

    await act(async () => {
      await result.current.createLocation({
        address: "x",
        latitude: 1,
        longitude: 2,
        is_primary: true,
      });
    });

    const old = result.current.locations.find((l) => l.id === "old");
    expect(old?.is_primary).toBe(false);
    expect(result.current.locations[0].id).toBe("new");
  });

  it("surfaces an error when creation fails", async () => {
    (locationService.create as jest.Mock).mockRejectedValueOnce(
      new ApiError("Límite alcanzado", 409, "LOCATION_LIMIT_REACHED"),
    );

    const { result } = renderHook(() => useLocations());
    await flush();

    let returned: SavedLocation | null = makeLocation();
    await act(async () => {
      returned = await result.current.createLocation({
        address: "x",
        latitude: 1,
        longitude: 2,
      });
    });

    expect(returned).toBeNull();
    expect(result.current.actionError).toBe("Límite alcanzado");
    expect(result.current.saving).toBe(false);
  });

  it("updates a location in place", async () => {
    const initial = makeLocation({ id: "loc-1", address: "Vieja" });
    (locationService.list as jest.Mock).mockResolvedValueOnce([initial]);
    (locationService.update as jest.Mock).mockResolvedValueOnce({
      ...initial,
      address: "Nueva dirección",
    });

    const { result } = renderHook(() => useLocations());
    await flush();

    await act(async () => {
      await result.current.updateLocation("loc-1", {
        address: "Nueva dirección",
      });
    });

    expect(result.current.locations).toHaveLength(1);
    expect(result.current.locations[0].address).toBe("Nueva dirección");
  });

  it("marks a location as primary", async () => {
    (locationService.list as jest.Mock).mockResolvedValueOnce([
      makeLocation({ id: "loc-1", is_primary: false }),
    ]);
    (locationService.update as jest.Mock).mockResolvedValueOnce(
      makeLocation({ id: "loc-1", is_primary: true }),
    );

    const { result } = renderHook(() => useLocations());
    await flush();

    let ok = false;
    await act(async () => {
      ok = await result.current.setPrimary("loc-1");
    });

    expect(locationService.update).toHaveBeenCalledWith("loc-1", {
      is_primary: true,
    });
    expect(ok).toBe(true);
    expect(result.current.locations[0].is_primary).toBe(true);
  });

  it("deletes a location", async () => {
    (locationService.list as jest.Mock).mockResolvedValueOnce([
      makeLocation({ id: "loc-1" }),
    ]);
    (locationService.remove as jest.Mock).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useLocations());
    await flush();

    let ok = false;
    await act(async () => {
      ok = await result.current.deleteLocation("loc-1");
    });

    expect(locationService.remove).toHaveBeenCalledWith("loc-1");
    expect(ok).toBe(true);
    expect(result.current.locations).toHaveLength(0);
  });

  it("surfaces an error when deletion fails", async () => {
    (locationService.list as jest.Mock).mockResolvedValueOnce([
      makeLocation({ id: "loc-1" }),
    ]);
    (locationService.remove as jest.Mock).mockRejectedValueOnce(
      new ApiError("No se pudo eliminar", 500, "SERVER_ERROR"),
    );

    const { result } = renderHook(() => useLocations());
    await flush();

    let ok = true;
    await act(async () => {
      ok = await result.current.deleteLocation("loc-1");
    });

    expect(ok).toBe(false);
    expect(result.current.actionError).toBe("No se pudo eliminar");
    expect(result.current.locations).toHaveLength(1);
  });

  it("reload retries the fetch and recovers", async () => {
    (locationService.list as jest.Mock)
      .mockRejectedValueOnce(new ApiError("boom", 500, "SERVER_ERROR"))
      .mockResolvedValueOnce([makeLocation()]);

    const { result } = renderHook(() => useLocations());
    await flush();
    expect(result.current.status).toBe("error");

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.status).toBe("success");
    expect(result.current.locations).toHaveLength(1);
  });

  it("orders by distance and sends the reference to the service", async () => {
    (locationService.list as jest.Mock).mockResolvedValueOnce([
      makeLocation({ id: "far", distance_m: 5000 }),
      makeLocation({ id: "near", distance_m: 120 }),
    ]);
    const reference: Coordinates = { latitude: -32.89, longitude: -68.83 };

    const { result } = renderHook(() => useLocations(reference));
    await flush();

    expect(locationService.list).toHaveBeenCalledWith("user-123", reference);
    expect(result.current.locations.map((l) => l.id)).toEqual(["near", "far"]);
  });

  it("keeps the primary on top when distances tie", async () => {
    (locationService.list as jest.Mock).mockResolvedValueOnce([
      makeLocation({ id: "a", is_primary: false, distance_m: 100 }),
      makeLocation({ id: "b", is_primary: true, distance_m: 100 }),
    ]);

    const { result } = renderHook(() =>
      useLocations({ latitude: -34.6, longitude: -58.38 }),
    );
    await flush();

    expect(result.current.locations[0].id).toBe("b");
  });

  it("refetches when the reference coordinates change", async () => {
    const { rerender } = renderHook(
      ({ reference }: { reference: Coordinates | null }) =>
        useLocations(reference),
      { initialProps: { reference: null as Coordinates | null } },
    );
    await flush();
    expect(locationService.list).toHaveBeenCalledTimes(1);
    expect(locationService.list).toHaveBeenLastCalledWith("user-123");

    rerender({ reference: { latitude: -32.89, longitude: -68.83 } });
    await flush();

    expect(locationService.list).toHaveBeenCalledTimes(2);
    expect(locationService.list).toHaveBeenLastCalledWith("user-123", {
      latitude: -32.89,
      longitude: -68.83,
    });
  });

  it("persists the coverage radius locally on create and overlays it on load", async () => {
    const created = makeLocation({ id: "loc-9", is_primary: false });
    (locationService.create as jest.Mock).mockResolvedValueOnce(created);

    const { result } = renderHook(() => useLocations());
    await flush();

    await act(async () => {
      await result.current.createLocation({
        address: "Taller",
        latitude: -34.6,
        longitude: -58.4,
        coverage_radius_km: 2.5,
      });
    });

    // Se guarda en el almacenamiento local...
    await expect(coverageRadiusStorage.getAll()).resolves.toMatchObject({
      "loc-9": 2.5,
    });
    // ...y el estado local lo refleja.
    const inList = result.current.locations.find((l) => l.id === "loc-9");
    expect(inList?.coverage_radius_km).toBe(2.5);

    // La próxima carga (sin radio en la API) lo trae del overlay.
    (locationService.list as jest.Mock).mockResolvedValueOnce([created]);
    await act(async () => {
      await result.current.reload();
    });
    const reloaded = result.current.locations.find((l) => l.id === "loc-9");
    expect(reloaded?.coverage_radius_km).toBe(2.5);
  });

  it("keeps the coverage radius when another field is updated", async () => {
    const created = makeLocation({ id: "loc-7", is_primary: false });
    (locationService.create as jest.Mock).mockResolvedValueOnce(created);
    // El backend no devuelve el radio en el PATCH de is_primary.
    (locationService.update as jest.Mock).mockResolvedValueOnce({
      ...created,
      is_primary: true,
    });

    const { result } = renderHook(() => useLocations());
    await flush();

    await act(async () => {
      await result.current.createLocation({
        address: "Taller",
        latitude: -34.6,
        longitude: -58.4,
        coverage_radius_km: 4,
      });
    });

    await act(async () => {
      await result.current.setPrimary("loc-7");
    });

    const after = result.current.locations.find((l) => l.id === "loc-7");
    expect(after?.is_primary).toBe(true);
    expect(after?.coverage_radius_km).toBe(4);
  });
});
