import {
  applyWorkerListFilters,
  compareWorkers,
  filterWorkers,
  normalizeSearchText,
  numericRating,
  paginateWorkers,
  sortWorkers,
} from "../../src/utils/workerList";
import { NearbyWorker, WorkerListFilters } from "../../src/types/worker";

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

describe("normalizeSearchText", () => {
  it("lowercases, trims and strips accents", () => {
    expect(normalizeSearchText("  José PÉREZ ")).toBe("jose perez");
    expect(normalizeSearchText("Ñandú")).toBe("nandu");
  });
});

describe("numericRating", () => {
  it("parses the text rating and returns null without reviews", () => {
    expect(numericRating(makeWorker({ average_rating: "4.5" }))).toBe(4.5);
    expect(numericRating(makeWorker({ average_rating: null }))).toBeNull();
    expect(numericRating(makeWorker({ average_rating: "n/a" }))).toBeNull();
  });
});

describe("filterWorkers", () => {
  const workers = [
    makeWorker({
      worker_id: "w-1",
      full_name: "José Pérez",
      average_rating: "4.8",
    }),
    makeWorker({
      worker_id: "w-2",
      full_name: "Ana Gómez",
      average_rating: "3.0",
    }),
    makeWorker({
      worker_id: "w-3",
      full_name: "Sin rating",
      average_rating: null,
    }),
  ];

  it("filters by name ignoring case and accents", () => {
    const result = filterWorkers(workers, {
      nameQuery: "jose perez",
      minRating: 0,
    });
    expect(result.map((w) => w.worker_id)).toEqual(["w-1"]);
  });

  it("keeps everyone when the query is empty", () => {
    expect(
      filterWorkers(workers, { nameQuery: "   ", minRating: 0 }),
    ).toHaveLength(3);
  });

  it("filters by minimum rating and excludes unrated workers", () => {
    const result = filterWorkers(workers, { nameQuery: "", minRating: 4 });
    expect(result.map((w) => w.worker_id)).toEqual(["w-1"]);
  });

  it("keeps unrated workers when there is no rating filter", () => {
    const result = filterWorkers(workers, { nameQuery: "", minRating: 0 });
    expect(result.map((w) => w.worker_id)).toContain("w-3");
  });
});

describe("sortWorkers / compareWorkers", () => {
  it("sorts by distance ascending by default", () => {
    const workers = [
      makeWorker({ worker_id: "far", distance_km: 9 }),
      makeWorker({ worker_id: "near", distance_km: 1 }),
    ];
    expect(sortWorkers(workers, "distance").map((w) => w.worker_id)).toEqual([
      "near",
      "far",
    ]);
  });

  it("sorts by rating descending, unrated last, tie by distance", () => {
    const workers = [
      makeWorker({
        worker_id: "unrated",
        average_rating: null,
        distance_km: 0.5,
      }),
      makeWorker({ worker_id: "low", average_rating: "3.0", distance_km: 2 }),
      makeWorker({ worker_id: "high", average_rating: "4.9", distance_km: 5 }),
      makeWorker({
        worker_id: "high-near",
        average_rating: "4.9",
        distance_km: 1,
      }),
    ];
    expect(sortWorkers(workers, "rating").map((w) => w.worker_id)).toEqual([
      "high-near",
      "high",
      "low",
      "unrated",
    ]);
  });

  it("does not mutate the input array", () => {
    const workers = [
      makeWorker({ worker_id: "b", distance_km: 2 }),
      makeWorker({ worker_id: "a", distance_km: 1 }),
    ];
    const snapshot = workers.map((w) => w.worker_id);
    sortWorkers(workers, "distance");
    expect(workers.map((w) => w.worker_id)).toEqual(snapshot);
  });

  it("returns 0 for identical workers on every criterion", () => {
    const a = makeWorker();
    const b = makeWorker();
    expect(compareWorkers(a, b, "distance")).toBe(0);
    expect(compareWorkers(a, b, "rating")).toBe(0);
  });
});

describe("applyWorkerListFilters", () => {
  it("filters then sorts in one pass", () => {
    const workers = [
      makeWorker({
        worker_id: "w-1",
        full_name: "Ana",
        average_rating: "4.0",
        distance_km: 5,
      }),
      makeWorker({
        worker_id: "w-2",
        full_name: "Ana",
        average_rating: "4.8",
        distance_km: 9,
      }),
      makeWorker({
        worker_id: "w-3",
        full_name: "Beto",
        average_rating: "5.0",
        distance_km: 1,
      }),
    ];
    const filters: WorkerListFilters = {
      nameQuery: "ana",
      minRating: 0,
      sortBy: "rating",
    };
    expect(
      applyWorkerListFilters(workers, filters).map((w) => w.worker_id),
    ).toEqual(["w-2", "w-1"]);
  });
});

describe("paginateWorkers", () => {
  const workers = Array.from({ length: 12 }, (_, index) =>
    makeWorker({ worker_id: `w-${index}`, distance_km: index }),
  );

  it("slices the first page and reports more to come", () => {
    const { visible, hasMore } = paginateWorkers(workers, 10);
    expect(visible).toHaveLength(10);
    expect(hasMore).toBe(true);
  });

  it("reports no more when the whole list fits", () => {
    const { visible, hasMore } = paginateWorkers(workers, 12);
    expect(visible).toHaveLength(12);
    expect(hasMore).toBe(false);
  });

  it("handles a negative/zero count safely", () => {
    expect(paginateWorkers(workers, -5)).toEqual({
      visible: [],
      hasMore: true,
    });
    expect(paginateWorkers(workers, 0)).toEqual({ visible: [], hasMore: true });
  });
});
