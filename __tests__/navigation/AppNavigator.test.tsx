import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppNavigator } from "../../src/navigation/AppNavigator";
import { authService } from "../../src/services/authService";
import { userService } from "../../src/services/userService";
import { tokenStorage } from "../../src/services/tokenStorage";
import { ApiError } from "../../src/services/api";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("../../src/services/authService", () => ({
  authService: {
    login: jest.fn(),
    verifyOtp: jest.fn(),
  },
}));

jest.mock("../../src/services/userService", () => ({
  userService: { switchRole: jest.fn() },
}));

jest.mock("../../src/services/tokenStorage", () => ({
  tokenStorage: {
    getUserId: jest.fn(),
    setAccessToken: jest.fn(),
    setRefreshToken: jest.fn(),
    setUserId: jest.fn(),
  },
}));

describe("AppNavigator Flow Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts at OnboardingScreen if onboarding is not completed, then moves to AuthWelcome on completion", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { getByText, getByTestId } = render(<AppNavigator />);

    // Wait for initial route check
    await waitFor(() => {
      expect(getByText("Conecta con Servicios al Instante")).toBeTruthy();
    });

    // Verify Onboarding carousel is active with "Omitir" button
    expect(getByText("Omitir")).toBeTruthy();

    // Click "Omitir" or complete onboarding
    fireEvent.press(getByText("Omitir"));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@startup_app/onboarding_completed",
        "true",
      );
      expect(getByText("Te Damos la Bienvenida")).toBeTruthy();
    });

    // AuthWelcome screen should have Registrarse, Iniciar Sesión, and small button to go back to carousel
    expect(getByTestId("btn-auth-register")).toBeTruthy();
    expect(getByTestId("btn-auth-login")).toBeTruthy();
    expect(getByTestId("btn-replay-onboarding")).toBeTruthy();
  });

  it("starts directly at AuthWelcomeScreen if onboarding was previously completed", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("true");

    const { getByText, getByTestId } = render(<AppNavigator />);

    await waitFor(() => {
      expect(getByText("Te Damos la Bienvenida")).toBeTruthy();
    });

    expect(getByTestId("btn-auth-register")).toBeTruthy();
    expect(getByTestId("btn-auth-login")).toBeTruthy();
  });

  it("navigates to RegisterScreen from AuthWelcomeScreen and back using the arrow button next to title", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("true");

    const { getByText, getByTestId } = render(<AppNavigator />);

    await waitFor(() => {
      expect(getByText("Te Damos la Bienvenida")).toBeTruthy();
    });

    // Press Registrarse
    fireEvent.press(getByTestId("btn-auth-register"));

    await waitFor(() => {
      expect(getByText("Crear Cuenta")).toBeTruthy();
    });

    // Back arrow button next to title
    const backBtn = getByTestId("btn-register-back");
    expect(backBtn).toBeTruthy();

    // Press back button to return to AuthWelcomeScreen
    fireEvent.press(backBtn);

    await waitFor(() => {
      expect(getByText("Te Damos la Bienvenida")).toBeTruthy();
    });
  });

  it("navigates back to Onboarding carousel when clicking small button on AuthWelcomeScreen", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("true");

    const { getByText, getByTestId } = render(<AppNavigator />);

    await waitFor(() => {
      expect(getByText("Te Damos la Bienvenida")).toBeTruthy();
    });

    // Click small replay onboarding button
    fireEvent.press(getByTestId("btn-replay-onboarding"));

    await waitFor(() => {
      expect(getByText("Conecta con Servicios al Instante")).toBeTruthy();
    });
  });

  it("reaches Main, opens Profile menu, and switches role successfully", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      switch (key) {
        case "@startup_app/onboarding_completed":
          return Promise.resolve("true");
        case "@startup_app/profile_completed_user-1":
          return Promise.resolve("true");
        case "@startup_app/last_role_user-1":
          return Promise.resolve("client");
        default:
          return Promise.resolve(null);
      }
    });
    (tokenStorage.getUserId as jest.Mock).mockResolvedValue("user-1");
    (authService.login as jest.Mock).mockResolvedValue({ message: "Código enviado." });
    (authService.verifyOtp as jest.Mock).mockResolvedValue({
      accessToken: "access-123",
      refreshToken: "refresh-123",
      userId: "user-1",
    });
    (userService.switchRole as jest.Mock).mockResolvedValue({
      new_role: "worker",
      previous_role: "client",
      accessToken: "new-access-123",
      timestamp: "2026-01-01T00:00:00Z",
    });

    const { getByText, getByTestId, getAllByText } = render(<AppNavigator />);

    await waitFor(() => {
      expect(getByText("Te Damos la Bienvenida")).toBeTruthy();
    });

    // Go to Login
    fireEvent.press(getByTestId("btn-auth-login"));
    await waitFor(() => {
      expect(getByTestId("input-email-phone")).toBeTruthy();
    });

    // Submit login to trigger OTP
    fireEvent.changeText(getByTestId("input-email-phone"), "user@test.com");
    fireEvent.changeText(getByTestId("input-password"), "Password1!");
    fireEvent.press(getByTestId("btn-login-submit"));

    await waitFor(() => {
      expect(getByText("Verificar tu identidad")).toBeTruthy();
    });

    // Enter OTP and verify
    for (let i = 0; i < 6; i++) {
      fireEvent.changeText(getByTestId(`otp-input-${i}`), String(i + 1));
    }
    fireEvent.press(getByTestId("btn-otp-verify"));

    // handleOtpSuccess reads saved role → client → should reach Main
    await waitFor(() => {
      expect(getByText("🏠 Pantalla Principal")).toBeTruthy();
      expect(getByText("Modo Cliente")).toBeTruthy();
    });

    // Open Profile menu from Main
    fireEvent.press(getByTestId("btn-main-profile"));
    await waitFor(() => {
      expect(getByText("Mi Perfil")).toBeTruthy();
    });

    // Open role switch modal
    fireEvent.press(getByTestId("btn-switch-role"));
    expect(getByTestId("role-switch-modal")).toBeTruthy();

    // Switch to worker
    fireEvent.press(getByTestId("role-option-worker"));

    await waitFor(() => {
      expect(userService.switchRole).toHaveBeenCalledWith("user-1", {
        role: "worker",
      });
      expect(tokenStorage.setAccessToken).toHaveBeenCalledWith("new-access-123");
      expect(getByTestId("success-toast")).toBeTruthy();
    });

    // Toast completes (~3s) then onRoleChanged fires → ProfileMenu shows worker
    await waitFor(
      () => {
        expect(getAllByText("Trabajador").length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 6000 },
    );

    // Back to Main now shows Modo Trabajador (navigation options updated)
    fireEvent.press(getByTestId("btn-profile-back"));
    await waitFor(() => {
      expect(getByText("Modo Trabajador")).toBeTruthy();
    });
  });
});
