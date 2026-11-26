import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useDeviceLocation } from "../../src/hooks/useDeviceLocation";
import { deviceLocation } from "../../src/services/deviceLocation";

jest.mock("../../src/services/deviceLocation", () => ({
  deviceLocation: { getCurrent: jest.fn() },
}));

const mockGetCurrent = deviceLocation.getCurrent as jest.Mock;

describe("useDeviceLocation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requests automatically on mount and exposes coordinates", async () => {
    mockGetCurrent.mockResolvedValueOnce({
      status: "granted",
      coordinates: { latitude: -34.6, longitude: -58.38 },
    });

    const { result } = renderHook(() => useDeviceLocation());
    await waitFor(() => expect(result.current.status).toBe("granted"));

    expect(result.current.coordinates).toEqual({
      latitude: -34.6,
      longitude: -58.38,
    });
    expect(result.current.denied).toBe(false);
    expect(mockGetCurrent).toHaveBeenCalledTimes(1);
  });

  it("does not request when autoRequest is false", async () => {
    const { result } = renderHook(() =>
      useDeviceLocation({ autoRequest: false }),
    );
    await act(async () => {});

    expect(mockGetCurrent).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });

  it("exposes the denied status", async () => {
    mockGetCurrent.mockResolvedValueOnce({
      status: "denied",
      coordinates: null,
    });

    const { result } = renderHook(() => useDeviceLocation());
    await waitFor(() => expect(result.current.denied).toBe(true));

    expect(result.current.coordinates).toBeNull();
  });

  it("re-reads the location when request() is called", async () => {
    mockGetCurrent
      .mockResolvedValueOnce({ status: "denied", coordinates: null })
      .mockResolvedValueOnce({
        status: "granted",
        coordinates: { latitude: 1, longitude: 2 },
      });

    const { result } = renderHook(() => useDeviceLocation());
    await waitFor(() => expect(result.current.denied).toBe(true));

    let returned: unknown;
    await act(async () => {
      returned = await result.current.request();
    });

    expect(returned).toEqual({ latitude: 1, longitude: 2 });
    expect(result.current.coordinates).toEqual({ latitude: 1, longitude: 2 });
    expect(mockGetCurrent).toHaveBeenCalledTimes(2);
  });
});
