import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { SearchOriginModal } from "../../../src/components/location/SearchOriginModal";
import { locationService } from "../../../src/services/locationService";
import { tokenStorage } from "../../../src/services/tokenStorage";
import { SavedLocation } from "../../../src/types/location";

jest.mock("../../../src/services/locationService", () => ({
  locationService: { list: jest.fn() },
}));

jest.mock("../../../src/services/tokenStorage", () => ({
  tokenStorage: { getUserId: jest.fn() },
}));

const mockList = locationService.list as jest.Mock;
const mockGetUserId = tokenStorage.getUserId as jest.Mock;

const makeLocation = (
  overrides: Partial<SavedLocation> = {},
): SavedLocation => ({
  id: "loc-1",
  user_id: "user-123",
  address: "Av. Olascoaga 1700, Mendoza",
  latitude: -32.8888,
  longitude: -68.8444,
  is_primary: false,
  ...overrides,
});

const primary = makeLocation({
  id: "loc-primary",
  address: "Av. Olascoaga 1700, Mendoza",
  is_primary: true,
});
const secondary = makeLocation({
  id: "loc-secondary",
  address: "Los Alerces 450, Luján de Cuyo",
  latitude: -33.036,
  longitude: -68.905,
});

interface RenderOptions {
  selectedId?: string | null;
  onSelect?: jest.Mock;
  onAddLocation?: jest.Mock;
  onDismiss?: jest.Mock;
}

const renderModal = (options: RenderOptions = {}) => {
  const props = {
    visible: true,
    selectedId: options.selectedId ?? null,
    onSelect: options.onSelect ?? jest.fn(),
    onAddLocation: options.onAddLocation ?? jest.fn(),
    onDismiss: options.onDismiss ?? jest.fn(),
  };
  return { ...render(<SearchOriginModal {...props} />), props };
};

describe("SearchOriginModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserId.mockResolvedValue("user-123");
    mockList.mockResolvedValue([primary, secondary]);
  });

  it("lists the saved locations (primary first, with its badge)", async () => {
    // El backend puede devolverlas en cualquier orden: la principal va
    // primero.
    mockList.mockResolvedValue([secondary, primary]);

    const { getByTestId, getByText, getAllByTestId } = renderModal();

    await waitFor(() =>
      expect(getByText("Av. Olascoaga 1700, Mendoza")).toBeTruthy(),
    );
    expect(getByText("Los Alerces 450, Luján de Cuyo")).toBeTruthy();
    expect(getByText("Principal")).toBeTruthy();

    const optionIds = getAllByTestId(/^origin-option-/).map(
      (node) => node.props.testID,
    );
    expect(optionIds).toEqual([
      "origin-option-loc-primary",
      "origin-option-loc-secondary",
    ]);
  });

  it("selects a location", async () => {
    const onSelect = jest.fn();
    const { getByTestId } = renderModal({ onSelect });

    await waitFor(() =>
      expect(getByTestId("origin-option-loc-primary")).toBeTruthy(),
    );
    fireEvent.press(getByTestId("origin-option-loc-secondary"));

    expect(onSelect).toHaveBeenCalledWith(secondary);
  });

  it("marks the location that is already selected", async () => {
    const { getByTestId } = renderModal({ selectedId: "loc-secondary" });

    await waitFor(() =>
      expect(getByTestId("origin-option-loc-secondary")).toBeTruthy(),
    );
    expect(
      getByTestId("origin-option-loc-secondary").props.accessibilityState
        .checked,
    ).toBe(true);
    expect(
      getByTestId("origin-option-loc-primary").props.accessibilityState.checked,
    ).toBe(false);
  });

  it("shows a message and the add button when there are no saved locations", async () => {
    mockList.mockResolvedValue([]);

    const { getByTestId, getByText } = renderModal();

    await waitFor(() =>
      expect(getByTestId("search-origin-empty")).toBeTruthy(),
    );
    expect(getByText("Todavía no guardaste ninguna ubicación.")).toBeTruthy();
    // El botón de agregar está siempre visible (es la salida del estado
    // vacío).
    expect(getByTestId("btn-add-origin")).toBeTruthy();
  });

  it("always shows the add-location button, also with saved locations", async () => {
    const onAddLocation = jest.fn();
    const { getByTestId } = renderModal({ onAddLocation });

    await waitFor(() =>
      expect(getByTestId("origin-option-loc-primary")).toBeTruthy(),
    );
    fireEvent.press(getByTestId("btn-add-origin"));

    expect(onAddLocation).toHaveBeenCalled();
  });

  it("shows an error with retry that refetches the list", async () => {
    mockList.mockRejectedValueOnce(new Error("network"));
    mockList.mockResolvedValueOnce([primary]);

    const { getByTestId } = renderModal();

    await waitFor(() =>
      expect(getByTestId("search-origin-error")).toBeTruthy(),
    );

    fireEvent.press(getByTestId("btn-search-origin-retry"));

    await waitFor(() =>
      expect(getByTestId("origin-option-loc-primary")).toBeTruthy(),
    );
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it("closes via cancel and via the overlay back gesture", async () => {
    const onDismiss = jest.fn();
    const { getByTestId } = renderModal({ onDismiss });

    await waitFor(() =>
      expect(getByTestId("origin-option-loc-primary")).toBeTruthy(),
    );
    fireEvent.press(getByTestId("btn-search-origin-cancel"));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not fetch while hidden", () => {
    render(
      <SearchOriginModal
        visible={false}
        onSelect={jest.fn()}
        onAddLocation={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    expect(mockList).not.toHaveBeenCalled();
  });
});
