import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { AddressSearchInput } from "../../../src/components/location/AddressSearchInput";
import { GeocodeResult } from "../../../src/services/geocodingService";

const results: GeocodeResult[] = [
  { label: "Av. Corrientes 1234", latitude: -34.6, longitude: -58.38 },
];

const baseProps = {
  value: "",
  onChangeText: jest.fn(),
  onSearch: jest.fn(),
  onSelect: jest.fn(),
  results: [] as GeocodeResult[],
  searching: false,
};

describe("AddressSearchInput", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("debounces the search while typing", () => {
    const onSearch = jest.fn();
    const { getByTestId } = render(
      <AddressSearchInput {...baseProps} onSearch={onSearch} />,
    );

    fireEvent.changeText(getByTestId("address-search-input"), "Av. Corr");
    expect(onSearch).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(onSearch).toHaveBeenCalledWith("Av. Corr");
  });

  it("renders the suggestions and selects one", () => {
    const onSelect = jest.fn();
    const { getByTestId, getByText } = render(
      <AddressSearchInput
        {...baseProps}
        value="Av"
        results={results}
        onSelect={onSelect}
      />,
    );

    expect(getByText("Av. Corrientes 1234")).toBeTruthy();
    fireEvent.press(getByTestId("address-result-0"));
    expect(onSelect).toHaveBeenCalledWith(results[0]);
  });

  it("does not search when the value changes programmatically", () => {
    const onSearch = jest.fn();
    const { rerender } = render(
      <AddressSearchInput {...baseProps} onSearch={onSearch} />,
    );

    rerender(
      <AddressSearchInput
        {...baseProps}
        value="Av. Corrientes 1234"
        onSearch={onSearch}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("shows the error message", () => {
    const { getByTestId } = render(
      <AddressSearchInput {...baseProps} error="Falló la búsqueda" />,
    );
    expect(getByTestId("address-search-error")).toBeTruthy();
  });
});
