import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { AvatarEditor } from "../../../src/components/profile/AvatarEditor";

describe("AvatarEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the photo when a uri is present", () => {
    const { getByTestId, queryByTestId } = render(
      <AvatarEditor
        uri="http://10.0.2.2:3000/uploads/a.jpg"
        onChange={jest.fn()}
      />,
    );

    expect(getByTestId("edit-profile-avatar")).toBeTruthy();
    expect(queryByTestId("edit-profile-avatar-placeholder")).toBeNull();
  });

  it("renders the placeholder when there is no photo", () => {
    const { getByTestId } = render(
      <AvatarEditor uri={null} onChange={jest.fn()} />,
    );

    expect(getByTestId("edit-profile-avatar-placeholder")).toBeTruthy();
  });

  it("opens the sheet from the circular edit button", () => {
    const { getByTestId, getByText } = render(
      <AvatarEditor uri={null} onChange={jest.fn()} />,
    );

    fireEvent.press(getByTestId("btn-edit-avatar"));
    expect(getByText("Foto de perfil")).toBeTruthy();
  });

  it("opens the in-app camera (not the system camera) from the sheet", () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <AvatarEditor uri={null} onChange={jest.fn()} />,
    );

    fireEvent.press(getByTestId("btn-edit-avatar"));
    fireEvent.press(getByText("Cámara"));

    expect(queryByTestId("camera-view")).toBeTruthy();
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it("returns the photo captured with the in-app camera", async () => {
    const onChange = jest.fn();
    const { getByTestId, getByText } = render(
      <AvatarEditor uri={null} onChange={onChange} />,
    );

    fireEvent.press(getByTestId("btn-edit-avatar"));
    fireEvent.press(getByText("Cámara"));
    fireEvent(getByTestId("camera-view"), "cameraReady");
    fireEvent.press(getByTestId("camera-shutter"));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("file:///mock/camera-photo.jpg");
    });
  });

  it("lets the user pick from the gallery", async () => {
    const onChange = jest.fn();
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///gallery/pic.jpg" }],
    });

    const { getByTestId, getByText } = render(
      <AvatarEditor uri={null} onChange={onChange} />,
    );

    fireEvent.press(getByTestId("btn-edit-avatar"));
    fireEvent.press(getByText("Galería"));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("file:///gallery/pic.jpg");
    });
  });

  it("does nothing when the sheet is cancelled", () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <AvatarEditor uri={null} onChange={onChange} />,
    );

    fireEvent.press(getByTestId("btn-edit-avatar"));
    fireEvent.press(getByTestId("btn-avatar-cancel"));

    expect(onChange).not.toHaveBeenCalled();
  });
});
