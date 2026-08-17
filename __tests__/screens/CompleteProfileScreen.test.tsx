import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { CompleteProfileScreen } from "../../src/screens/CompleteProfileScreen";
import { useCompleteProfile } from "../../src/hooks/useCompleteProfile";

jest.mock("../../src/hooks/useCompleteProfile", () => ({
  useCompleteProfile: jest.fn(),
}));

jest.mock("expo-image-picker", () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));

jest.mock("expo-file-system", () => ({
  getInfoAsync: jest.fn(),
}));

jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: (props: any) => React.createElement("DateTimePicker", props),
  };
});

const DEFAULT_MOCK = {
  formData: {
    selfieUri: null,
    dniFrontUri: null,
    dniBackUri: null,
    dateOfBirth: "",
    dateOfBirthDate: null,
  },
  errors: {},
  status: "idle" as const,
  updateField: jest.fn(),
  handleSave: jest.fn(),
};

const DEFAULT_PROPS = {
  role: "client" as const,
  onProfileCompleted: jest.fn(),
  onGoBack: jest.fn(),
};

describe("CompleteProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCompleteProfile as jest.Mock).mockReturnValue(DEFAULT_MOCK);
  });

  it("renders title and subtitle", () => {
    const { getByText } = render(<CompleteProfileScreen {...DEFAULT_PROPS} />);
    expect(getByText("Completá tu perfil")).toBeTruthy();
    expect(getByText(/verificar tu identidad/)).toBeTruthy();
  });

  it("renders all required field labels", () => {
    const { getByText } = render(<CompleteProfileScreen {...DEFAULT_PROPS} />);
    expect(getByText("Foto tuya *")).toBeTruthy();
    expect(getByText("Documento de identidad *")).toBeTruthy();
    expect(getByText("Fecha de nacimiento *")).toBeTruthy();
  });

  it("renders date picker button with placeholder", () => {
    const { getByText } = render(<CompleteProfileScreen {...DEFAULT_PROPS} />);
    expect(getByText("Seleccionar fecha")).toBeTruthy();
  });

  it("renders save button and back arrow", () => {
    const { getByText, getByTestId } = render(
      <CompleteProfileScreen {...DEFAULT_PROPS} />,
    );
    expect(getByText("Guardar perfil")).toBeTruthy();
    expect(getByTestId("btn-profile-back")).toBeTruthy();
  });

  it("calls handleSave when save button is pressed", () => {
    const handleSave = jest.fn();
    (useCompleteProfile as jest.Mock).mockReturnValue({
      ...DEFAULT_MOCK,
      handleSave,
    });

    const { getByText } = render(<CompleteProfileScreen {...DEFAULT_PROPS} />);
    fireEvent.press(getByText("Guardar perfil"));
    expect(handleSave).toHaveBeenCalled();
  });

  it("calls onGoBack when back arrow is pressed", () => {
    const onGoBack = jest.fn();
    const { getByTestId } = render(
      <CompleteProfileScreen {...DEFAULT_PROPS} onGoBack={onGoBack} />,
    );
    fireEvent.press(getByTestId("btn-profile-back"));
    expect(onGoBack).toHaveBeenCalled();
  });

  it("shows error banner when general error exists", () => {
    (useCompleteProfile as jest.Mock).mockReturnValue({
      ...DEFAULT_MOCK,
      errors: { general: "Sesión expirada" },
    });

    const { getByText } = render(<CompleteProfileScreen {...DEFAULT_PROPS} />);
    expect(getByText("Sesión expirada")).toBeTruthy();
  });

  it("does not render location field", () => {
    const { queryByPlaceholderText } = render(
      <CompleteProfileScreen {...DEFAULT_PROPS} />,
    );
    expect(queryByPlaceholderText("Dirección o ciudad")).toBeNull();
  });

  it("does not render skip button", () => {
    const { queryByText } = render(
      <CompleteProfileScreen {...DEFAULT_PROPS} />,
    );
    expect(queryByText("Saltar por ahora")).toBeNull();
  });
});
