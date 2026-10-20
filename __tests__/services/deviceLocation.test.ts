import * as Location from "expo-location";
import { deviceLocation } from "../../src/services/deviceLocation";

jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
}));

const requestPermission =
  Location.requestForegroundPermissionsAsync as jest.Mock;
const getPosition = Location.getCurrentPositionAsync as jest.Mock;
const getLastKnown = Location.getLastKnownPositionAsync as jest.Mock;

describe("deviceLocation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getLastKnown.mockResolvedValue(null);
  });

  it("returns the coordinates when permission is granted", async () => {
    requestPermission.mockResolvedValueOnce({ status: "granted" });
    getPosition.mockResolvedValueOnce({
      coords: { latitude: -34.6037, longitude: -58.3816 },
    });

    await expect(deviceLocation.getCurrent()).resolves.toEqual({
      status: "granted",
      coordinates: { latitude: -34.6037, longitude: -58.3816 },
    });
    expect(getPosition).toHaveBeenCalledWith({
      accuracy: Location.Accuracy.Balanced,
    });
  });

  it("reports denied when permission is not granted", async () => {
    requestPermission.mockResolvedValueOnce({ status: "denied" });

    await expect(deviceLocation.getCurrent()).resolves.toEqual({
      status: "denied",
      coordinates: null,
    });
    expect(getPosition).not.toHaveBeenCalled();
    expect(getLastKnown).not.toHaveBeenCalled();
  });

  it("reports unavailable when the position cannot be resolved", async () => {
    requestPermission.mockResolvedValueOnce({ status: "granted" });
    getPosition.mockRejectedValueOnce(new Error("GPS off"));

    await expect(deviceLocation.getCurrent()).resolves.toEqual({
      status: "unavailable",
      coordinates: null,
    });
  });

  it("returns a fresh last known position without asking for a new fix", async () => {
    // Velocización: si la última posición es reciente (≤ 60 s), se responde
    // al instante en lugar de esperar un fix del GPS al abrir la búsqueda.
    requestPermission.mockResolvedValueOnce({ status: "granted" });
    getLastKnown.mockResolvedValueOnce({
      coords: { latitude: -32.8895, longitude: -68.8458 },
      timestamp: Date.now() - 5_000,
    });

    await expect(deviceLocation.getCurrent()).resolves.toEqual({
      status: "granted",
      coordinates: { latitude: -32.8895, longitude: -68.8458 },
    });
    expect(getPosition).not.toHaveBeenCalled();
  });

  it("asks for a new fix when the last known position is stale", async () => {
    requestPermission.mockResolvedValueOnce({ status: "granted" });
    getLastKnown.mockResolvedValueOnce({
      coords: { latitude: -32.8, longitude: -68.8 },
      timestamp: Date.now() - 10 * 60_000,
    });
    getPosition.mockResolvedValueOnce({
      coords: { latitude: -34.6037, longitude: -58.3816 },
    });

    await expect(deviceLocation.getCurrent()).resolves.toEqual({
      status: "granted",
      coordinates: { latitude: -34.6037, longitude: -58.3816 },
    });
    expect(getPosition).toHaveBeenCalledTimes(1);
  });

  it("falls back to the stale last known position when the fix times out", async () => {
    // Si el GPS no responde dentro del tope (4 s), se usa la última posición
    // conocida en vez de dejar el mapa sin centro.
    jest.useFakeTimers();
    try {
      requestPermission.mockResolvedValueOnce({ status: "granted" });
      getLastKnown.mockResolvedValueOnce({
        coords: { latitude: -32.8895, longitude: -68.8458 },
        timestamp: Date.now() - 10 * 60_000,
      });
      getPosition.mockReturnValueOnce(new Promise(() => {})); // nunca resuelve

      const promise = deviceLocation.getCurrent();
      await jest.advanceTimersByTimeAsync(4_000);

      await expect(promise).resolves.toEqual({
        status: "granted",
        coordinates: { latitude: -32.8895, longitude: -68.8458 },
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
