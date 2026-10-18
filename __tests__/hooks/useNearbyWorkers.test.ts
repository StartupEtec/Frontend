import { renderHook, act } from "@testing-library/react-native";
import { useNearbyWorkers } from "../../src/hooks/useNearbyWorkers";
import { workerSearchService } from "../../src/services/workerSearchService";
import { ApiError } from "../../src/services/api";
import { Coordinates } from "../../src/types/location";
import { NearbyWorker } from "../../src/types/worker";

jest.mock("../../src/services/workerSearchService", () => ({
  workerSearchService: { nearby: jest.fn() },
}));

const mockNearby = workerSearchService.nearby as jest.Mock;

const flush = () => act(async () => {});

const makeWorker = (overrides: Partial<NearbyWorker> = {}): NearbyWorker => ({
  worker_id: "worker-1",
  user_id: "user-456",
  full_name: "Ana Pérez",
  avatar_url: null,
  category_id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f003",
  category_name: "Electricidad",
  hourly_rate: 12500,
  availability_status: "AVAILABLE",
  certification_status: "APPROVED",
  average_rating: "4.5",
  distance_km: 1.2,
  latitude: -34.61,
  longitude: -58.39,
  ...overrides,
});

const response = (workers: NearbyWorker[]) => ({
  workers,
  count: workers.length,
  limit: 50,
  offset: 0,
});

const centerA: Coordinates = { latitude: -34.6037, longitude: -58.3816 };
const centerB: Coordinates = { latitude: -34.62, longitude: -58.4 };

const renderSearch = (initialCenter: Coordinates | null = centerA) =>
  renderHook(
    ({ center }: { center: Coordinates | null }) =>
      useNearbyWorkers({ center, radiusKm: 10, categoryId: null }),
    { initialProps: { center: initialCenter } },
  );

describe("useNearbyWorkers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stays idle and does not query without a center", () => {
    const { result } = renderSearch(null);

    expect(result.current.status).toBe("idle");
    expect(result.current.workers).toEqual([]);
    expect(mockNearby).not.toHaveBeenCalled();
  });

  it("loads workers with the spinner on first fetch", async () => {
    mockNearby.mockResolvedValue(response([makeWorker()]));

    const { result } = renderSearch();

    expect(result.current.status).toBe("loading");
    await flush();

    expect(result.current.status).toBe("success");
    expect(result.current.workers).toHaveLength(1);
    expect(result.current.refreshing).toBe(false);
    expect(mockNearby).toHaveBeenCalledWith({
      latitude: centerA.latitude,
      longitude: centerA.longitude,
      radius_km: 10,
      category_id: undefined,
      limit: 50,
    });
  });

  it("re-queries silently when the radius changes", async () => {
    mockNearby.mockResolvedValue(response([makeWorker()]));

    const { result, rerender } = renderHook(
      ({ radiusKm }: { radiusKm: number }) =>
        useNearbyWorkers({ center: centerA, radiusKm, categoryId: null }),
      { initialProps: { radiusKm: 10 } },
    );
    await flush();
    expect(result.current.status).toBe("success");

    rerender({ radiusKm: 25 });
    expect(result.current.refreshing).toBe(true);
    await flush();

    expect(mockNearby).toHaveBeenCalledTimes(2);
    expect(mockNearby).toHaveBeenLastCalledWith(
      expect.objectContaining({ radius_km: 25 }),
    );
    // La recarga silenciosa no vuelve a "loading": conserva los resultados.
    expect(result.current.status).toBe("success");
    expect(result.current.refreshing).toBe(false);
  });

  it("re-queries when the center moves (map pan)", async () => {
    mockNearby.mockResolvedValue(response([]));

    const { rerender } = renderHook(
      ({ center }: { center: Coordinates | null }) =>
        useNearbyWorkers({ center, radiusKm: 10, categoryId: null }),
      { initialProps: { center: centerA } },
    );
    await flush();

    rerender({ center: centerB });
    await flush();

    expect(mockNearby).toHaveBeenLastCalledWith(
      expect.objectContaining({
        latitude: centerB.latitude,
        longitude: centerB.longitude,
      }),
    );
  });

  it("surfaces an ApiError message on failure", async () => {
    mockNearby.mockRejectedValueOnce(
      new ApiError("Sin conexión con el servidor", 0),
    );

    const { result } = renderSearch();
    await flush();

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Sin conexión con el servidor");
    expect(result.current.refreshing).toBe(false);
  });

  it("falls back to a generic message for unknown errors", async () => {
    mockNearby.mockRejectedValueOnce(new Error(""));

    const { result } = renderSearch();
    await flush();

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe(
      "No pudimos buscar trabajadores. Reintentá.",
    );
  });

  it("discards a stale response that resolves after a newer one", async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    mockNearby
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve(response([makeWorker({ worker_id: "worker-2" })])),
      );

    const { result, rerender } = renderSearch(centerA);
    rerender({ center: centerB });
    await flush();

    expect(result.current.workers[0]?.worker_id).toBe("worker-2");

    // La primera petición (centro viejo) responde al final: se descarta.
    await act(async () => {
      resolveFirst(response([makeWorker({ worker_id: "worker-1" })]));
    });

    expect(result.current.workers[0]?.worker_id).toBe("worker-2");
    expect(result.current.status).toBe("success");
  });

  it("reload always shows the loading state", async () => {
    mockNearby.mockResolvedValue(response([]));

    const { result } = renderSearch();
    await flush();
    expect(result.current.status).toBe("success");

    // Recarga manual: queda en loading mientras la petición no responde.
    mockNearby.mockReturnValueOnce(new Promise(() => {}));
    await act(async () => {
      result.current.reload();
    });

    expect(result.current.status).toBe("loading");
    expect(result.current.refreshing).toBe(true);
  });
});
