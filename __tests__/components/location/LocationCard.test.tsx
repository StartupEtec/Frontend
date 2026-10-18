import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { LocationCard } from "../../../src/components/location/LocationCard";
import { SavedLocation } from "../../../src/types/location";

const makeLocation = (
  overrides: Partial<SavedLocation> = {},
): SavedLocation => ({
  id: "loc-1",
  user_id: "user-123",
  address: "Av. Corrientes 1234",
  latitude: -34.6037,
  longitude: -58.3816,
  is_primary: false,
  ...overrides,
});

describe("LocationCard", () => {
  const onEdit = jest.fn();
  const onDelete = jest.fn();
  const onSetPrimary = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  const renderCard = (location: SavedLocation) =>
    render(
      <LocationCard
        location={location}
        onEdit={onEdit}
        onDelete={onDelete}
        onSetPrimary={onSetPrimary}
      />,
    );

  it("shows the address and coordinates", () => {
    const { getByText } = renderCard(makeLocation());
    expect(getByText("Av. Corrientes 1234")).toBeTruthy();
  });

  it("shows the distance when the backend provides it", () => {
    const { getByTestId, getByText } = renderCard(
      makeLocation({ distance_m: 1500 }),
    );
    expect(getByTestId("location-distance-loc-1")).toBeTruthy();
    expect(getByText("· 1,5 km")).toBeTruthy();
  });

  it("hides the distance when there is no reference", () => {
    const { queryByTestId } = renderCard(makeLocation({ distance_m: null }));
    expect(queryByTestId("location-distance-loc-1")).toBeNull();
  });

  it("renders the primary badge", () => {
    const { getByTestId } = renderCard(makeLocation({ is_primary: true }));
    expect(getByTestId("location-primary-loc-1")).toBeTruthy();
  });

  it("wires the edit and delete actions", () => {
    const { getByTestId } = renderCard(makeLocation());
    fireEvent.press(getByTestId("btn-edit-location-loc-1"));
    fireEvent.press(getByTestId("btn-delete-location-loc-1"));
    expect(onEdit).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
  });

  it("only offers 'make primary' when it is not primary", () => {
    const { getByTestId, queryByTestId } = renderCard(makeLocation());
    fireEvent.press(getByTestId("btn-set-primary-loc-1"));
    expect(onSetPrimary).toHaveBeenCalled();
    expect(queryByTestId("location-primary-loc-1")).toBeNull();
  });

  it("shows the coverage radius for workers with a comma decimal", () => {
    const { getByTestId } = render(
      <LocationCard
        location={makeLocation({ coverage_radius_km: 2.5 })}
        onEdit={onEdit}
        onDelete={onDelete}
        role="worker"
      />,
    );
    expect(getByTestId("location-radius-loc-1")).toBeTruthy();
  });

  it("hides the coverage radius for clients", () => {
    const { queryByTestId } = render(
      <LocationCard
        location={makeLocation({ coverage_radius_km: 2.5 })}
        onEdit={onEdit}
        onDelete={onDelete}
        role="client"
      />,
    );
    expect(queryByTestId("location-radius-loc-1")).toBeNull();
  });

  it("hides the coverage radius when it is not set", () => {
    const { queryByTestId } = render(
      <LocationCard
        location={makeLocation()}
        onEdit={onEdit}
        onDelete={onDelete}
        role="worker"
      />,
    );
    expect(queryByTestId("location-radius-loc-1")).toBeNull();
  });
});
