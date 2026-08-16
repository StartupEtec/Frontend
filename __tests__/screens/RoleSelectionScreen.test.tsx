import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { RoleSelectionScreen } from "../../src/screens/RoleSelectionScreen";
import { useRoleSelection } from "../../src/hooks/useRoleSelection";

jest.mock("../../src/hooks/useRoleSelection", () => ({
  useRoleSelection: jest.fn(),
}));

const DEFAULT_MOCK = {
  selectedRole: null,
  isSaving: false,
  error: null,
  handleSelectRole: jest.fn(),
  confirmSelection: jest.fn(),
};

const DEFAULT_PROPS = {
  onRoleSelected: jest.fn(),
};

describe("RoleSelectionScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRoleSelection as jest.Mock).mockReturnValue(DEFAULT_MOCK);
  });

  it("renders title and subtitle", () => {
    const { getByText } = render(<RoleSelectionScreen {...DEFAULT_PROPS} />);
    expect(getByText("Elegí tu Rol")).toBeTruthy();
    expect(getByText(/Seleccioná cómo querés usar la plataforma/)).toBeTruthy();
  });

  it("renders both role cards with correct titles", () => {
    const { getByText, getByTestId } = render(
      <RoleSelectionScreen {...DEFAULT_PROPS} />,
    );
    expect(getByTestId("card-client")).toBeTruthy();
    expect(getByTestId("card-worker")).toBeTruthy();
    expect(getByText("Cliente")).toBeTruthy();
    expect(getByText("Trabajador")).toBeTruthy();
  });

  it("renders the footer note about changing roles", () => {
    const { getByTestId, getByText } = render(
      <RoleSelectionScreen {...DEFAULT_PROPS} />,
    );
    expect(getByTestId("role-footer")).toBeTruthy();
    expect(getByText(/Podés cambiar tu rol en cualquier momento/)).toBeTruthy();
  });

  it("calls handleSelectRole and confirmSelection when a card is pressed", () => {
    const handleSelectRole = jest.fn();
    const confirmSelection = jest.fn();
    (useRoleSelection as jest.Mock).mockReturnValue({
      ...DEFAULT_MOCK,
      handleSelectRole,
      confirmSelection,
    });

    const { getByTestId } = render(<RoleSelectionScreen {...DEFAULT_PROPS} />);
    fireEvent.press(getByTestId("card-client"));

    expect(handleSelectRole).toHaveBeenCalledWith("client");
    expect(confirmSelection).toHaveBeenCalled();
  });

  it("does not trigger selection when saving is in progress", () => {
    const handleSelectRole = jest.fn();
    (useRoleSelection as jest.Mock).mockReturnValue({
      ...DEFAULT_MOCK,
      isSaving: true,
      handleSelectRole,
    });

    const { getByTestId } = render(<RoleSelectionScreen {...DEFAULT_PROPS} />);
    fireEvent.press(getByTestId("card-worker"));

    expect(handleSelectRole).not.toHaveBeenCalled();
  });

  it("shows saving overlay when isSaving is true", () => {
    (useRoleSelection as jest.Mock).mockReturnValue({
      ...DEFAULT_MOCK,
      isSaving: true,
    });

    const { getByTestId } = render(<RoleSelectionScreen {...DEFAULT_PROPS} />);
    expect(getByTestId("saving-overlay")).toBeTruthy();
  });

  it("shows error banner when error is present", () => {
    (useRoleSelection as jest.Mock).mockReturnValue({
      ...DEFAULT_MOCK,
      error: "No se pudo guardar",
    });

    const { getByTestId, getByText } = render(
      <RoleSelectionScreen {...DEFAULT_PROPS} />,
    );
    expect(getByTestId("role-error-banner")).toBeTruthy();
    expect(getByText("No se pudo guardar")).toBeTruthy();
  });
});
