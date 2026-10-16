import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { EditProfileScreen } from "../../src/screens/EditProfileScreen";
import { useEditProfile } from "../../src/hooks/useEditProfile";

jest.mock("../../src/hooks/useEditProfile", () => ({
  useEditProfile: jest.fn(),
}));

const mockUseEditProfile = useEditProfile as jest.Mock;

const baseData = {
  firstName: "Juan",
  lastName: "Pérez",
  phone: "+5491112345678",
  email: "juan@example.com",
  description: "Electricista matriculado",
  avatarUrl: "http://10.0.2.2:3000/uploads/profiles/selfie.jpg",
};

const successReturn = (overrides: Record<string, unknown> = {}) => ({
  data: baseData,
  status: "success",
  error: null,
  reload: jest.fn(),
  saveAvatar: jest.fn().mockResolvedValue(true),
  saveDescription: jest.fn().mockResolvedValue(true),
  avatarSaving: false,
  descriptionSaving: false,
  saveError: null,
  clearSaveError: jest.fn(),
  ...overrides,
});

describe("EditProfileScreen", () => {
  const onGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the read-only fields including description for workers", () => {
    mockUseEditProfile.mockReturnValue(successReturn());
    const { getByText, getByTestId } = render(
      <EditProfileScreen role="worker" onGoBack={onGoBack} />,
    );

    expect(getByText("Editar Perfil")).toBeTruthy();
    expect(getByTestId("edit-profile-first-name").props.children).toBe("Juan");
    expect(getByTestId("edit-profile-last-name").props.children).toBe("Pérez");
    expect(getByTestId("edit-profile-phone").props.children).toBe(
      "+5491112345678",
    );
    expect(getByTestId("edit-profile-email").props.children).toBe(
      "juan@example.com",
    );
    expect(getByTestId("edit-profile-description").props.children).toBe(
      "Electricista matriculado",
    );
    expect(getByTestId("edit-profile-avatar")).toBeTruthy();
  });

  it("hides the description for clients", () => {
    mockUseEditProfile.mockReturnValue(successReturn());
    const { queryByTestId, getByTestId } = render(
      <EditProfileScreen role="client" onGoBack={onGoBack} />,
    );

    expect(queryByTestId("edit-profile-description")).toBeNull();
    expect(getByTestId("edit-profile-first-name")).toBeTruthy();
  });

  it("shows a placeholder when there is no photo", () => {
    mockUseEditProfile.mockReturnValue(
      successReturn({ data: { ...baseData, avatarUrl: null } }),
    );
    const { getByTestId, queryByTestId } = render(
      <EditProfileScreen role="client" onGoBack={onGoBack} />,
    );

    expect(getByTestId("edit-profile-avatar-placeholder")).toBeTruthy();
    expect(queryByTestId("edit-profile-avatar")).toBeNull();
  });

  it("shows a fallback for empty values", () => {
    mockUseEditProfile.mockReturnValue(
      successReturn({
        data: {
          firstName: "",
          lastName: "",
          phone: "",
          email: "",
          description: "",
          avatarUrl: null,
        },
      }),
    );
    const { getByTestId } = render(
      <EditProfileScreen role="worker" onGoBack={onGoBack} />,
    );

    expect(getByTestId("edit-profile-first-name").props.children).toBe(
      "No definido",
    );
  });

  it("shows a loading state", () => {
    mockUseEditProfile.mockReturnValue({
      data: baseData,
      status: "loading",
      error: null,
      reload: jest.fn(),
      saveAvatar: jest.fn(),
      saveDescription: jest.fn(),
      avatarSaving: false,
      descriptionSaving: false,
      saveError: null,
      clearSaveError: jest.fn(),
    });
    const { getByText, queryByTestId } = render(
      <EditProfileScreen role="client" onGoBack={onGoBack} />,
    );

    expect(getByText("Cargando perfil...")).toBeTruthy();
    expect(queryByTestId("edit-profile-first-name")).toBeNull();
  });

  it("shows an error state and retries", () => {
    const reload = jest.fn();
    mockUseEditProfile.mockReturnValue({
      data: baseData,
      status: "error",
      error: "No pudimos cargar tu perfil. Reintentá.",
      reload,
      saveAvatar: jest.fn(),
      saveDescription: jest.fn(),
      avatarSaving: false,
      descriptionSaving: false,
      saveError: null,
      clearSaveError: jest.fn(),
    });
    const { getByText, getByTestId } = render(
      <EditProfileScreen role="client" onGoBack={onGoBack} />,
    );

    expect(getByText("No pudimos cargar tu perfil. Reintentá.")).toBeTruthy();
    fireEvent.press(getByTestId("btn-edit-profile-retry"));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("navigates back", () => {
    mockUseEditProfile.mockReturnValue(successReturn());
    const { getByTestId } = render(
      <EditProfileScreen role="client" onGoBack={onGoBack} />,
    );

    fireEvent.press(getByTestId("btn-edit-profile-back"));
    expect(onGoBack).toHaveBeenCalledTimes(1);
  });

  it("does not show an edit button for the description on clients", () => {
    mockUseEditProfile.mockReturnValue(successReturn());
    const { queryByTestId } = render(
      <EditProfileScreen role="client" onGoBack={onGoBack} />,
    );

    expect(queryByTestId("btn-edit-description")).toBeNull();
  });

  it("shows an edit button for the description on workers", () => {
    mockUseEditProfile.mockReturnValue(successReturn());
    const { getByTestId } = render(
      <EditProfileScreen role="worker" onGoBack={onGoBack} />,
    );

    expect(getByTestId("btn-edit-description")).toBeTruthy();
  });

  it("opens the description editor prefilled and saves the new value", async () => {
    const saveDescription = jest.fn().mockResolvedValue(true);
    mockUseEditProfile.mockReturnValue(successReturn({ saveDescription }));
    const { getByTestId, queryByTestId } = render(
      <EditProfileScreen role="worker" onGoBack={onGoBack} />,
    );

    fireEvent.press(getByTestId("btn-edit-description"));
    expect(getByTestId("input-description").props.value).toBe(
      "Electricista matriculado",
    );

    fireEvent.changeText(getByTestId("input-description"), "Nueva bio");
    fireEvent.press(getByTestId("btn-description-save"));

    await waitFor(() => {
      expect(saveDescription).toHaveBeenCalledWith("Nueva bio");
    });
    await waitFor(() => {
      expect(queryByTestId("input-description")).toBeNull();
    });
  });

  it("keeps the modal open and shows an error when saving fails", async () => {
    const saveDescription = jest.fn().mockResolvedValue(false);
    mockUseEditProfile.mockReturnValue(
      successReturn({
        saveDescription,
        saveError: "No pudimos guardar la descripción.",
      }),
    );
    const { getByTestId } = render(
      <EditProfileScreen role="worker" onGoBack={onGoBack} />,
    );

    fireEvent.press(getByTestId("btn-edit-description"));
    fireEvent.press(getByTestId("btn-description-save"));

    await waitFor(() => {
      expect(saveDescription).toHaveBeenCalled();
    });
    expect(getByTestId("input-description")).toBeTruthy();
  });

  it("shows the avatar edit button", () => {
    mockUseEditProfile.mockReturnValue(successReturn());
    const { getByTestId } = render(
      <EditProfileScreen role="worker" onGoBack={onGoBack} />,
    );

    expect(getByTestId("btn-edit-avatar")).toBeTruthy();
  });

  it("surfaces a save error banner when saving the photo fails", () => {
    mockUseEditProfile.mockReturnValue(
      successReturn({ saveError: "No pudimos guardar la foto." }),
    );
    const { getByText } = render(
      <EditProfileScreen role="worker" onGoBack={onGoBack} />,
    );

    expect(getByText("No pudimos guardar la foto.")).toBeTruthy();
  });
});
