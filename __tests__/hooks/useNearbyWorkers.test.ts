import { renderHook, waitFor } from "@testing-library/react-native";
import {
  useNearbyWorkers,
  resetNearbyWorkersCache,
} from "../../src/hooks/useNearbyWorkers";
import { workerSearchService } from "../../src/services/workerSearchService";
import { NearbyWorker } from "../../src/types/worker";

jest.mock("../../src/services/workerSearchService", () => ({
  workerSearchService: { nearby: jest.fn() },
}));

const nearby = workerSearchService.nearby as jest.Mock;

const center = { latitude: -32.8895, longitude: -68.8458 };

const makeWorker = (id: string): NearbyWorker => ({
  worker_id: id,
  user_id: `user-${id}`,
  full_name: `Trabajador ${id}`,
  avatar_url: null,
  category_id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f003",
  category_name: "Electricidad",
  availability_status: "AVAILABLE",
  certification_status: "APPROVED",
  average_rating: "4.5",
  distance_km: 1.2,
  coverage_radius_km: 10,
  latitude: -32.89,
  longitude: -68.85,
});

const responseFor = (workers: NearbyWorker[]) => ({
  workers,
  count: workers.length,
  limit: 50,
  offset: 0,
});

describe("useNearbyWorkers", () => {
  beforeEach(() => {
    nearby.mockReset();
    resetNearbyWorkersCache();
  });

  it("stays idle and skips the request when there is no center yet", () => {
    const { result } = renderHook(() =>
      useNearbyWorkers({ center: null, radiusKm: 100 }),
    );

    expect(result.current.status).toBe("idle");
    expect(result.current.workers).toEqual([]);
    expect(nearby).not.toHaveBeenCalled();
  });

  it("fetches workers on the first load with a spinner", async () => {
    nearby.mockResolvedValue(responseFor([makeWorker("a")]));

    const { result } = renderHook(() =>
      useNearbyWorkers({ center, radiusKm: 100 }),
    );
    expect(result.current.status).toBe("loading");

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.workers).toEqual([makeWorker("a")]);
    expect(nearby).toHaveBeenCalledTimes(1);
  });

  it("reuses the last successful result instantly on remount and revalidates", async () => {
    nearby.mockResolvedValue(responseFor([makeWorker("a")]));
    const first = renderHook(() => useNearbyWorkers({ center, radiusKm: 100 }));
    await waitFor(() => expect(first.result.current.status).toBe("success"));
    first.unmount();

    // Otro conjunto de resultados para ver cuándo termina la revalidación.
    nearby.mockResolvedValue(responseFor([makeWorker("b")]));

    // Remontaje con la misma clave: arranca en success con la caché de
    // sesión (sin pasar por loading) y revalida en segundo plano.
    const second = renderHook(() =>
      useNearbyWorkers({ center, radiusKm: 100 }),
    );
    expect(second.result.current.status).toBe("success");
    expect(second.result.current.workers).toEqual([makeWorker("a")]);

    await waitFor(() =>
      expect(second.result.current.workers).toEqual([makeWorker("b")]),
    );
    expect(second.result.current.status).toBe("success");
    expect(nearby).toHaveBeenCalledTimes(2);
  });

  it("does not reuse cached results for a different center", async () => {
    nearby.mockResolvedValue(responseFor([makeWorker("a")]));
    const first = renderHook(() => useNearbyWorkers({ center, radiusKm: 100 }));
    await waitFor(() => expect(first.result.current.status).toBe("success"));
    first.unmount();

    nearby.mockResolvedValue(responseFor([makeWorker("b")]));
    const second = renderHook(() =>
      useNearbyWorkers({
        center: { latitude: -34.6037, longitude: -58.3816 },
        radiusKm: 100,
      }),
    );

    // Otra clave de caché: se muestra la carga con spinner, no los viejos.
    expect(second.result.current.status).toBe("loading");
    expect(second.result.current.workers).toEqual([]);

    await waitFor(() => expect(second.result.current.status).toBe("success"));
    expect(second.result.current.workers).toEqual([makeWorker("b")]);
  });
});
