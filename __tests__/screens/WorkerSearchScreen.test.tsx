import React from "react";
import { Alert } from "react-native";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { WorkerSearchScreen } from "../../src/screens/WorkerSearchScreen";
import { useNearbyWorkers } from "../../src/hooks/useNearbyWorkers";
import { UserRole } from "../../src/types/role";
import { SavedLocation } from "../../src/types/location";
import { NearbyWorker, WORKER_CATEGORIES } from "../../src/types/worker";
import { colors } from "../../src/theme/tokens";

jest.mock("../../src/hooks/useNearbyWorkers", () => ({
  useNearbyWorkers: jest.fn(),
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

// La referencia de la búsqueda es la ubicación guardada elegida (el
// dispositivo ya no interviene).
const originLocation: SavedLocation = {
  id: "loc-1",
  user_id: "user-123",
  address: "Av. Olascoaga 1700, Mendoza",
  latitude: -34.6037,
  longitude: -58.3816,
  is_primary: true,
};
const originCoords = {
  latitude: originLocation.latitude,
  longitude: originLocation.longitude,
};

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
  coverage_radius_km: 10,
  latitude: -34.61,
  longitude: -58.39,
  ...overrides,
});

interface RenderOptions {
  hook?: Record<string, unknown>;
  origin?: SavedLocation | null;
}

const makeProps = (origin: SavedLocation | null) => ({
  role: "client" as UserRole,
  origin,
  onGoBack: jest.fn(),
  onViewProfile: jest.fn(),
});

const renderScreen = (options: RenderOptions = {}) => {
  (useNearbyWorkers as jest.Mock).mockReturnValue({
    workers: [],
    status: "success",
    error: null,
    refreshing: false,
    reload: jest.fn(),
    ...options.hook,
  });

  const origin = options.origin === undefined ? originLocation : options.origin;
  const props = makeProps(origin);

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

  it("requests the nearby search from the chosen saved location and draws green pins", () => {
    const { getByTestId } = renderScreen({
      hook: { workers: [makeWorker()] },
    });

    // Radio fijo (la UI no expone filtro de distancia) y centro inicial en
    // la ubicación elegida, sin esperar nada del dispositivo.
    expect(lastHookArgs()).toEqual(
      expect.objectContaining({ center: originCoords, radiusKm: 100 }),
    );

    const map = getByTestId("worker-search-map");
    // La ubicación actual del dispositivo ya no interviene en la búsqueda.
    expect(map.props.userLocation).toBeUndefined();
    // El trabajador cae dentro de su área de cobertura (10 km); se marca en
    // verde (el primer pin es el de la ubicación elegida).
    expect(map.props.markers[1].color).toBe(colors.workerAccent);
  });

  it("marks the chosen location on the map with its own pin", () => {
    const { getByTestId } = renderScreen({
      hook: { workers: [makeWorker()] },
    });

    // El pin de la ubicación elegida va primero, con el color del rol (el
    // mismo estilo de "Mis Ubicaciones") y la dirección como título.
    expect(getByTestId("worker-search-map").props.markers[0]).toMatchObject({
      id: "__search-origin__",
      latitude: originCoords.latitude,
      longitude: originCoords.longitude,
      color: colors.clientAccent,
      title: originLocation.address,
    });
  });

  it("does not open a summary card for the location pin", () => {
    const { getByTestId, queryByTestId } = renderScreen({
      hook: { workers: [makeWorker()] },
    });

    // Tocar el pin de la ubicación elegida no es tocar un trabajador.
    act(() => {
      getByTestId("worker-search-map").props.onMarkerPress("__search-origin__");
    });

    expect(queryByTestId("worker-info-sheet")).toBeNull();
  });

  it("colors pins by coverage area relative to the chosen saved location", () => {
    // El trabajador está a ~1.04 km de la ubicación elegida (haversine).
    const workers = [
      // 1.04 km contra 5 km de radio → dentro del área (verde).
      makeWorker({ worker_id: "w-in", coverage_radius_km: 5 }),
      // 1.04 km contra 0.5 km → afuera pero por poco (verde apagado).
      makeWorker({ worker_id: "w-near", coverage_radius_km: 0.5 }),
      // Muy lejos de la ubicación elegida → gris.
      makeWorker({
        worker_id: "w-out",
        coverage_radius_km: 0.1,
        latitude: -35.0,
        longitude: -58.8,
      }),
      // Sin área definida → gris.
      makeWorker({ worker_id: "w-unknown", coverage_radius_km: null }),
    ];

    const { getByTestId } = renderScreen({ hook: { workers } });

    const markerColors = getByTestId("worker-search-map").props.markers.map(
      (marker: { color: string }) => marker.color,
    );
    expect(markerColors).toEqual([
      // El primer pin es el de la ubicación elegida (color del rol).
      colors.clientAccent,
      colors.workerAccent,
      colors.workerAccentDim,
      colors.workerOut,
      colors.workerOut,
    ]);
  });

  it("keeps the count row mounted with a fixed height so the map never resizes", () => {
    // Regresión del temblor: si la fila aparece/desaparece según los
    // resultados, la WebView cambia de tamaño y Leaflet entra en bucle.
    const { getByTestId } = renderScreen({
      hook: { workers: [], refreshing: false },
    });

    const row = getByTestId("worker-search-count");
    expect(row).toBeTruthy();
    expect(row.props.style).toMatchObject({ height: 36 });
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

  it("ignores micro-moves within the ~20 m tolerance (no extra queries)", () => {
    const { getByTestId } = renderScreen();

    // Eco del setView inicial: limpia el recentrado programático.
    act(() => {
      getByTestId("worker-search-map").props.onMoveEnd(originCoords, 9);
    });

    // Paneo mínimo (≈11 m): entra en la tolerancia (~20 m), así que no se
    // re-consulta la API ni se re-centra el mapa (evita temblor/búsquedas).
    act(() => {
      getByTestId("worker-search-map").props.onMoveEnd(
        {
          latitude: originCoords.latitude + 0.0001,
          longitude: originCoords.longitude,
        },
        9,
      );
    });

    expect(lastHookArgs().center).toEqual(originCoords);
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

  it("recenters the map on the chosen saved location", () => {
    const { getByTestId } = renderScreen();

    // El usuario exploró otra zona del mapa.
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

    fireEvent.press(getByTestId("btn-recenter"));

    // Vuelve a la ubicación elegida (no a la del dispositivo).
    expect(lastHookArgs().center).toEqual(originCoords);
    expect(getByTestId("worker-search-map").props.center).toEqual(originCoords);
  });

  it("re-centers and re-searches when a different saved location is chosen", () => {
    const { rerender, getByTestId, queryByTestId } = renderScreen({
      hook: { workers: [makeWorker()] },
    });

    act(() => {
      getByTestId("worker-search-map").props.onMarkerPress("worker-1");
    });
    expect(getByTestId("worker-info-worker-1")).toBeTruthy();

    const otherOrigin: SavedLocation = {
      ...originLocation,
      id: "loc-2",
      address: "Los Alerces 450, Luján de Cuyo",
      latitude: -33.036,
      longitude: -68.905,
      is_primary: false,
    };
    rerender(<WorkerSearchScreen {...makeProps(otherOrigin)} />);

    expect(lastHookArgs().center).toEqual({
      latitude: -33.036,
      longitude: -68.905,
    });
    expect(getByTestId("worker-search-map").props.center).toEqual({
      latitude: -33.036,
      longitude: -68.905,
    });
    // La ficha de la búsqueda anterior queda cerrada.
    expect(queryByTestId("worker-info-sheet")).toBeNull();
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

  it("shows empty messages without mentioning zones or distances", () => {
    const { getByTestId, getByText } = renderScreen({
      hook: { workers: [] },
    });

    // Vista de mapa.
    expect(
      getByText("No hay trabajadores disponibles por ahora."),
    ).toBeTruthy();

    // Vista de lista.
    fireEvent.press(getByTestId("btn-toggle-view"));

    expect(getByTestId("workers-empty")).toBeTruthy();
    expect(
      getByText("Probá cambiando la categoría o volvé a intentar más tarde."),
    ).toBeTruthy();
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
