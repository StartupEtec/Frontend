import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { LocationsScreen } from "../../src/screens/LocationsScreen";
import { useLocations } from "../../src/hooks/useLocations";
import { useDeviceLocation } from "../../src/hooks/useDeviceLocation";
import { Coordinates, SavedLocation } from "../../src/types/location";

jest.mock("../../src/hooks/useLocations", () => ({
  useLocations: jest.fn(),
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

const mockUseLocations = useLocations as jest.Mock;
const mockUseDeviceLocation = useDeviceLocation as jest.Mock;

const makeLocation = (
  overrides: Partial<SavedLocation> = {},
): SavedLocation => ({
  id: "loc-1",
  user_id: "user-123",
  address: "Av. Corrientes 1234, CABA",
  latitude: -34.6037,
  longitude: -58.3816,
  is_primary: false,
  ...overrides,
});

const baseHook = () => ({
  locations: [] as SavedLocation[],
  status: "success" as const,
  error: null,
  actionError: null,
  saving: false,
  deletingId: null,
  refreshing: false,
  reload: jest.fn(),
  refresh: jest.fn(),
  clearActionError: jest.fn(),
  createLocation: jest.fn(),
  updateLocation: jest.fn(),
  setPrimary: jest.fn(),
  deleteLocation: jest.fn(),
});

const baseDevice = () => ({
  coordinates: null as Coordinates | null,
  status: "idle" as const,
  loading: false,
  denied: false,
  unavailable: false,
  request: jest.fn(),
});

describe("LocationsScreen", () => {
  const onGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocations.mockReturnValue(baseHook());
    mockUseDeviceLocation.mockReturnValue(baseDevice());
  });

  const renderScreen = (
    overrides: Record<string, unknown> = {},
    device: Record<string, unknown> = {},
  ) => {
    mockUseLocations.mockReturnValue({ ...baseHook(), ...overrides });
    mockUseDeviceLocation.mockReturnValue({ ...baseDevice(), ...device });
    return render(<LocationsScreen role="client" onGoBack={onGoBack} />);
  };

  it("shows a loading state", () => {
    const { getByText } = renderScreen({ status: "loading" });
    expect(getByText("Cargando ubicaciones...")).toBeTruthy();
  });

  it("shows an error state and retries", () => {
    const reload = jest.fn();
    const { getByText, getByTestId } = renderScreen({
      status: "error",
      error: "No pudimos cargar tus ubicaciones.",
      reload,
    });

    expect(getByText("No pudimos cargar tus ubicaciones.")).toBeTruthy();
    fireEvent.press(getByTestId("btn-locations-retry"));
    expect(reload).toHaveBeenCalled();
  });

  it("shows the empty state when there are no locations", () => {
    const { getByTestId, getByText } = renderScreen();

    expect(getByTestId("locations-empty")).toBeTruthy();
    expect(getByText("No tenés ubicaciones guardadas")).toBeTruthy();
    expect(getByTestId("btn-add-location")).toBeTruthy();
  });

  it("renders the map preview and each saved address", () => {
    const { getByTestId, getByText } = renderScreen({
      locations: [
        makeLocation({ id: "a", address: "Calle A 123" }),
        makeLocation({ id: "b", address: "Calle B 456" }),
      ],
    });

    expect(getByTestId("locations-map-preview")).toBeTruthy();
    expect(getByText("Calle A 123")).toBeTruthy();
    expect(getByText("Calle B 456")).toBeTruthy();
  });

  it("marks the primary location", () => {
    const { getByTestId } = renderScreen({
      locations: [makeLocation({ id: "a", is_primary: true })],
    });

    expect(getByTestId("location-primary-a")).toBeTruthy();
  });

  it("opens the create modal from Agregar Ubicación", async () => {
    const { getByTestId, getByText } = renderScreen();

    fireEvent.press(getByTestId("btn-add-location"));

    await waitFor(() => {
      expect(getByText("Agregar ubicación")).toBeTruthy();
    });
  });

  it("opens the edit modal prefilled from a location", async () => {
    const { getByTestId } = renderScreen({
      locations: [makeLocation({ id: "a", address: "Calle A 123" })],
    });

    fireEvent.press(getByTestId("btn-edit-location-a"));

    await waitFor(() => {
      expect(getByTestId("address-search-input").props.value).toBe(
        "Calle A 123",
      );
    });
  });

  it("deletes a location after confirming", async () => {
    const deleteLocation = jest.fn().mockResolvedValue(true);
    const { getByTestId } = renderScreen({
      locations: [makeLocation({ id: "a", address: "Calle A 123" })],
      deleteLocation,
    });

    fireEvent.press(getByTestId("btn-delete-location-a"));

    await waitFor(() => {
      expect(getByTestId("confirm-dialog")).toBeTruthy();
    });

    fireEvent.press(getByTestId("confirm-dialog-confirm"));

    await waitFor(() => {
      expect(deleteLocation).toHaveBeenCalledWith("a");
    });
  });

  it("cancels deletion without calling the service", async () => {
    const deleteLocation = jest.fn();
    const { getByTestId, queryByTestId } = renderScreen({
      locations: [makeLocation({ id: "a" })],
      deleteLocation,
    });

    fireEvent.press(getByTestId("btn-delete-location-a"));
    await waitFor(() => {
      expect(getByTestId("confirm-dialog")).toBeTruthy();
    });

    fireEvent.press(getByTestId("confirm-dialog-cancel"));

    await waitFor(() => {
      expect(queryByTestId("confirm-dialog")).toBeNull();
    });
    expect(deleteLocation).not.toHaveBeenCalled();
  });

  it("marks a location as primary", () => {
    const setPrimary = jest.fn().mockResolvedValue(true);
    const { getByTestId } = renderScreen({
      locations: [makeLocation({ id: "a" })],
      setPrimary,
    });

    fireEvent.press(getByTestId("btn-set-primary-a"));

    expect(setPrimary).toHaveBeenCalledWith("a");
  });

  it("hides the add button and warns at the limit", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      makeLocation({ id: `loc-${i}` }),
    );
    const { queryByTestId, getByTestId } = renderScreen({ locations: many });

    expect(queryByTestId("btn-add-location")).toBeNull();
    expect(getByTestId("locations-limit-note")).toBeTruthy();
  });

  it("shows an action error banner", () => {
    const { getByTestId } = renderScreen({ actionError: "No pudimos guardar" });
    expect(getByTestId("locations-action-error")).toBeTruthy();
  });

  it("shows a permission banner and requests location again", () => {
    const request = jest.fn();
    const { getByTestId, queryByTestId } = renderScreen(
      {},
      { denied: true, request },
    );

    expect(getByTestId("locations-permission")).toBeTruthy();
    fireEvent.press(getByTestId("btn-enable-location"));
    expect(request).toHaveBeenCalled();

    expect(queryByTestId("locations-permission")).toBeTruthy();
  });

  it("hides the permission banner when location is granted", () => {
    const { queryByTestId } = renderScreen(
      {},
      { coordinates: { latitude: -34.6, longitude: -58.38 } },
    );
    expect(queryByTestId("locations-permission")).toBeNull();
  });

  it("shows the device location on the map preview", () => {
    const { getByTestId } = renderScreen(
      { locations: [makeLocation({ id: "a" })] },
      { coordinates: { latitude: -34.6, longitude: -58.38 } },
    );

    const map = getByTestId("locations-map-preview-map");
    expect(map.props.userLocation).toEqual({
      latitude: -34.6,
      longitude: -58.38,
    });
  });

  it("expands the map preview to fullscreen", () => {
    const { getByTestId, queryByTestId } = renderScreen({
      locations: [makeLocation({ id: "a" })],
    });

    expect(queryByTestId("locations-map-preview-fullscreen-map")).toBeNull();
    fireEvent.press(getByTestId("locations-map-preview-expand"));
    expect(getByTestId("locations-map-preview-fullscreen-map")).toBeTruthy();
  });

  it("offers to use the current location in the form", async () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId("btn-add-location"));

    await waitFor(() => {
      expect(getByTestId("btn-use-current-location")).toBeTruthy();
    });
  });

  it("navigates back", () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId("btn-locations-back"));
    expect(onGoBack).toHaveBeenCalled();
  });
});
