import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppNavigator } from "../../src/navigation/AppNavigator";
import { RoleProvider } from "../../src/context/RoleContext";
import { resetNearbyWorkersCache } from "../../src/hooks/useNearbyWorkers";
import { userService } from "../../src/services/userService";
import { workerSearchService } from "../../src/services/workerSearchService";
import { locationService } from "../../src/services/locationService";
import { SavedLocation } from "../../src/types/location";
import { NearbyWorker } from "../../src/types/worker";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock("../../src/services/userService", () => ({
  userService: { switchRole: jest.fn(), getPublicProfile: jest.fn() },
}));

jest.mock("../../src/services/workerSearchService", () => ({
  workerSearchService: { nearby: jest.fn() },
}));

jest.mock("../../src/components/location/LeafletMap", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    LeafletMap: (props: Record<string, unknown>) =>
      React.createElement(View, props),
  };
});

jest.mock("../../src/services/locationService", () => ({
  locationService: {
    list: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
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
    // La búsqueda cachea su último éxito a nivel módulo: se limpia para que
    // cada test arranque sin resultados previos.
    resetNearbyWorkersCache();
  });

  const mockStorage = (overrides: Record<string, string | null> = {}) => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(
      (key: string) => overrides[key] ?? null,
    );
  };

  const sessionOnMain = () =>
    mockStorage({
      "@startup_app/onboarding_completed": "true",
      "@startup_app/access_token": "access-token-123",
      "@startup_app/user_id": "user-123",
      "@startup_app/last_role_user-123": "client",
    });

  const savedLocation: SavedLocation = {
    id: "loc-1",
    user_id: "user-123",
    address: "Av. Olascoaga 1700, Mendoza",
    latitude: -34.6037,
    longitude: -58.3816,
    is_primary: true,
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

  it("navigates from Mi Perfil to Mis Ubicaciones and back", async () => {
    (locationService.list as jest.Mock).mockResolvedValue([]);
    sessionOnMain();

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

    fireEvent.press(getByTestId("btn-manage-locations"));

    await waitFor(() => {
      expect(getByTestId("btn-locations-back")).toBeTruthy();
    });

    fireEvent.press(getByTestId("btn-locations-back"));

    await waitFor(() => {
      expect(getByText("Mi Perfil")).toBeTruthy();
    });
  });

  it("asks for a saved location before searching and can cancel", async () => {
    sessionOnMain();
    (locationService.list as jest.Mock).mockResolvedValue([savedLocation]);

    const { getByTestId, getByText, queryByTestId } = render(
      <RoleProvider>
        <AppNavigator />
      </RoleProvider>,
    );

    await waitFor(() => {
      expect(getByText("Pantalla Principal")).toBeTruthy();
    });

    // "Buscar Trabajadores" abre el pop-up de ubicaciones guardadas.
    fireEvent.press(getByTestId("btn-search-workers"));

    await waitFor(() => {
      expect(getByTestId("origin-option-loc-1")).toBeTruthy();
    });

    // Cancelar: se queda en la Principal sin abrir la búsqueda.
    fireEvent.press(getByTestId("btn-search-origin-cancel"));

    await waitFor(() => {
      expect(getByText("Pantalla Principal")).toBeTruthy();
    });
    expect(
      queryByTestId("worker-search-map", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it("offers to add a location when none are saved and returns to the popup", async () => {
    sessionOnMain();
    (locationService.list as jest.Mock).mockResolvedValue([]);

    const { getByTestId, getByText } = render(
      <RoleProvider>
        <AppNavigator />
      </RoleProvider>,
    );

    await waitFor(() => {
      expect(getByText("Pantalla Principal")).toBeTruthy();
    });

    fireEvent.press(getByTestId("btn-search-workers"));

    await waitFor(() => {
      expect(getByTestId("search-origin-empty")).toBeTruthy();
    });

    // "Agregar ubicación" envía directo al formulario de alta de una
    // ubicación (no a la lista).
    fireEvent.press(getByTestId("btn-add-origin"));

    await waitFor(() => {
      expect(getByText("Agregar ubicación")).toBeTruthy();
    });

    // Se cierra el formulario, queda la lista y al volver el pop-up se
    // reabre para que elija (o vea recién guardada) la ubicación y siga
    // con la búsqueda.
    fireEvent.press(getByTestId("btn-location-form-close"));
    fireEvent.press(getByTestId("btn-locations-back"));

    await waitFor(() => {
      expect(getByText("Pantalla Principal")).toBeTruthy();
    });
    await waitFor(() => {
      expect(getByTestId("search-origin-empty")).toBeTruthy();
    });
  });

  it("navigates from Main to worker search, opens a pin and views the profile", async () => {
    sessionOnMain();
    (locationService.list as jest.Mock).mockResolvedValue([savedLocation]);

    const worker: NearbyWorker = {
      worker_id: "worker-1",
      user_id: "user-789",
      full_name: "Ana Pérez",
      avatar_url: null,
      category_id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f003",
      category_name: "Electricidad",
      hourly_rate: 12500,
      availability_status: "AVAILABLE",
      certification_status: "APPROVED",
      average_rating: "4.5",
      distance_km: 1.2,
      coverage_radius_km: 10,
      latitude: -34.61,
      longitude: -58.39,
    };
    (workerSearchService.nearby as jest.Mock).mockResolvedValue({
      workers: [worker],
      count: 1,
      limit: 50,
      offset: 0,
    });
    (userService.getPublicProfile as jest.Mock).mockResolvedValue({
      id: "user-789",
      full_name: "Ana Pérez",
      avatar_url: null,
      bio: "Electricista matriculada con 8 años de experiencia.",
      average_rating: "4.8",
      role: "worker",
    });

    const { getByText, getByTestId } = render(
      <RoleProvider>
        <AppNavigator />
      </RoleProvider>,
    );

    await waitFor(() => {
      expect(getByText("Pantalla Principal")).toBeTruthy();
    });

    fireEvent.press(getByTestId("btn-search-workers"));

    // Elegir la ubicación desde la que buscar.
    await waitFor(() => {
      expect(getByTestId("origin-option-loc-1")).toBeTruthy();
    });
    fireEvent.press(getByTestId("origin-option-loc-1"));

    await waitFor(() => {
      expect(getByTestId("worker-search-map")).toBeTruthy();
    });

    // Se simula el toque sobre el pin del trabajador.
    act(() => {
      getByTestId("worker-search-map").props.onMarkerPress("worker-1");
    });

    await waitFor(() => {
      expect(getByTestId("worker-info-worker-1")).toBeTruthy();
    });

    fireEvent.press(getByTestId("btn-worker-profile-worker-1"));

    await waitFor(() => {
      expect(getByText("Perfil del Trabajador")).toBeTruthy();
    });
    await waitFor(() => {
      expect(getByText(/Electricista matriculada/)).toBeTruthy();
    });

    // Regresión: la pantalla de búsqueda sigue montada (oculta con
    // display: none) detrás del perfil: abrirla no destruye su mapa.
    expect(
      getByTestId("worker-search-map", { includeHiddenElements: true }),
    ).toBeTruthy();

    fireEvent.press(getByTestId("btn-profile-back"));

    await waitFor(() => {
      expect(getByTestId("worker-search-map")).toBeTruthy();
    });

    fireEvent.press(getByTestId("btn-workers-back"));

    await waitFor(() => {
      expect(getByText("Pantalla Principal")).toBeTruthy();
    });
  });
});
