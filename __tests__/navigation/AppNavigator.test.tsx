import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppNavigator } from "../../src/navigation/AppNavigator";
import { RoleProvider } from "../../src/context/RoleContext";
import { userService } from "../../src/services/userService";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock("../../src/services/userService", () => ({
  userService: { switchRole: jest.fn() },
}));

jest.mock("../../src/services/profileService", () => ({
  profileService: {
    getIdentity: jest.fn().mockResolvedValue(null),
    getPrivateProfile: jest.fn(),
  },
  toDisplayUri: jest.requireActual("../../src/services/profileService")
    .toDisplayUri,
}));

describe("AppNavigator Flow Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockStorage = (overrides: Record<string, string | null> = {}) => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(
      (key: string) => overrides[key] ?? null,
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

  it("prioritizes the JWT role over a stale local role on restore", async () => {
    mockStorage({
      "@startup_app/onboarding_completed": "true",
      // El JWT (fuente que usa el backend) dice worker...
      "@startup_app/access_token":
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlci0xMjMiLCJlbWFpbCI6ImFAYi5jb20iLCJjdXJyZW50X3JvbGUiOiJ3b3JrZXIifQ.sig",
      "@startup_app/user_id": "user-123",
      // ...aunque el rol local guardado diga client.
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
    expect(getByText("Modo Trabajador")).toBeTruthy();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@startup_app/last_role_user-123",
      "worker",
    );
  });

  it("falls back to the stored local role when the token has no role claim", async () => {
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

  it("marks profile completed when backend identity is complete", async () => {
    const { profileService } = require("../../src/services/profileService");
    (profileService.getIdentity as jest.Mock).mockResolvedValue({
      full_name: "Juan",
      date_of_birth: "1990-03-15",
      avatar_url: "/uploads/a.jpg",
      dni_front_url: "/uploads/f.jpg",
      dni_back_url: "/uploads/b.jpg",
      is_complete: true,
    });
    mockStorage({
      "@startup_app/onboarding_completed": "true",
      "@startup_app/access_token": "access-token-123",
      "@startup_app/user_id": "user-123",
      "@startup_app/last_role_user-123": "client",
    });

    const { getByText, queryByText } = render(
      <RoleProvider>
        <AppNavigator />
      </RoleProvider>,
    );

    await waitFor(() => {
      expect(getByText("Pantalla Principal")).toBeTruthy();
    });
    expect(queryByText("Terminar de completar perfil ahora")).toBeNull();
  });

  it("asks to complete once when backend identity is partial despite old local flag", async () => {
    const { profileService } = require("../../src/services/profileService");
    (profileService.getIdentity as jest.Mock).mockResolvedValue({
      full_name: "Juan",
      date_of_birth: null,
      avatar_url: "/uploads/a.jpg",
      dni_front_url: null,
      dni_back_url: null,
      is_complete: false,
    });
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
      expect(getByText("Terminar de completar perfil ahora")).toBeTruthy();
    });
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

  it("goes to RoleSelection on reopen when a valid session exists but no role was chosen", async () => {
    mockStorage({
      "@startup_app/onboarding_completed": "true",
      // Token válido con current_role=client (default del backend).
      "@startup_app/access_token":
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlci0yIiwiY3VycmVudF9yb2xlIjoiY2xpZW50In0.sig",
      "@startup_app/user_id": "user-2",
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

    fireEvent.press(getByTestId("btn-account"));

    await waitFor(() => {
      expect(getByText("Mi Perfil")).toBeTruthy();
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

  it("switches role from the account screen (Mi Perfil)", async () => {
    mockStorage({
      "@startup_app/onboarding_completed": "true",
      "@startup_app/access_token": "access-token-123",
      "@startup_app/user_id": "user-123",
      "@startup_app/last_role_user-123": "client",
    });

    (userService.switchRole as jest.Mock).mockResolvedValue({
      new_role: "worker",
      previous_role: "client",
      accessToken: "worker-token-abc",
      timestamp: "2026-01-01T00:00:00.000Z",
    });

    const { getByText, getByTestId } = render(
      <RoleProvider>
        <AppNavigator />
      </RoleProvider>,
    );

    await waitFor(() => {
      expect(getByText("Pantalla Principal")).toBeTruthy();
    });
    expect(getByText("Modo Cliente")).toBeTruthy();

    fireEvent.press(getByTestId("btn-account"));

    await waitFor(() => {
      expect(getByText("Mi Perfil")).toBeTruthy();
    });

    fireEvent.press(getByTestId("btn-switch-role"));

    await waitFor(() => {
      expect(getByTestId("role-switch-modal")).toBeTruthy();
    });

    fireEvent.press(getByTestId("role-option-worker"));

    await waitFor(
      () => {
        expect(getByText(/Estás en modo Trabajador/)).toBeTruthy();
      },
      { timeout: 6000 },
    );

    expect(userService.switchRole).toHaveBeenCalledWith("user-123", {
      role: "worker",
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@startup_app/last_role_user-123",
      "worker",
    );

    fireEvent.press(getByTestId("btn-profile-back"));

    await waitFor(() => {
      expect(getByText("Modo Trabajador")).toBeTruthy();
    });
  });

  it("navigates from Mi Perfil to Editar Perfil and shows the profile data", async () => {
    const { profileService } = require("../../src/services/profileService");
    (profileService.getIdentity as jest.Mock).mockResolvedValue({
      full_name: "Juan Pérez",
      date_of_birth: "1990-03-15",
      avatar_url: "/uploads/profiles/selfie.jpg",
      dni_front_url: "/uploads/front.jpg",
      dni_back_url: "/uploads/back.jpg",
      is_complete: true,
    });
    (profileService.getPrivateProfile as jest.Mock).mockResolvedValue({
      id: "user-123",
      email: "juan@example.com",
      phone: "+5491112345678",
      current_role: "worker",
      is_verified: true,
      verified_email: true,
      verified_phone: true,
      active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      average_rating: null,
      identity: null,
      profile: {
        client: {
          full_name: "Juan Pérez",
          avatar_url: "/uploads/client.jpg",
          bio: null,
        },
        worker: {
          full_name: "Juan Pérez",
          avatar_url: "/uploads/worker.jpg",
          bio: "Electricista",
        },
      },
    });
    mockStorage({
      "@startup_app/onboarding_completed": "true",
      "@startup_app/access_token": "access-token-123",
      "@startup_app/user_id": "user-123",
      "@startup_app/last_role_user-123": "worker",
    });

    const { getByText, getByTestId } = render(
      <RoleProvider>
        <AppNavigator />
      </RoleProvider>,
    );

    await waitFor(() => {
      expect(getByText("Pantalla Principal")).toBeTruthy();
    });

    fireEvent.press(getByTestId("btn-account"));

    await waitFor(() => {
      expect(getByText("Mi Perfil")).toBeTruthy();
    });

    fireEvent.press(getByTestId("btn-edit-profile"));

    await waitFor(() => {
      expect(getByText("Editar Perfil")).toBeTruthy();
    });

    await waitFor(() => {
      expect(getByText("juan@example.com")).toBeTruthy();
    });
    expect(getByTestId("edit-profile-first-name").props.children).toBe("Juan");
    expect(getByTestId("edit-profile-description")).toBeTruthy();
  });
});
