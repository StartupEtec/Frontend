import React from "react";
import { Alert } from "react-native";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { WorkerSearchScreen } from "../../src/screens/WorkerSearchScreen";
import { useNearbyWorkers } from "../../src/hooks/useNearbyWorkers";
import { useDeviceLocation } from "../../src/hooks/useDeviceLocation";
import { UserRole } from "../../src/types/role";
import { NearbyWorker, WORKER_CATEGORIES } from "../../src/types/worker";

jest.mock("../../src/hooks/useNearbyWorkers", () => ({
  useNearbyWorkers: jest.fn(),
}));

jest.mock("../../src/hooks/useDeviceLocation", () => ({
  useDeviceLocation: jest.fn(),
}));

jest.mock("../../src/components/location/LeafletMap", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    LeafletMap: (props: Record<string, unknown>) =>
      React.createElement(View, props),
  };
});

const mockUseNearbyWorkers = useNearbyWorkers as jest.Mock;
const mockUseDeviceLocation = useDeviceLocation as jest.Mock;

const deviceCoords = { latitude: -34.6037, longitude: -58.3816 };

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

interface RenderOptions {
  hook?: Record<string, unknown>;
  device?: Record<string, unknown>;
}

const renderScreen = (options: RenderOptions = {}) => {
  (useDeviceLocation as jest.Mock).mockReturnValue({
    coordinates: deviceCoords,
    status: "granted",
    loading: false,
    denied: false,
    unavailable: false,
    request: jest.fn(),
    ...options.device,
  });
  (useNearbyWorkers as jest.Mock).mockReturnValue({
    workers: [],
    status: "success",
    error: null,
    refreshing: false,
    reload: jest.fn(),
    ...options.hook,
  });

  const props = {
    role: "client" as UserRole,
    onGoBack: jest.fn(),
    onViewProfile: jest.fn(),
  };

  return { ...render(<WorkerSearchScreen {...props} />), props };
};

const lastHookArgs = () =>
  (mockUseNearbyWorkers as jest.Mock).mock.calls.at(-1)?.[0];

describe("WorkerSearchScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("requests the nearby search with the device location and draws the radius circle", () => {
    const { getByTestId } = renderScreen();

    expect(lastHookArgs()).toEqual(
      expect.objectContaining({ center: deviceCoords, radiusKm: 10 }),
    );

    const map = getByTestId("worker-search-map");
    expect(map.props.userLocation).toEqual(deviceCoords);
    expect(map.props.circles[0]).toMatchObject({
      radiusKm: 10,
      latitude: deviceCoords.latitude,
      longitude: deviceCoords.longitude,
    });
  });

  it("shows a loading indicator while the first search runs", () => {
    const { getByTestId } = renderScreen({
      hook: { status: "loading", workers: [] },
    });

    expect(getByTestId("workers-loading")).toBeTruthy();
  });

  it("re-queries the visible center when the map finishes moving", () => {
    const { getByTestId } = renderScreen();

    act(() => {
      getByTestId("worker-search-map").props.onMoveEnd(
        { latitude: -34.62, longitude: -58.4 },
        13,
      );
    });

    expect(lastHookArgs().center).toEqual({
      latitude: -34.62,
      longitude: -58.4,
    });
  });

  it("applies the distance preset to the search", () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId("filter-radius-25"));

    expect(lastHookArgs().radiusKm).toBe(25);
    expect(
      getByTestId("filter-radius-25").props.accessibilityState.selected,
    ).toBe(true);
  });

  it("applies the category preset to the search", () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId("filter-category-2"));

    expect(lastHookArgs().categoryId).toBe(WORKER_CATEGORIES[2].id);
    expect(
      getByTestId("filter-category-all").props.accessibilityState.selected,
    ).toBe(false);
  });

  it("clears the category with the 'Todas' pill", () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId("filter-category-2"));
    fireEvent.press(getByTestId("filter-category-all"));

    expect(lastHookArgs().categoryId).toBeNull();
  });

  it("shows the worker count and the list view with action buttons", () => {
    const { getByTestId, getByText } = renderScreen({
      hook: { workers: [makeWorker()] },
    });

    expect(getByTestId("worker-search-count")).toBeTruthy();
    expect(getByText("1 trabajador encontrado")).toBeTruthy();

    fireEvent.press(getByTestId("btn-toggle-view"));

    expect(getByText("Ana Pérez")).toBeTruthy();
    expect(getByTestId("btn-worker-profile-worker-1")).toBeTruthy();
    expect(getByTestId("btn-worker-request-worker-1")).toBeTruthy();
  });

  it("shows the count as 'N+' when the backend limit is reached", () => {
    const workers = Array.from({ length: 50 }, (_, index) =>
      makeWorker({ worker_id: `worker-${index}` }),
    );
    const { getByText } = renderScreen({ hook: { workers } });

    expect(getByText("50+ trabajadores encontrados")).toBeTruthy();
  });

  it("opens the summary card when a pin is tapped", () => {
    const { getByTestId, getByText, queryByTestId } = renderScreen({
      hook: { workers: [makeWorker()] },
    });

    expect(queryByTestId("worker-info-sheet")).toBeNull();

    act(() => {
      getByTestId("worker-search-map").props.onMarkerPress("worker-1");
    });

    expect(getByTestId("worker-info-worker-1")).toBeTruthy();
    expect(getByText("Ana Pérez")).toBeTruthy();
    expect(getByText("★ 4,5")).toBeTruthy();
    expect(getByText("$ 12.500 / hora")).toBeTruthy();
    expect(getByText(/1,2 km/)).toBeTruthy();
  });

  it("closes the summary card", () => {
    const { getByTestId, queryByTestId } = renderScreen({
      hook: { workers: [makeWorker()] },
    });

    act(() => {
      getByTestId("worker-search-map").props.onMarkerPress("worker-1");
    });
    fireEvent.press(getByTestId("btn-close-info"));

    expect(queryByTestId("worker-info-sheet")).toBeNull();
  });

  it("navigates to the full profile from the summary card", () => {
    const worker = makeWorker();
    const { getByTestId, props } = renderScreen({
      hook: { workers: [worker] },
    });

    act(() => {
      getByTestId("worker-search-map").props.onMarkerPress("worker-1");
    });
    fireEvent.press(getByTestId("btn-worker-profile-worker-1"));

    expect(props.onViewProfile).toHaveBeenCalledWith(worker);
  });

  it("shows 'Próximamente' when requesting a service", () => {
    const { getByTestId } = renderScreen({
      hook: { workers: [makeWorker()] },
    });

    act(() => {
      getByTestId("worker-search-map").props.onMarkerPress("worker-1");
    });
    fireEvent.press(getByTestId("btn-worker-request-worker-1"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Próximamente",
      expect.stringContaining("cotización"),
    );
  });

  it("shows the permission banner and asks again when geolocation is denied", () => {
    const request = jest.fn().mockResolvedValue(null);
    const { getByTestId, getByText } = renderScreen({
      device: {
        coordinates: null,
        denied: true,
        status: "denied",
        request,
      },
      hook: { workers: [makeWorker()] },
    });

    expect(getByTestId("workers-permission")).toBeTruthy();
    expect(
      getByText("Activá tu ubicación para buscar trabajadores cerca tuyo."),
    ).toBeTruthy();

    fireEvent.press(getByTestId("btn-enable-location"));

    expect(request).toHaveBeenCalled();
    // La búsqueda igual avanza con un centro por defecto.
    expect(lastHookArgs().center).toEqual(
      expect.objectContaining({ latitude: expect.any(Number) }),
    );
  });

  it("shows a fallback banner when the position cannot be read", () => {
    const { getByTestId } = renderScreen({
      device: { coordinates: null, unavailable: true, status: "unavailable" },
    });

    expect(getByTestId("workers-location-unavailable")).toBeTruthy();
  });

  it("shows a full error state with retry when the search fails", () => {
    const reload = jest.fn();
    const { getByTestId } = renderScreen({
      hook: {
        status: "error",
        workers: [],
        error: "No pudimos buscar trabajadores. Reintentá.",
        reload,
      },
    });

    expect(getByTestId("workers-error")).toBeTruthy();

    fireEvent.press(getByTestId("btn-workers-retry"));

    expect(reload).toHaveBeenCalled();
  });

  it("keeps the previous results with a banner when a refresh fails", () => {
    const { getByTestId, queryByTestId } = renderScreen({
      hook: {
        status: "error",
        workers: [makeWorker()],
        error: "Sin conexión con el servidor",
        reload: jest.fn(),
      },
    });

    expect(getByTestId("workers-stale-error")).toBeTruthy();
    expect(queryByTestId("workers-error")).toBeNull();
    expect(getByTestId("worker-search-map")).toBeTruthy();
  });

  it("shows the empty state in list view", () => {
    const { getByTestId } = renderScreen({ hook: { workers: [] } });

    fireEvent.press(getByTestId("btn-toggle-view"));

    expect(getByTestId("workers-empty")).toBeTruthy();
  });

  it("shows a count spinner while refreshing in the background", () => {
    const { getByTestId } = renderScreen({
      hook: { workers: [makeWorker()], refreshing: true },
    });

    expect(getByTestId("worker-search-count")).toBeTruthy();
  });

  it("navigates back", () => {
    const { getByTestId, props } = renderScreen();

    fireEvent.press(getByTestId("btn-workers-back"));

    expect(props.onGoBack).toHaveBeenCalled();
  });

  it("switches between map and list views", async () => {
    const { getByTestId, queryByTestId } = renderScreen({
      hook: { workers: [makeWorker()] },
    });

    expect(getByTestId("workers-map-view")).toBeTruthy();

    fireEvent.press(getByTestId("btn-toggle-view"));
    expect(queryByTestId("workers-map-view")).toBeNull();

    fireEvent.press(getByTestId("btn-toggle-view"));
    await waitFor(() => expect(getByTestId("workers-map-view")).toBeTruthy());
  });
});
