import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ProfileScreen } from "../../src/screens/ProfileScreen";

jest.mock("../../src/services/userService", () => ({
  userService: { switchRole: jest.fn() },
}));

describe("ProfileScreen", () => {
  const mockOnRoleChanged = jest.fn();
  const mockOnGoBack = jest.fn();
  const mockOnLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders profile title and current role", () => {
    const { getByText, getAllByText } = render(
      <ProfileScreen
        currentRole="client"
        onRoleChanged={mockOnRoleChanged}
        onGoBack={mockOnGoBack}
        onLogout={mockOnLogout}
      />,
    );

    expect(getByText("Mi Perfil")).toBeTruthy();
    expect(
      getByText(/Estás en modo/),
    ).toBeTruthy();
    expect(getAllByText("Cliente").length).toBeGreaterThanOrEqual(1);
  });

  it("navigates back when back button pressed", () => {
    const { getByTestId } = render(
      <ProfileScreen
        currentRole="client"
        onRoleChanged={mockOnRoleChanged}
        onGoBack={mockOnGoBack}
        onLogout={mockOnLogout}
      />,
    );

    fireEvent.press(getByTestId("btn-profile-back"));
    expect(mockOnGoBack).toHaveBeenCalled();
  });

  it("opens role switch modal when Cambiar Rol pressed", () => {
    const { getByTestId } = render(
      <ProfileScreen
        currentRole="client"
        onRoleChanged={mockOnRoleChanged}
        onGoBack={mockOnGoBack}
        onLogout={mockOnLogout}
      />,
    );

    fireEvent.press(getByTestId("btn-switch-role"));
    expect(getByTestId("role-switch-modal")).toBeTruthy();
  });

  it("calls onLogout when logout button pressed", () => {
    const { getByTestId } = render(
      <ProfileScreen
        currentRole="client"
        onRoleChanged={mockOnRoleChanged}
        onGoBack={mockOnGoBack}
        onLogout={mockOnLogout}
      />,
    );

    fireEvent.press(getByTestId("btn-logout"));
    expect(mockOnLogout).toHaveBeenCalled();
  });

  it("shows worker role indicator when role is worker", () => {
    const { getAllByText } = render(
      <ProfileScreen
        currentRole="worker"
        onRoleChanged={mockOnRoleChanged}
        onGoBack={mockOnGoBack}
        onLogout={mockOnLogout}
      />,
    );

    expect(getAllByText("Trabajador").length).toBeGreaterThanOrEqual(1);
  });
});
