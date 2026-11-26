import { act, renderHook } from "@testing-library/react-native";
import {
  NAME_SEARCH_DEBOUNCE_MS,
  useWorkerList,
} from "../../src/hooks/useWorkerList";
import { NearbyWorker, WORKER_LIST_PAGE_SIZE } from "../../src/types/worker";

const makeWorker = (overrides: Partial<NearbyWorker> = {}): NearbyWorker => ({
  worker_id: "worker-1",
  user_id: "user-1",
  full_name: "Ana Pérez",
  avatar_url: null,
  category_id: "cat-1",
  category_name: "Electricidad",
  availability_status: "AVAILABLE",
  certification_status: "APPROVED",
  average_rating: "4.5",
  distance_km: 1,
  coverage_radius_km: 10,
  latitude: -32.88,
  longitude: -68.84,
  ...overrides,
});

// Avanza el debounce y deja correr el efecto del timer.
const flushDebounce = () =>
  act(() => {
    jest.advanceTimersByTime(NAME_SEARCH_DEBOUNCE_MS);
  });

describe("useWorkerList", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows the first page and reports more results", () => {
    const workers = Array.from({ length: 25 }, (_, index) =>
      makeWorker({ worker_id: `w-${index}`, distance_km: index }),
    );
    const { result } = renderHook(() => useWorkerList(workers));

    expect(result.current.workers).toHaveLength(WORKER_LIST_PAGE_SIZE);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.totalCount).toBe(25);
    expect(result.current.filteredCount).toBe(25);
  });

  it("loads more pages until the list is exhausted", () => {
    const workers = Array.from({ length: 25 }, (_, index) =>
      makeWorker({ worker_id: `w-${index}`, distance_km: index }),
    );
    const { result } = renderHook(() => useWorkerList(workers));

    act(() => result.current.loadMore());
    expect(result.current.workers).toHaveLength(WORKER_LIST_PAGE_SIZE * 2);

    act(() => result.current.loadMore());
    expect(result.current.workers).toHaveLength(25);
    expect(result.current.hasMore).toBe(false);
  });

  it("debounces the name search before filtering", () => {
    const workers = [
      makeWorker({ worker_id: "w-1", full_name: "José Pérez" }),
      makeWorker({ worker_id: "w-2", full_name: "Ana Gómez" }),
    ];
    const { result } = renderHook(() => useWorkerList(workers));

    act(() => result.current.setNameQuery("jose"));
    // El input cambia al instante, pero el filtro todavía no se aplicó.
    expect(result.current.nameInput).toBe("jose");
    expect(result.current.workers).toHaveLength(2);

    flushDebounce();

    expect(result.current.workers.map((w) => w.worker_id)).toEqual(["w-1"]);
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it("filters by minimum rating", () => {
    const workers = [
      makeWorker({ worker_id: "w-1", average_rating: "4.8" }),
      makeWorker({ worker_id: "w-2", average_rating: "3.0" }),
    ];
    const { result } = renderHook(() => useWorkerList(workers));

    act(() => result.current.setMinRating(4));

    expect(result.current.workers.map((w) => w.worker_id)).toEqual(["w-1"]);
    expect(result.current.filteredCount).toBe(1);
  });

  it("sorts by the chosen criterion", () => {
    const workers = [
      makeWorker({ worker_id: "near", distance_km: 1, average_rating: "3.0" }),
      makeWorker({ worker_id: "far", distance_km: 9, average_rating: "4.9" }),
    ];
    const { result } = renderHook(() => useWorkerList(workers));

    act(() => result.current.setSortBy("rating"));

    expect(result.current.workers.map((w) => w.worker_id)).toEqual([
      "far",
      "near",
    ]);
  });

  it("resets pagination when the reset key changes", () => {
    const workers = Array.from({ length: 25 }, (_, index) =>
      makeWorker({ worker_id: `w-${index}`, distance_km: index }),
    );
    const { result, rerender } = renderHook(
      ({ resetKey }) => useWorkerList(workers, { resetKey }),
      { initialProps: { resetKey: "a" } },
    );

    act(() => result.current.loadMore());
    expect(result.current.workers).toHaveLength(WORKER_LIST_PAGE_SIZE * 2);

    rerender({ resetKey: "b" });
    expect(result.current.workers).toHaveLength(WORKER_LIST_PAGE_SIZE);
  });

  it("clears filters and resets pagination", () => {
    const workers = [
      makeWorker({
        worker_id: "w-1",
        full_name: "José",
        average_rating: "3.0",
      }),
      makeWorker({ worker_id: "w-2", full_name: "Ana", average_rating: "5.0" }),
    ];
    const { result } = renderHook(() => useWorkerList(workers));

    act(() => result.current.setNameQuery("jose"));
    flushDebounce();
    act(() => result.current.setMinRating(4));
    expect(result.current.filteredCount).toBe(0);

    act(() => result.current.clearFilters());

    expect(result.current.nameInput).toBe("");
    expect(result.current.filters.minRating).toBe(0);
    expect(result.current.filters.sortBy).toBe("distance");
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.workers).toHaveLength(2);
  });
});
