import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { NavBar } from "../../src/components/NavBar";

describe("NavBar", () => {
  const mockOnNavigateToProfile = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderBar = (role: "client" | "worker" = "client") =>
    render(
      <NavBar
        currentRole={role}
        onNavigateToProfile={mockOnNavigateToProfile}
      />,
    );

  it("renders app title and current mode", () => {
    const { getByText } = renderBar();
    expect(getByText("StartupApp")).toBeTruthy();
    expect(getByText("Modo Cliente")).toBeTruthy();
  });

  it("shows worker mode when current role is worker", () => {
    const { getByText } = renderBar("worker");
    expect(getByText("Modo Trabajador")).toBeTruthy();
  });

  it("navigates to profile when account button is pressed", () => {
    const { getByTestId } = renderBar();
    fireEvent.press(getByTestId("btn-account"));
    expect(mockOnNavigateToProfile).toHaveBeenCalled();
  });
});
