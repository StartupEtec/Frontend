import { renderHook, act } from "@testing-library/react-native";
import { useRoleSelection } from "../../src/hooks/useRoleSelection";
import { useRoleContext } from "../../src/context/RoleContext";

jest.mock("../../src/context/RoleContext", () => ({
  useRoleContext: jest.fn(),
}));

describe("useRoleSelection Hook", () => {
  const mockSetRole = jest.fn().mockResolvedValue(undefined);
  const mockOnRoleSelected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRoleContext as jest.Mock).mockReturnValue({
      setRole: mockSetRole,
    });
  });

  it("initializes with no selected role and no error", () => {
    const { result } = renderHook(() => useRoleSelection(mockOnRoleSelected));

    expect(result.current.selectedRole).toBeNull();
    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets the selected role without saving yet", () => {
    const { result } = renderHook(() => useRoleSelection(mockOnRoleSelected));

    act(() => {
      result.current.handleSelectRole("client");
    });

    expect(result.current.selectedRole).toBe("client");
    expect(mockSetRole).not.toHaveBeenCalled();
  });

  it("persists role and calls onRoleSelected on confirm", async () => {
    const { result } = renderHook(() => useRoleSelection(mockOnRoleSelected));

    act(() => {
      result.current.handleSelectRole("worker");
    });

    await act(async () => {
      await result.current.confirmSelection();
    });

    expect(mockSetRole).toHaveBeenCalledWith("worker");
    expect(mockOnRoleSelected).toHaveBeenCalledWith("worker");
  });

  it("shows error message when setRole fails", async () => {
    mockSetRole.mockRejectedValueOnce(new Error("disk full"));
    const { result } = renderHook(() => useRoleSelection(mockOnRoleSelected));

    act(() => {
      result.current.handleSelectRole("client");
    });

    await act(async () => {
      await result.current.confirmSelection();
    });

    expect(result.current.error).toBe(
      "No se pudo guardar tu selección. Intentá de nuevo.",
    );
    expect(mockOnRoleSelected).not.toHaveBeenCalled();
  });

  it("does nothing on confirm if no role is selected", async () => {
    const { result } = renderHook(() => useRoleSelection(mockOnRoleSelected));

    await act(async () => {
      await result.current.confirmSelection();
    });

    expect(mockSetRole).not.toHaveBeenCalled();
    expect(mockOnRoleSelected).not.toHaveBeenCalled();
  });

  it("clears error when a new role is selected", async () => {
    mockSetRole.mockRejectedValueOnce(new Error("fail"));
    const { result } = renderHook(() => useRoleSelection(mockOnRoleSelected));

    act(() => {
      result.current.handleSelectRole("client");
    });
    await act(async () => {
      await result.current.confirmSelection();
    });

    expect(result.current.error).toBeTruthy();

    act(() => {
      result.current.handleSelectRole("worker");
    });

    expect(result.current.error).toBeNull();
  });
});
