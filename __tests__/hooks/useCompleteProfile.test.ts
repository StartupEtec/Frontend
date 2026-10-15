import { renderHook, act } from "@testing-library/react-native";
import { useCompleteProfile } from "../../src/hooks/useCompleteProfile";
import { profileService } from "../../src/services/profileService";
import { tokenStorage } from "../../src/services/tokenStorage";
import { ApiError } from "../../src/services/api";

jest.mock("../../src/services/profileService", () => ({
  profileService: {
    getIdentity: jest.fn(),
    upsertIdentity: jest.fn(),
    createClientProfile: jest.fn(),
    createWorkerProfile: jest.fn(),
    updateClientProfile: jest.fn(),
    updateWorkerProfile: jest.fn(),
    uploadProfileImage: jest.fn(),
    getClientProfile: jest.fn(),
    getWorkerProfile: jest.fn(),
  },
  toDisplayUri: jest.requireActual("../../src/services/profileService")
    .toDisplayUri,
  toStoredUrl: jest.requireActual("../../src/services/profileService")
    .toStoredUrl,
  isLocalUri: jest.requireActual("../../src/services/profileService")
    .isLocalUri,
}));

jest.mock("../../src/services/tokenStorage", () => ({
  tokenStorage: {
    getUserId: jest.fn(),
  },
}));

const flush = () => act(async () => {});

describe("useCompleteProfile Hook", () => {
  const mockOnCompleted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (tokenStorage.getUserId as jest.Mock).mockResolvedValue("user-123");
    (profileService.getIdentity as jest.Mock).mockResolvedValue(null);
    (profileService.uploadProfileImage as jest.Mock)
      .mockResolvedValueOnce("/uploads/profiles/selfie.jpg")
      .mockResolvedValueOnce("/uploads/profiles/dni-front.jpg")
      .mockResolvedValueOnce("/uploads/profiles/dni-back.jpg");
    (profileService.upsertIdentity as jest.Mock).mockResolvedValue({
      message: "OK",
    });
  });

  it("initializes loading then empty form in create mode (404)", async () => {
    const { result } = renderHook(() =>
      useCompleteProfile({ role: "client", onCompleted: mockOnCompleted }),
    );
    await flush();

    expect(result.current.loading).toBe(false);
    expect(result.current.formData.selfieUri).toBeNull();
    expect(result.current.status).toBe("idle");
  });

  it("prefills form when identity already exists (single flow)", async () => {
    (profileService.getIdentity as jest.Mock).mockResolvedValueOnce({
      full_name: "Juan",
      date_of_birth: "1990-03-15",
      avatar_url: "/uploads/profiles/selfie.jpg",
      dni_front_url: "/uploads/profiles/dni-front.jpg",
      dni_back_url: "/uploads/profiles/dni-back.jpg",
      is_complete: true,
    });
    const { result } = renderHook(() =>
      useCompleteProfile({ role: "worker", onCompleted: mockOnCompleted }),
    );
    await flush();

    expect(result.current.loading).toBe(false);
    expect(result.current.formData.dateOfBirth).toBe("15/03/1990");
    expect(result.current.formData.selfieUri).toContain(
      "/uploads/profiles/selfie.jpg",
    );
  });

  it("does not refetch per role: same identity for client and worker", async () => {
    (profileService.getIdentity as jest.Mock).mockResolvedValueOnce({
      full_name: "Ana",
      is_complete: true,
      date_of_birth: "1992-06-01",
      avatar_url: "/uploads/profiles/selfie.jpg",
      dni_front_url: "/uploads/profiles/dni-front.jpg",
      dni_back_url: "/uploads/profiles/dni-back.jpg",
    });
    const { result } = renderHook(() =>
      useCompleteProfile({ role: "client", onCompleted: mockOnCompleted }),
    );
    await flush();

    expect(profileService.getIdentity).toHaveBeenCalledWith("user-123");
  });

  it("prefills partial identity (backfill) and still requires missing fields", async () => {
    (profileService.getIdentity as jest.Mock).mockResolvedValueOnce({
      full_name: "Pedro",
      date_of_birth: null,
      avatar_url: "/uploads/profiles/selfie.jpg",
      dni_front_url: null,
      dni_back_url: null,
      is_complete: false,
    });
    const { result } = renderHook(() =>
      useCompleteProfile({ role: "client", onCompleted: mockOnCompleted }),
    );
    await flush();

    expect(result.current.formData.selfieUri).toContain(
      "/uploads/profiles/selfie.jpg",
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.errors.dniFrontUri).toBe(
      "La foto del frente del documento es obligatoria.",
    );
    expect(profileService.upsertIdentity).not.toHaveBeenCalled();
  });

  it("updates fields and clears related errors", async () => {
    const { result } = renderHook(() =>
      useCompleteProfile({ role: "client", onCompleted: mockOnCompleted }),
    );
    await flush();

    const date = new Date(1990, 2, 15);
    act(() => {
      result.current.updateField("dateOfBirthDate", date);
      result.current.updateField("dateOfBirth", "15/03/1990");
    });

    expect(result.current.formData.dateOfBirth).toBe("15/03/1990");
    expect(result.current.formData.dateOfBirthDate).toBe(date);
    expect(result.current.errors.dateOfBirth).toBeUndefined();
  });

  it("validates all required fields are present", async () => {
    const { result } = renderHook(() =>
      useCompleteProfile({ role: "client", onCompleted: mockOnCompleted }),
    );
    await flush();

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.errors.selfieUri).toBe(
      "La foto de perfil es obligatoria.",
    );
    expect(result.current.errors.dniFrontUri).toBe(
      "La foto del frente del documento es obligatoria.",
    );
    expect(result.current.errors.dniBackUri).toBe(
      "La foto del dorso del documento es obligatoria.",
    );
    expect(result.current.errors.dateOfBirth).toBe(
      "La fecha de nacimiento es obligatoria.",
    );
  });

  it("uploads images and calls upsertIdentity once with public urls + ISO date", async () => {
    const { result } = renderHook(() =>
      useCompleteProfile({ role: "client", onCompleted: mockOnCompleted }),
    );
    await flush();

    act(() => {
      result.current.updateField("selfieUri", "file:///selfie.jpg");
      result.current.updateField("dniFrontUri", "file:///dni-front.jpg");
      result.current.updateField("dniBackUri", "file:///dni-back.jpg");
      result.current.updateField("dateOfBirthDate", new Date(1990, 2, 15));
      result.current.updateField("dateOfBirth", "15/03/1990");
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(profileService.uploadProfileImage).toHaveBeenCalledTimes(3);
    expect(profileService.upsertIdentity).toHaveBeenCalledTimes(1);
    expect(profileService.upsertIdentity).toHaveBeenCalledWith("user-123", {
      date_of_birth: "1990-03-15",
      avatar_url: "/uploads/profiles/selfie.jpg",
      dni_front_url: "/uploads/profiles/dni-front.jpg",
      dni_back_url: "/uploads/profiles/dni-back.jpg",
    });
    expect(profileService.createClientProfile).not.toHaveBeenCalled();
    expect(profileService.createWorkerProfile).not.toHaveBeenCalled();
    expect(result.current.status).toBe("success");
  });

  it("uses PATCH without re-upload when editing unchanged identity", async () => {
    (profileService.getIdentity as jest.Mock).mockResolvedValueOnce({
      full_name: "Juan",
      date_of_birth: "1990-03-15",
      avatar_url: "/uploads/profiles/selfie.jpg",
      dni_front_url: "/uploads/profiles/dni-front.jpg",
      dni_back_url: "/uploads/profiles/dni-back.jpg",
      is_complete: true,
    });
    const { result } = renderHook(() =>
      useCompleteProfile({ role: "client", onCompleted: mockOnCompleted }),
    );
    await flush();

    await act(async () => {
      await result.current.handleSave();
    });

    expect(profileService.uploadProfileImage).not.toHaveBeenCalled();
    expect(profileService.upsertIdentity).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({ date_of_birth: "1990-03-15" }),
    );
    expect(result.current.status).toBe("success");
  });

  it("shows error when userId is missing", async () => {
    (tokenStorage.getUserId as jest.Mock).mockResolvedValue(null);
    const { result } = renderHook(() =>
      useCompleteProfile({ role: "client", onCompleted: mockOnCompleted }),
    );
    await flush();

    act(() => {
      result.current.updateField("selfieUri", "file:///selfie.jpg");
      result.current.updateField("dniFrontUri", "file:///dni-front.jpg");
      result.current.updateField("dniBackUri", "file:///dni-back.jpg");
      result.current.updateField("dateOfBirthDate", new Date(1990, 2, 15));
      result.current.updateField("dateOfBirth", "15/03/1990");
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.errors.general).toBe(
      "Sesión expirada. Volvé a iniciar sesión.",
    );
    expect(result.current.status).toBe("error");
  });

  it("sets error (not success) when API fails", async () => {
    (profileService.upsertIdentity as jest.Mock).mockRejectedValueOnce(
      new ApiError("Error de servidor", 500, "SERVER_ERROR"),
    );
    const { result } = renderHook(() =>
      useCompleteProfile({ role: "client", onCompleted: mockOnCompleted }),
    );
    await flush();

    act(() => {
      result.current.updateField("selfieUri", "file:///selfie.jpg");
      result.current.updateField("dniFrontUri", "file:///dni-front.jpg");
      result.current.updateField("dniBackUri", "file:///dni-back.jpg");
      result.current.updateField("dateOfBirthDate", new Date(1990, 2, 15));
      result.current.updateField("dateOfBirth", "15/03/1990");
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errors.general).toBe("Error de servidor");
  });
});
