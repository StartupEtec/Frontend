import React from "react";
import { Alert } from "react-native";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { WorkerProfileScreen } from "../../src/screens/WorkerProfileScreen";
import { userService } from "../../src/services/userService";
import { ApiError } from "../../src/services/api";
import { NearbyWorker } from "../../src/types/worker";

jest.mock("../../src/services/userService", () => ({
  userService: { getPublicProfile: jest.fn() },
}));

const mockGetPublicProfile = userService.getPublicProfile as jest.Mock;

const makeWorker = (overrides: Partial<NearbyWorker> = {}): NearbyWorker => ({
  worker_id: "worker-1",
  user_id: "user-456",
  full_name: "Ana Pérez",
  avatar_url: null,
  category_id: "d9b936d5-a3d5-45d6-b4d6-a4c3f5d6f003",
  category_name: "Electricidad",
  hourly_rate: 12500,
  availability_status: "AVAILABLE",
  certification_status: "APPROVED",
  average_rating: "4.5",
  distance_km: 1.2,
  latitude: -34.61,
  longitude: -58.39,
  ...overrides,
});

const publicProfile = {
  id: "user-456",
  full_name: "Ana Pérez",
  avatar_url: null,
  bio: "Electricista matriculada con 8 años de experiencia.",
  average_rating: "4.8",
  role: "worker" as const,
};

const renderScreen = (worker: NearbyWorker = makeWorker()) => {
  const props = {
    worker,
    role: "client" as const,
    onGoBack: jest.fn(),
  };
  return { ...render(<WorkerProfileScreen {...props} />), props };
};

describe("WorkerProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows a loading state while the public profile loads", () => {
    mockGetPublicProfile.mockReturnValue(new Promise(() => undefined));

    const { getByText } = renderScreen();

    expect(getByText("Cargando perfil...")).toBeTruthy();
    expect(mockGetPublicProfile).toHaveBeenCalledWith("user-456");
  });

  it("shows the search data and the public bio once loaded", async () => {
    mockGetPublicProfile.mockResolvedValue(publicProfile);

    const { getByText, getByTestId } = renderScreen();

    await waitFor(() =>
      expect(getByText(/Electricista matriculada/)).toBeTruthy(),
    );

    expect(getByText("Ana Pérez")).toBeTruthy();
    expect(getByText("Electricidad")).toBeTruthy();
    expect(getByText("★ 4,8")).toBeTruthy();
    expect(getByText(/1,2 km/)).toBeTruthy();
    expect(getByText("$ 12.500")).toBeTruthy();
    expect(getByText("Disponible")).toBeTruthy();
    expect(getByText("Certificado")).toBeTruthy();
    expect(getByTestId("profile-bio")).toBeTruthy();
  });

  it("shows a placeholder when the worker has no bio", async () => {
    mockGetPublicProfile.mockResolvedValue({ ...publicProfile, bio: null });

    const { getByText } = renderScreen();

    await waitFor(() =>
      expect(
        getByText("Este trabajador aún no agregó una biografía."),
      ).toBeTruthy(),
    );
  });

  it("falls back to the search rating while the profile loads", () => {
    mockGetPublicProfile.mockReturnValue(new Promise(() => undefined));

    const { getByText } = renderScreen();

    expect(getByText("★ 4,5")).toBeTruthy();
  });

  it("shows an error state and retries the public profile request", async () => {
    mockGetPublicProfile
      .mockRejectedValueOnce(new ApiError("Usuario no encontrado", 404))
      .mockResolvedValueOnce(publicProfile);

    const { getByTestId, getByText } = renderScreen();

    await waitFor(() => expect(getByTestId("profile-error")).toBeTruthy());
    expect(getByText("Usuario no encontrado")).toBeTruthy();

    fireEvent.press(getByTestId("btn-profile-retry"));

    await waitFor(() =>
      expect(getByText(/Electricista matriculada/)).toBeTruthy(),
    );
    expect(mockGetPublicProfile).toHaveBeenCalledTimes(2);
  });

  it("falls back to a generic message for unknown errors", async () => {
    mockGetPublicProfile.mockRejectedValueOnce(new Error(""));

    const { getByTestId } = renderScreen();

    await waitFor(() => expect(getByTestId("profile-error")).toBeTruthy());
    expect(getByTestId("profile-error").props.children).toBe(
      "No pudimos cargar el perfil. Reintentá.",
    );
  });

  it("shows 'Próximamente' when requesting the service", async () => {
    mockGetPublicProfile.mockResolvedValue(publicProfile);

    const { getByTestId, getByText } = renderScreen();
    await waitFor(() =>
      expect(getByText(/Electricista matriculada/)).toBeTruthy(),
    );

    fireEvent.press(getByTestId("btn-profile-request"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Próximamente",
      expect.stringContaining("cotización"),
    );
  });

  it("navigates back", () => {
    // El botón de volver no depende de que el perfil público termine de cargar.
    mockGetPublicProfile.mockReturnValue(new Promise(() => undefined));

    const { getByTestId, props } = renderScreen();

    fireEvent.press(getByTestId("btn-profile-back"));

    expect(props.onGoBack).toHaveBeenCalled();
  });
});
