import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

const mockTakePictureAsync = jest.fn(() =>
  Promise.resolve({ uri: "file:///mock/camera-photo.jpg" }),
);
const mockRequestPermission = jest.fn(() => Promise.resolve({ granted: true }));
let mockPermission: { granted: boolean } | null = { granted: true };

jest.mock("expo-camera", () => {
  const React = require("react");
  const { View } = require("react-native");

  class CameraView extends React.Component {
    takePictureAsync = mockTakePictureAsync;

    render() {
      return React.createElement(View, this.props);
    }
  }

  return {
    CameraView,
    useCameraPermissions: () => [mockPermission, mockRequestPermission],
  };
});

import { CameraCapture } from "../../../src/components/profile/CameraCapture";

describe("CameraCapture", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPermission = { granted: true };
  });

  it("renders the close button", () => {
    const { getByTestId } = render(
      <CameraCapture visible onClose={jest.fn()} onCapture={jest.fn()} />,
    );
    expect(getByTestId("camera-close")).toBeTruthy();
  });

  it("shows the permission prompt when camera access is denied", () => {
    mockPermission = { granted: false };
    const { getByText, getByTestId, queryByTestId } = render(
      <CameraCapture visible onClose={jest.fn()} onCapture={jest.fn()} />,
    );

    expect(getByText(/permiso para usar la cámara/i)).toBeTruthy();
    expect(queryByTestId("camera-shutter")).toBeNull();

    fireEvent.press(getByTestId("camera-request-permission"));
    expect(mockRequestPermission).toHaveBeenCalled();
  });

  it("captures a photo and returns its uri once the camera is ready", async () => {
    const onCapture = jest.fn();
    const { getByTestId } = render(
      <CameraCapture visible onClose={jest.fn()} onCapture={onCapture} />,
    );

    fireEvent(getByTestId("camera-view"), "cameraReady");
    fireEvent.press(getByTestId("camera-shutter"));

    await waitFor(() => {
      expect(onCapture).toHaveBeenCalledWith("file:///mock/camera-photo.jpg");
    });
  });

  it("does not capture before the camera is ready", () => {
    const onCapture = jest.fn();
    const { getByTestId } = render(
      <CameraCapture visible onClose={jest.fn()} onCapture={onCapture} />,
    );

    fireEvent.press(getByTestId("camera-shutter"));

    expect(mockTakePictureAsync).not.toHaveBeenCalled();
    expect(onCapture).not.toHaveBeenCalled();
  });

  it("starts on the requested camera and flips it", () => {
    const { getByTestId } = render(
      <CameraCapture
        visible
        initialFacing="front"
        onClose={jest.fn()}
        onCapture={jest.fn()}
      />,
    );

    expect(getByTestId("camera-view").props.facing).toBe("front");

    fireEvent.press(getByTestId("camera-flip"));

    expect(getByTestId("camera-view").props.facing).toBe("back");
  });

  it("calls onClose when the close button is pressed", () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <CameraCapture visible onClose={onClose} onCapture={jest.fn()} />,
    );

    fireEvent.press(getByTestId("camera-close"));

    expect(onClose).toHaveBeenCalled();
  });
});
