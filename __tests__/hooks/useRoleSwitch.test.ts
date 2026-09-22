import { renderHook, act } from "@testing-library/react-native";
import { useRoleSwitch } from "../../src/hooks/useRoleSwitch";
import { userService } from "../../src/services/userService";
import { tokenStorage } from "../../src/services/tokenStorage";

jest.mock("../../src/services/userService", () => ({
  userService: { switchRole: jest.fn() },
}));

jest.mock("../../src/services/tokenStorage", () => ({
  tokenStorage: {
    getUserId: jest.fn(),
    setAccessToken: jest.fn(),
  },
}));

describe("useRoleSwitch", () => {
  const mockOnRoleChanged = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (tokenStorage.getUserId as jest.Mock).mockResolvedValue("user-123");
  });

  it("initializes with no error and not submitting", () => {
    const { result } = renderHook(() =>
      useRoleSwitch("client", mockOnRoleChanged),
    );

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("switches role successfully and calls onRoleChanged", async () => {
    (userService.switchRole as jest.Mock).mockResolvedValueOnce({
      new_role: "worker",
      previous_role: "client",
      accessToken: "new-jwt-token",
      timestamp: "2026-01-01T00:00:00Z",
    });

    const { result } = renderHook(() =>
      useRoleSwitch("client", mockOnRoleChanged),
    );

    await act(async () => {
      await result.current.handleSwitchRole("worker");
    });

    expect(userService.switchRole).toHaveBeenCalledWith("user-123", {
      role: "worker",
    });
    expect(mockOnRoleChanged).toHaveBeenCalledWith("worker", "new-jwt-token");
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("does not call API if switching to the same role", async () => {
    const { result } = renderHook(() =>
      useRoleSwitch("client", mockOnRoleChanged),
    );

    await act(async () => {
      await result.current.handleSwitchRole("client");
    });

    expect(userService.switchRole).not.toHaveBeenCalled();
    expect(mockOnRoleChanged).not.toHaveBeenCalled();
  });

  it("shows error when user not found in storage", async () => {
    (tokenStorage.getUserId as jest.Mock).mockResolvedValueOnce(null);

    const { result } = renderHook(() =>
      useRoleSwitch("client", mockOnRoleChanged),
    );

    await act(async () => {
      await result.current.handleSwitchRole("worker");
    });

    expect(result.current.error).toBe(
      "No se encontró el usuario. Iniciá sesión de nuevo.",
    );
  });

  it("shows MISSING_CLIENT_PROFILE error message", async () => {
    const { ApiError } = jest.requireActual("../../src/services/api");
    (userService.switchRole as jest.Mock).mockRejectedValueOnce(
      new ApiError(
        "Debes tener un perfil de cliente para cambiar de rol",
        409,
        "MISSING_CLIENT_PROFILE",
      ),
    );

    const { result } = renderHook(() =>
      useRoleSwitch("worker", mockOnRoleChanged),
    );

    await act(async () => {
      await result.current.handleSwitchRole("client");
    });

    expect(result.current.error).toBe(
      "Necesitás tener un perfil de cliente completado para cambiar de rol.",
    );
  });

  it("shows WORKER_NOT_CERTIFIED error message", async () => {
    const { ApiError } = jest.requireActual("../../src/services/api");
    (userService.switchRole as jest.Mock).mockRejectedValueOnce(
      new ApiError(
        "Tu perfil de trabajador debe tener certificación aprobada",
        403,
        "WORKER_NOT_CERTIFIED",
      ),
    );

    const { result } = renderHook(() =>
      useRoleSwitch("client", mockOnRoleChanged),
    );

    await act(async () => {
      await result.current.handleSwitchRole("worker");
    });

    expect(result.current.error).toBe(
      "Tu perfil de trabajador debe estar aprobado para activar el modo Trabajador.",
    );
  });

  it("shows generic connection error for non-ApiError", async () => {
    (userService.switchRole as jest.Mock).mockRejectedValueOnce(
      new Error("Network error"),
    );

    const { result } = renderHook(() =>
      useRoleSwitch("client", mockOnRoleChanged),
    );

    await act(async () => {
      await result.current.handleSwitchRole("worker");
    });

    expect(result.current.error).toBe(
      "Error de conexión. Verificá tu internet e intentá de nuevo.",
    );
  });

  it("clearError clears the error state", async () => {
    (userService.switchRole as jest.Mock).mockRejectedValueOnce(
      new Error("fail"),
    );

    const { result } = renderHook(() =>
      useRoleSwitch("client", mockOnRoleChanged),
    );

    await act(async () => {
      await result.current.handleSwitchRole("worker");
    });

    expect(result.current.error).toBeTruthy();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
