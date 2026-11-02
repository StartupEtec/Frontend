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
  categoryIds: ["cat-1"],
  categoryNames: ["Electricidad"],
  avatarUrl: "http://10.0.2.2:3000/uploads/profiles/selfie.jpg",
};

const baseForm = {
  firstName: "Juan",
  lastName: "Pérez",
  description: "Electricista matriculado",
  categoryIds: ["cat-1"],
};

const categories = [
  {
    id: "cat-1",
    name: "Electricidad",
    description: null,
    icon_url: null,
  },
  { id: "cat-2", name: "Plomería", description: null, icon_url: null },
];

const successReturn = (overrides: Record<string, unknown> = {}) => ({
  data: baseData,
  form: baseForm,
  errors: {},
  touched: {},
  status: "success",
  error: null,
  reload: jest.fn(),
  saveAvatar: jest.fn().mockResolvedValue(true),
  save: jest.fn().mockResolvedValue(true),
  resetForm: jest.fn(),
  setField: jest.fn(),
  markTouched: jest.fn(),
  addCategory: jest.fn(),
  removeCategory: jest.fn(),
  avatarSaving: false,
  isSaving: false,
  canSave: true,
  saveSuccess: false,
  clearSaveSuccess: jest.fn(),
  saveError: null,
  clearSaveError: jest.fn(),
  categories,
  categoriesLoading: false,
  ...overrides,
});

describe("EditProfileScreen", () => {
  const onGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders read-only name/surname and contact data for workers", () => {
    mockUseEditProfile.mockReturnValue(successReturn());
    const { getByText, getByTestId } = render(
      <EditProfileScreen role="worker" onGoBack={onGoBack} />,
    );

    expect(getByText("Editar Perfil")).toBeTruthy();
    // Nombre y apellido son solo lectura (ProfileInfoRow)
    expect(getByTestId("edit-profile-first-name").props.children).toBe("Juan");
    expect(getByTestId("edit-profile-last-name").props.children).toBe(
      "Pérez",
    );
    expect(getByTestId("edit-profile-phone").props.children).toBe(
      "+5491112345678",
    );
    expect(getByTestId("edit-profile-email").props.children).toBe(
      "juan@example.com",
    );
    expect(getByTestId("input-description").props.value).toBe(
      "Electricista matriculado",
    );
    expect(getByText("Electricidad")).toBeTruthy();
    expect(getByTestId("edit-profile-avatar")).toBeTruthy();
  });

  it("hides description and categories for clients", () => {
    mockUseEditProfile.mockReturnValue(successReturn());
    const { queryByTestId, getByTestId } = render(
      <EditProfileScreen role="client" onGoBack={onGoBack} />,
    );

    expect(queryByTestId("input-description")).toBeNull();
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

  it("shows a fallback for empty read-only values", () => {
    mockUseEditProfile.mockReturnValue(
      successReturn({
        data: { ...baseData, phone: "", email: "" },
      }),
    );
    const { getByTestId } = render(
      <EditProfileScreen role="client" onGoBack={onGoBack} />,
    );

    expect(getByTestId("edit-profile-phone").props.children).toBe(
      "No definido",
    );
  });

  it("shows a loading state", () => {
    mockUseEditProfile.mockReturnValue(
      successReturn({ status: "loading" }),
    );
    const { getByText, queryByTestId } = render(
      <EditProfileScreen role="client" onGoBack={onGoBack} />,
    );

    expect(getByText("Cargando perfil...")).toBeTruthy();
    expect(queryByTestId("edit-profile-first-name")).toBeNull();
  });

  it("shows an error state and retries", () => {
    const reload = jest.fn();
    mockUseEditProfile.mockReturnValue(
      successReturn({
        status: "error",
        error: "No pudimos cargar tu perfil. Reintentá.",
        reload,
      }),
    );
    const { getByText, getByTestId } = render(
      <EditProfileScreen role="client" onGoBack={onGoBack} />,
    );

    expect(getByText("No pudimos cargar tu perfil. Reintentá.")).toBeTruthy();
    fireEvent.press(getByTestId("btn-edit-profile-retry"));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("going back discards the local changes and navigates back", () => {
    const resetForm = jest.fn();
    mockUseEditProfile.mockReturnValue(successReturn({ resetForm }));
    const { getByTestId } = render(
      <EditProfileScreen role="client" onGoBack={onGoBack} />,
    );

    fireEvent.press(getByTestId("btn-edit-profile-back"));
    expect(resetForm).toHaveBeenCalledTimes(1);
    expect(onGoBack).toHaveBeenCalledTimes(1);
  });

  it("updates the description field and surfaces its validation error", () => {
    const setField = jest.fn();
    const markTouched = jest.fn();
    mockUseEditProfile.mockReturnValue(
      successReturn({
        setField,
        markTouched,
        errors: { description: "Máximo 500 caracteres" },
        touched: { description: true },
      }),
    );
    const { getByTestId } = render(
      <EditProfileScreen role="worker" onGoBack={onGoBack} />,
    );

    fireEvent.changeText(getByTestId("input-description"), "Ju");
    expect(setField).toHaveBeenCalledWith("description", "Ju");
    expect(getByTestId("error-description").props.children).toBe(
      "Máximo 500 caracteres",
    );
  });

  it("disables the save button when there is nothing valid to save", () => {
    const save = jest.fn();
    mockUseEditProfile.mockReturnValue(
      successReturn({ canSave: false, save }),
    );
    const { getByTestId } = render(
      <EditProfileScreen role="client" onGoBack={onGoBack} />,
    );

    const button = getByTestId("btn-edit-profile-save");
    expect(button.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(button);
    expect(save).not.toHaveBeenCalled();
  });

  it("saves the changes with the save button", async () => {
    const save = jest.fn().mockResolvedValue(true);
    mockUseEditProfile.mockReturnValue(successReturn({ save }));
    const { getByTestId } = render(
      <EditProfileScreen role="client" onGoBack={onGoBack} />,
    );

    fireEvent.press(getByTestId("btn-edit-profile-save"));

    await waitFor(() => {
      expect(save).toHaveBeenCalledTimes(1);
    });
  });

  it("opens the category modal and adds a category", () => {
    const addCategory = jest.fn();
    mockUseEditProfile.mockReturnValue(successReturn({ addCategory }));
    const { getByTestId, queryByTestId } = render(
      <EditProfileScreen role="worker" onGoBack={onGoBack} />,
    );

    // Abrir el modal de categorías desde el chip "+ Agregar"
    fireEvent.press(getByTestId("btn-add-category-chip"));
    // Seleccionar una categoría en el modal
    fireEvent.press(getByTestId("category-option-cat-2"));

    expect(addCategory).toHaveBeenCalledWith("cat-2", "Plomería");
    expect(queryByTestId("category-option-cat-2")).toBeTruthy();
  });

  it("shows the avatar edit button", () => {
    mockUseEditProfile.mockReturnValue(successReturn());
    const { getByTestId } = render(
      <EditProfileScreen role="worker" onGoBack={onGoBack} />,
    );

    expect(getByTestId("btn-edit-avatar")).toBeTruthy();
  });

  it("surfaces a save error banner when saving fails", () => {
    mockUseEditProfile.mockReturnValue(
      successReturn({ saveError: "No pudimos guardar la foto." }),
    );
    const { getByText } = render(
      <EditProfileScreen role="worker" onGoBack={onGoBack} />,
    );

    expect(getByText("No pudimos guardar la foto.")).toBeTruthy();
  });

  it("shows the success toast after saving", () => {
    mockUseEditProfile.mockReturnValue(successReturn({ saveSuccess: true }));
    const { getByText } = render(
      <EditProfileScreen role="client" onGoBack={onGoBack} />,
    );

    expect(getByText("¡Cambios guardados!")).toBeTruthy();
  });
});
