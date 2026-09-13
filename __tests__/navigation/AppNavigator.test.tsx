import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppNavigator } from "../../src/navigation/AppNavigator";
import { RoleProvider } from "../../src/context/RoleContext";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

describe("AppNavigator Flow Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockStorage = (overrides: Record<string, string | null> = {}) => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
      overrides[key] ?? null,
    );
  };

  it("starts at OnboardingScreen if onboarding is not completed, then moves to AuthWelcome on completion", async () => {
    mockStorage();

    const { getByText, getByTestId } = render(
      <RoleProvider>
        <AppNavigator />
      </RoleProvider>,
    );

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
    mockStorage({ "@startup_app/onboarding_completed": "true" });

    const { getByText, getByTestId } = render(
      <RoleProvider>
        <AppNavigator />
      </RoleProvider>,
    );

    await waitFor(() => {
      expect(getByText("Te Damos la Bienvenida")).toBeTruthy();
    });

    expect(getByTestId("btn-auth-register")).toBeTruthy();
    expect(getByTestId("btn-auth-login")).toBeTruthy();
  });

  it("navigates to RegisterScreen from AuthWelcomeScreen and back using the arrow button next to title", async () => {
    mockStorage({ "@startup_app/onboarding_completed": "true" });

    const { getByText, getByTestId } = render(
      <RoleProvider>
        <AppNavigator />
      </RoleProvider>,
    );

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
    mockStorage({ "@startup_app/onboarding_completed": "true" });

    const { getByText, getByTestId } = render(
      <RoleProvider>
        <AppNavigator />
      </RoleProvider>,
    );

    await waitFor(() => {
      expect(getByText("Te Damos la Bienvenida")).toBeTruthy();
    });

    // Click small replay onboarding button
    fireEvent.press(getByTestId("btn-replay-onboarding"));

    await waitFor(() => {
      expect(getByText("Conecta con Servicios al Instante")).toBeTruthy();
    });
  });

  it("goes straight to Main on reopen when a session with role is stored", async () => {
    mockStorage({
      "@startup_app/onboarding_completed": "true",
      "@startup_app/access_token": "access-token-123",
      "@startup_app/user_id": "user-123",
      "@startup_app/profile_completed_user-123": "true",
      "@startup_app/last_role_user-123": "client",
    });

    const { getByText } = render(
      <RoleProvider>
        <AppNavigator />
      </RoleProvider>,
    );

    await waitFor(() => {
      expect(getByText("Pantalla Principal")).toBeTruthy();
    });
    expect(getByText("Modo Cliente")).toBeTruthy();
  });

  it("restores worker role on Main when reopened in worker mode", async () => {
    mockStorage({
      "@startup_app/onboarding_completed": "true",
      "@startup_app/access_token": "access-token-123",
      "@startup_app/user_id": "user-456",
      "@startup_app/last_role_user-456": "worker",
    });

    const { getByText } = render(
      <RoleProvider>
        <AppNavigator />
      </RoleProvider>,
    );

    await waitFor(() => {
      expect(getByText("Pantalla Principal")).toBeTruthy();
    });
    expect(getByText("Modo Trabajador")).toBeTruthy();
  });

  it("goes to RoleSelection on reopen when session exists but no role was chosen", async () => {
    mockStorage({
      "@startup_app/onboarding_completed": "true",
      "@startup_app/access_token": "access-token-123",
      "@startup_app/user_id": "user-123",
    });

    const { getByText } = render(
      <RoleProvider>
        <AppNavigator />
      </RoleProvider>,
    );

    await waitFor(() => {
      expect(getByText("Elegí tu Rol")).toBeTruthy();
    });
  });

  it("stays at AuthWelcome on reopen when no session is stored", async () => {
    mockStorage({ "@startup_app/onboarding_completed": "true" });

    const { getByText } = render(
      <RoleProvider>
        <AppNavigator />
      </RoleProvider>,
    );

    await waitFor(() => {
      expect(getByText("Te Damos la Bienvenida")).toBeTruthy();
    });
  });

  it("logs out from Main and returns to AuthWelcome clearing the session", async () => {
    mockStorage({
      "@startup_app/onboarding_completed": "true",
      "@startup_app/access_token": "access-token-123",
      "@startup_app/user_id": "user-123",
      "@startup_app/last_role_user-123": "client",
    });

    const { getByText, getByTestId } = render(
      <RoleProvider>
        <AppNavigator />
      </RoleProvider>,
    );

    await waitFor(() => {
      expect(getByText("Pantalla Principal")).toBeTruthy();
    });

    fireEvent.press(getByTestId("btn-logout"));

    await waitFor(() => {
      expect(getByText("Te Damos la Bienvenida")).toBeTruthy();
    });

    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
      "@startup_app/access_token",
      "@startup_app/refresh_token",
      "@startup_app/user_id",
    ]);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      "@startup_app/selected_role",
    );
  });
});
