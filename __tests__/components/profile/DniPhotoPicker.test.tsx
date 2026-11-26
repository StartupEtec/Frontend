import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { DniPhotoPicker } from "../../../src/components/profile/DniPhotoPicker";

const renderPicker = (overrides: Record<string, unknown> = {}) => {
  const props = {
    frontUri: null,
    backUri: null,
    onFrontSelected: jest.fn(),
    onBackSelected: jest.fn(),
    onFrontRemoved: jest.fn(),
    onBackRemoved: jest.fn(),
    ...overrides,
  };
  return { props, ...render(<DniPhotoPicker {...props} />) };
};

describe("DniPhotoPicker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders both document slots", () => {
    const { getByText } = renderPicker();
    expect(getByText("Frente")).toBeTruthy();
    expect(getByText("Dorso")).toBeTruthy();
  });

  it("uses the in-app camera for the front side", async () => {
    const onFrontSelected = jest.fn();
    const { getByText, getByTestId } = renderPicker({ onFrontSelected });

    fireEvent.press(getByText("Frente"));
    fireEvent.press(getByText("Cámara"));

    expect(getByTestId("camera-view")).toBeTruthy();
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();

    fireEvent(getByTestId("camera-view"), "cameraReady");
    fireEvent.press(getByTestId("camera-shutter"));

    await waitFor(() => {
      expect(onFrontSelected).toHaveBeenCalledWith(
        "file:///mock/camera-photo.jpg",
      );
    });
  });

  it("routes the photo of the dorso to onBackSelected", async () => {
    const onBackSelected = jest.fn();
    const onFrontSelected = jest.fn();
    const { getByText, getByTestId } = renderPicker({
      onBackSelected,
      onFrontSelected,
    });

    fireEvent.press(getByText("Dorso"));
    fireEvent.press(getByText("Cámara"));
    fireEvent(getByTestId("camera-view"), "cameraReady");
    fireEvent.press(getByTestId("camera-shutter"));

    await waitFor(() => {
      expect(onBackSelected).toHaveBeenCalledWith(
        "file:///mock/camera-photo.jpg",
      );
    });
    expect(onFrontSelected).not.toHaveBeenCalled();
  });
});
