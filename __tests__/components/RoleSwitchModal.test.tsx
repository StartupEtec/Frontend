import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { RoleSwitchModal } from "../../src/components/RoleSwitchModal";

describe("RoleSwitchModal", () => {
  const mockOnSelectRole = jest.fn();
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not render when visible is false", () => {
    const { queryByTestId } = render(
      <RoleSwitchModal
        visible={false}
        currentRole="client"
        isSubmitting={false}
        error={null}
        onSelectRole={mockOnSelectRole}
        onDismiss={mockOnDismiss}
      />,
    );

    expect(queryByTestId("role-switch-modal")).toBeNull();
  });

  it("renders when visible is true with current role highlighted", () => {
    const { getByTestId, getByText } = render(
      <RoleSwitchModal
        visible={true}
        currentRole="client"
        isSubmitting={false}
        error={null}
        onSelectRole={mockOnSelectRole}
        onDismiss={mockOnDismiss}
      />,
    );

    expect(getByTestId("role-switch-modal")).toBeTruthy();
    expect(getByText("Cambiar Rol")).toBeTruthy();
    expect(getByText("Cliente")).toBeTruthy();
    expect(getByText("Trabajador")).toBeTruthy();
  });

  it("calls onSelectRole with worker when worker option pressed", () => {
    const { getByTestId } = render(
      <RoleSwitchModal
        visible={true}
        currentRole="client"
        isSubmitting={false}
        error={null}
        onSelectRole={mockOnSelectRole}
        onDismiss={mockOnDismiss}
      />,
    );

    fireEvent.press(getByTestId("role-option-worker"));
    expect(mockOnSelectRole).toHaveBeenCalledWith("worker");
  });

  it("calls onSelectRole with client when client option pressed", () => {
    const { getByTestId } = render(
      <RoleSwitchModal
        visible={true}
        currentRole="worker"
        isSubmitting={false}
        error={null}
        onSelectRole={mockOnSelectRole}
        onDismiss={mockOnDismiss}
      />,
    );

    fireEvent.press(getByTestId("role-option-client"));
    expect(mockOnSelectRole).toHaveBeenCalledWith("client");
  });

  it("calls onDismiss when cancel pressed", () => {
    const { getByTestId } = render(
      <RoleSwitchModal
        visible={true}
        currentRole="client"
        isSubmitting={false}
        error={null}
        onSelectRole={mockOnSelectRole}
        onDismiss={mockOnDismiss}
      />,
    );

    fireEvent.press(getByTestId("btn-role-switch-cancel"));
    expect(mockOnDismiss).toHaveBeenCalled();
  });

  it("disables options when submitting", () => {
    const { getByTestId } = render(
      <RoleSwitchModal
        visible={true}
        currentRole="client"
        isSubmitting={true}
        error={null}
        onSelectRole={mockOnSelectRole}
        onDismiss={mockOnDismiss}
      />,
    );

    expect(getByTestId("role-option-client").props.accessibilityState.disabled).toBe(true);
    expect(getByTestId("role-option-worker").props.accessibilityState.disabled).toBe(true);
  });

  it("shows error message when error is provided", () => {
    const { getByTestId, getByText } = render(
      <RoleSwitchModal
        visible={true}
        currentRole="client"
        isSubmitting={false}
        error="Debes tener perfil de trabajador"
        onSelectRole={mockOnSelectRole}
        onDismiss={mockOnDismiss}
      />,
    );

    expect(getByTestId("role-switch-error")).toBeTruthy();
    expect(getByText("Debes tener perfil de trabajador")).toBeTruthy();
  });

  it("shows loading indicator when submitting", () => {
    const { getByTestId } = render(
      <RoleSwitchModal
        visible={true}
        currentRole="client"
        isSubmitting={true}
        error={null}
        onSelectRole={mockOnSelectRole}
        onDismiss={mockOnDismiss}
      />,
    );

    expect(getByTestId("role-switch-loading")).toBeTruthy();
  });
});
