import {
  COVERAGE_NEAR_BAND_KM,
  DEFAULT_CENTER,
  coverageTier,
  distanceKmBetween,
  formatDistance,
  sameCoordinates,
} from "../../src/utils/map";

describe("formatDistance", () => {
  it("renders meters below one kilometre", () => {
    expect(formatDistance(0)).toBe("0 m");
    expect(formatDistance(350)).toBe("350 m");
    expect(formatDistance(999)).toBe("999 m");
  });

  it("renders kilometres with a comma decimal separator", () => {
    expect(formatDistance(1500)).toBe("1,5 km");
    expect(formatDistance(1240.5)).toBe("1,2 km");
    expect(formatDistance(12000)).toBe("12 km");
  });

  it("returns an empty string for invalid values", () => {
    expect(formatDistance(null)).toBe("");
    expect(formatDistance(undefined)).toBe("");
    expect(formatDistance(-1)).toBe("");
    expect(formatDistance(Number.NaN)).toBe("");
  });
});

describe("coverageTier", () => {
  it("classifies the client relative to the worker coverage area", () => {
    // Dentro del área (el límite incluye).
    expect(coverageTier(3, 5)).toBe("in");
    expect(coverageTier(5, 5)).toBe("in");
    // Fuera pero dentro de la banda de tolerancia (5 km).
    expect(coverageTier(5.5, 5)).toBe("near");
    expect(coverageTier(10, 5)).toBe("near");
    // Más allá de la banda.
    expect(coverageTier(10.1, 5)).toBe("out");
    // Sin área definida.
    expect(coverageTier(99, null)).toBe("unknown");
    expect(coverageTier(99, undefined)).toBe("unknown");
  });

  it("exposes the near band as 5 km", () => {
    expect(COVERAGE_NEAR_BAND_KM).toBe(5);
  });
});

describe("distanceKmBetween", () => {
  it("computes the haversine distance in kilometres", () => {
    // Centro de Mendoza → Godoy Cruz (la API da ~4.26 km con ST_DistanceSphere).
    const distance = distanceKmBetween(DEFAULT_CENTER, {
      latitude: -32.9276,
      longitude: -68.8415,
    });
    expect(distance).toBeGreaterThan(4.2);
    expect(distance).toBeLessThan(4.4);
  });

  it("returns zero for the same point", () => {
    expect(distanceKmBetween(DEFAULT_CENTER, DEFAULT_CENTER)).toBe(0);
  });
});

describe("sameCoordinates", () => {
  it("compares two points", () => {
    expect(
      sameCoordinates(
        { latitude: -34.6, longitude: -58.4 },
        { latitude: -34.6, longitude: -58.4 },
      ),
    ).toBe(true);
    expect(
      sameCoordinates(
        { latitude: -34.6, longitude: -58.4 },
        { latitude: -34.7, longitude: -58.4 },
      ),
    ).toBe(false);
  });

  it("treats missing values as not equal", () => {
    expect(sameCoordinates(null, { latitude: 1, longitude: 2 })).toBe(false);
    expect(sameCoordinates({ latitude: 1, longitude: 2 }, undefined)).toBe(
      false,
    );
  });
});

describe("DEFAULT_CENTER", () => {
  it("points to Mendoza, Argentina", () => {
    expect(DEFAULT_CENTER.latitude).toBeCloseTo(-32.8895);
    expect(DEFAULT_CENTER.longitude).toBeCloseTo(-68.8458);
  });
});
