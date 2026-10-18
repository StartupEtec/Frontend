import * as Location from "expo-location";
import { deviceLocation } from "../../src/services/deviceLocation";

jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const requestPermission =
  Location.requestForegroundPermissionsAsync as jest.Mock;
const getPosition = Location.getCurrentPositionAsync as jest.Mock;

describe("deviceLocation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
  });

  it("reports unavailable when the position cannot be resolved", async () => {
    requestPermission.mockResolvedValueOnce({ status: "granted" });
    getPosition.mockRejectedValueOnce(new Error("GPS off"));

    await expect(deviceLocation.getCurrent()).resolves.toEqual({
      status: "unavailable",
      coordinates: null,
    });
  });
});
