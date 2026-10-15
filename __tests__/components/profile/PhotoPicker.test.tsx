import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { PhotoPicker } from "../../../src/components/profile/PhotoPicker";

describe("PhotoPicker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the empty placeholder", () => {
    const { getByText } = render(
      <PhotoPicker
        uri={null}
        onPhotoSelected={jest.fn()}
        onPhotoRemoved={jest.fn()}
      />,
    );
    expect(getByText("Agregar foto")).toBeTruthy();
  });

  it("opens the in-app camera instead of the system camera", () => {
    const { getByText, queryByTestId } = render(
      <PhotoPicker
        uri={null}
        onPhotoSelected={jest.fn()}
        onPhotoRemoved={jest.fn()}
      />,
    );

    fireEvent.press(getByText("Agregar foto"));
    fireEvent.press(getByText("Cámara"));

    // La cámara embebida (CameraView) se monta y NO se lanza la cámara del
    // sistema, que es la que Android destruye reiniciando la app.
    expect(queryByTestId("camera-view")).toBeTruthy();
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it("returns the photo captured with the in-app camera", async () => {
    const onPhotoSelected = jest.fn();
    const { getByText, getByTestId } = render(
      <PhotoPicker
        uri={null}
        onPhotoSelected={onPhotoSelected}
        onPhotoRemoved={jest.fn()}
      />,
    );

    fireEvent.press(getByText("Agregar foto"));
    fireEvent.press(getByText("Cámara"));
    fireEvent(getByTestId("camera-view"), "cameraReady");
    fireEvent.press(getByTestId("camera-shutter"));

    await waitFor(() => {
      expect(onPhotoSelected).toHaveBeenCalledWith(
        "file:///mock/camera-photo.jpg",
      );
    });
  });

  it("lets the user remove a selected photo", () => {
    const onPhotoRemoved = jest.fn();
    const { getByText } = render(
      <PhotoPicker
        uri="file:///mock/existing.jpg"
        onPhotoSelected={jest.fn()}
        onPhotoRemoved={onPhotoRemoved}
      />,
    );

    fireEvent.press(getByText("Eliminar"));

    expect(onPhotoRemoved).toHaveBeenCalled();
  });
});
