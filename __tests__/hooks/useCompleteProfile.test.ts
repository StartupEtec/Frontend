import { renderHook, act } from "@testing-library/react-native";
import { useCompleteProfile } from "../../src/hooks/useCompleteProfile";
import { profileService } from "../../src/services/profileService";
import { tokenStorage } from "../../src/services/tokenStorage";

jest.mock("../../src/services/profileService", () => ({
  profileService: {
    createClientProfile: jest.fn(),
    createWorkerProfile: jest.fn(),
  },
}));

jest.mock("../../src/services/tokenStorage", () => ({
  tokenStorage: {
    getUserId: jest.fn(),
  },
}));

describe("useCompleteProfile Hook", () => {
  const mockOnCompleted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (tokenStorage.getUserId as jest.Mock).mockResolvedValue("user-123");
    (profileService.createClientProfile as jest.Mock).mockResolvedValue({
      message: "OK",
    });
    (profileService.createWorkerProfile as jest.Mock).mockResolvedValue({
      message: "OK",
    });
  });

  it("initializes with empty form and idle status", () => {
    const { result } = renderHook(() =>
      useCompleteProfile({ role: "client", onCompleted: mockOnCompleted }),
    );

    expect(result.current.formData.selfieUri).toBeNull();
    expect(result.current.formData.dniFrontUri).toBeNull();
    expect(result.current.formData.dniBackUri).toBeNull();
    expect(result.current.formData.dateOfBirth).toBe("");
    expect(result.current.formData.dateOfBirthDate).toBeNull();
    expect(result.current.status).toBe("idle");
  });

  it("updates fields and clears related errors", () => {
    const { result } = renderHook(() =>
      useCompleteProfile({ role: "client", onCompleted: mockOnCompleted }),
    );

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

  it("calls createClientProfile on valid submission", async () => {
    const { result } = renderHook(() =>
      useCompleteProfile({ role: "client", onCompleted: mockOnCompleted }),
    );

    act(() => {
      result.current.updateField("selfieUri", "file:///selfie.jpg");
      result.current.updateField("dniFrontUri", "file:///dni-front.jpg");
      result.current.updateField("dniBackUri", "file:///dni-back.jpg");
      result.current.updateField("dateOfBirth", "15/03/1990");
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(profileService.createClientProfile).toHaveBeenCalledWith(
      "user-123",
      {
        full_name: "Usuario",
        avatar_url: "file:///selfie.jpg",
      },
    );
    expect(result.current.status).toBe("success");
  });

  it("shows error when userId is missing", async () => {
    (tokenStorage.getUserId as jest.Mock).mockResolvedValueOnce(null);
    const { result } = renderHook(() =>
      useCompleteProfile({ role: "client", onCompleted: mockOnCompleted }),
    );

    act(() => {
      result.current.updateField("selfieUri", "file:///selfie.jpg");
      result.current.updateField("dniFrontUri", "file:///dni-front.jpg");
      result.current.updateField("dniBackUri", "file:///dni-back.jpg");
      result.current.updateField("dateOfBirth", "15/03/1990");
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.errors.general).toBe(
      "Sesión expirada. Volvé a iniciar sesión.",
    );
  });

  it("sets success even when API fails (backend not persisting yet)", async () => {
    (profileService.createClientProfile as jest.Mock).mockRejectedValueOnce(
      new Error("fail"),
    );
    const { result } = renderHook(() =>
      useCompleteProfile({ role: "client", onCompleted: mockOnCompleted }),
    );

    act(() => {
      result.current.updateField("selfieUri", "file:///selfie.jpg");
      result.current.updateField("dniFrontUri", "file:///dni-front.jpg");
      result.current.updateField("dniBackUri", "file:///dni-back.jpg");
      result.current.updateField("dateOfBirth", "15/03/1990");
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.status).toBe("success");
  });
});
