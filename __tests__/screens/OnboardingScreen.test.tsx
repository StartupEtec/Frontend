import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { OnboardingScreen } from "../../src/screens/OnboardingScreen";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe("OnboardingScreen Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it("renders onboarding screen correctly", async () => {
    const { getByText } = render(<OnboardingScreen />);

    await waitFor(() => {
      expect(getByText("Conecta con Servicios al Instante")).toBeTruthy();
      expect(getByText("Omitir")).toBeTruthy();
      expect(getByText("Siguiente")).toBeTruthy();
    });
  });

  it("triggers skip action when Omitir button is pressed", async () => {
    const mockFinish = jest.fn();
    const { getByText } = render(
      <OnboardingScreen onFinishOnboarding={mockFinish} />,
    );

    await waitFor(() => {
      const skipButton = getByText("Omitir");
      fireEvent.press(skipButton);
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@startup_app/onboarding_completed",
      "true",
    );
    expect(mockFinish).toHaveBeenCalledWith("AuthWelcome");
  });
});
