import {
  DEFAULT_CENTER,
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
  it("points to Buenos Aires", () => {
    expect(DEFAULT_CENTER.latitude).toBeCloseTo(-34.6037);
    expect(DEFAULT_CENTER.longitude).toBeCloseTo(-58.3816);
  });
});
