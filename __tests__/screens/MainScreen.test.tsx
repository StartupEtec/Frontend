import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { MainScreen } from "../../src/screens/MainScreen";

describe("MainScreen", () => {
  const mockOnNavigateToProfile = jest.fn();
  const mockOnNavigateToCompleteProfile = jest.fn();
  const mockOnResetOnboarding = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders welcome text and role label for client", () => {
    const { getByText } = render(
      <MainScreen
        selectedRole="client"
        profileCompleted={false}
        justCompletedProfile={false}
        onNavigateToProfile={mockOnNavigateToProfile}
        onNavigateToCompleteProfile={mockOnNavigateToCompleteProfile}
        onResetOnboarding={mockOnResetOnboarding}
      />,
    );

    expect(getByText("🏠 Pantalla Principal")).toBeTruthy();
    expect(getByText("Modo Cliente")).toBeTruthy();
  });

  it("shows worker mode when role is worker", () => {
    const { getByText } = render(
      <MainScreen
        selectedRole="worker"
        profileCompleted={false}
        justCompletedProfile={false}
        onNavigateToProfile={mockOnNavigateToProfile}
        onNavigateToCompleteProfile={mockOnNavigateToCompleteProfile}
        onResetOnboarding={mockOnResetOnboarding}
      />,
    );

    expect(getByText("Modo Trabajador")).toBeTruthy();
  });

  it("navigates to profile when profile button pressed", () => {
    const { getByTestId } = render(
      <MainScreen
        selectedRole="client"
        profileCompleted={false}
        justCompletedProfile={false}
        onNavigateToProfile={mockOnNavigateToProfile}
        onNavigateToCompleteProfile={mockOnNavigateToCompleteProfile}
        onResetOnboarding={mockOnResetOnboarding}
      />,
    );

    fireEvent.press(getByTestId("btn-main-profile"));
    expect(mockOnNavigateToProfile).toHaveBeenCalled();
  });

  it("shows complete profile button when profile not completed", () => {
    const { getByTestId } = render(
      <MainScreen
        selectedRole="client"
        profileCompleted={false}
        justCompletedProfile={false}
        onNavigateToProfile={mockOnNavigateToProfile}
        onNavigateToCompleteProfile={mockOnNavigateToCompleteProfile}
        onResetOnboarding={mockOnResetOnboarding}
      />,
    );

    expect(getByTestId("btn-complete-profile")).toBeTruthy();
  });

  it("hides complete profile button when justCompletedProfile is true", () => {
    const { queryByTestId } = render(
      <MainScreen
        selectedRole="client"
        profileCompleted={false}
        justCompletedProfile={true}
        onNavigateToProfile={mockOnNavigateToProfile}
        onNavigateToCompleteProfile={mockOnNavigateToCompleteProfile}
        onResetOnboarding={mockOnResetOnboarding}
      />,
    );

    expect(queryByTestId("btn-complete-profile")).toBeNull();
  });

  it("calls onResetOnboarding when reset button pressed", () => {
    const { getByTestId } = render(
      <MainScreen
        selectedRole="client"
        profileCompleted={false}
        justCompletedProfile={false}
        onNavigateToProfile={mockOnNavigateToProfile}
        onNavigateToCompleteProfile={mockOnNavigateToCompleteProfile}
        onResetOnboarding={mockOnResetOnboarding}
      />,
    );

    fireEvent.press(getByTestId("btn-reset-onboarding"));
    expect(mockOnResetOnboarding).toHaveBeenCalled();
  });
});
