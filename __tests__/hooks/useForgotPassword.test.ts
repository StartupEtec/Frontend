import { renderHook, act } from "@testing-library/react-native";
import { useForgotPassword } from "../../src/hooks/useForgotPassword";
import { authService } from "../../src/services/authService";

jest.mock("../../src/services/authService", () => ({
  authService: {
    forgotPassword: jest.fn(),
    verifyResetCode: jest.fn(),
    resetPassword: jest.fn(),
  },
}));

describe("useForgotPassword", () => {
  const mockNavigateToLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes at step 1 with empty state", () => {
    const { result } = renderHook(() => useForgotPassword(mockNavigateToLogin));

    expect(result.current.step).toBe(1);
    expect(result.current.contact).toBe("");
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.canSubmitStep1).toBe(false);
  });

  it("enables step 1 when a valid email is entered", async () => {
    const { result } = renderHook(() => useForgotPassword(mockNavigateToLogin));

    await act(async () => {
      result.current.handleContactChange("user@test.com");
    });

    expect(result.current.canSubmitStep1).toBe(true);
  });

  it("enables step 1 when a valid phone is entered", async () => {
    const { result } = renderHook(() => useForgotPassword(mockNavigateToLogin));

    await act(async () => {
      result.current.handleContactChange("+5491122334455");
    });

    expect(result.current.canSubmitStep1).toBe(true);
  });

  it("disabled step 1 with invalid contact", async () => {
    const { result } = renderHook(() => useForgotPassword(mockNavigateToLogin));

    await act(async () => {
      result.current.handleContactChange("invalid");
    });
    await act(async () => {
      result.current.handleContactBlur();
    });

    expect(result.current.canSubmitStep1).toBe(false);
    expect(result.current.contactError).toBeTruthy();
  });

  it("moves to step 2 after forgotPassword succeeds", async () => {
    (authService.forgotPassword as jest.Mock).mockResolvedValueOnce({
      message: "Código de recuperación enviado correctamente.",
    });

    const { result } = renderHook(() => useForgotPassword(mockNavigateToLogin));

    await act(async () => {
      result.current.handleContactChange("user@test.com");
    });
    await act(async () => {
      await result.current.handleNextStep();
    });

    expect(authService.forgotPassword).toHaveBeenCalledWith({
      email: "user@test.com",
    });
    expect(result.current.step).toBe(2);
  });

  it("sends phone instead of email in forgotPassword", async () => {
    (authService.forgotPassword as jest.Mock).mockResolvedValueOnce({
      message: "OK",
    });

    const { result } = renderHook(() => useForgotPassword(mockNavigateToLogin));

    await act(async () => {
      result.current.handleContactChange("+5491122334455");
    });
    await act(async () => {
      await result.current.handleNextStep();
    });

    expect(authService.forgotPassword).toHaveBeenCalledWith({
      phone: "+5491122334455",
    });
  });

  it("shows server error when user not found", async () => {
    const { ApiError } = jest.requireActual("../../src/services/api");
    (authService.forgotPassword as jest.Mock).mockRejectedValueOnce(
      new ApiError("El correo electrónico o teléfono no está registrado", 404, "USER_NOT_FOUND"),
    );

    const { result } = renderHook(() => useForgotPassword(mockNavigateToLogin));

    await act(async () => {
      result.current.handleContactChange("user@test.com");
    });
    await act(async () => {
      await result.current.handleNextStep();
    });

    expect(result.current.serverError).toBe(
      "El correo electrónico o teléfono no está registrado",
    );
    expect(result.current.step).toBe(1);
  });

  it("verifies code and moves to step 3 storing the token", async () => {
    (authService.verifyResetCode as jest.Mock).mockResolvedValueOnce({
      message: "Código verificado correctamente.",
      token: "temp-token-123",
    });

    const { result } = renderHook(() => useForgotPassword(mockNavigateToLogin));

    // Set up at step 2
    await act(async () => {
      result.current.handleContactChange("user@test.com");
    });
    await act(async () => {
      await result.current.handleNextStep();
    });

    // Enter all 6 digits
    for (let i = 0; i < 6; i++) {
      await act(async () => {
        result.current.handleDigitChange(i, String(i + 1));
      });
    }

    expect(result.current.canSubmitStep2).toBe(true);

    await act(async () => {
      await result.current.handleVerifyCode();
    });

    expect(authService.verifyResetCode).toHaveBeenCalledWith({
      email: "user@test.com",
      reset_code: "123456",
    });
    expect(result.current.step).toBe(3);
  });

  it("shows error on invalid reset code", async () => {
    const { ApiError } = jest.requireActual("../../src/services/api");
    (authService.verifyResetCode as jest.Mock).mockRejectedValueOnce(
      new ApiError("Código de recuperación inválido o expirado", 400, "INVALID_RESET_CODE"),
    );

    const { result } = renderHook(() => useForgotPassword(mockNavigateToLogin));

    await act(async () => {
      result.current.handleContactChange("user@test.com");
    });
    await act(async () => {
      await result.current.handleNextStep();
    });
    for (let i = 0; i < 6; i++) {
      await act(async () => {
        result.current.handleDigitChange(i, "9");
      });
    }
    await act(async () => {
      await result.current.handleVerifyCode();
    });

    expect(result.current.serverError).toBe(
      "Código de recuperación inválido o expirado",
    );
    expect(result.current.step).toBe(2);
  });

  it("resets the password and navigates to login", async () => {
    (authService.resetPassword as jest.Mock).mockResolvedValueOnce({
      message: "Contraseña restablecida correctamente.",
    });

    const { result } = renderHook(() => useForgotPassword(mockNavigateToLogin));

    // Set up at step 2 first
    (authService.forgotPassword as jest.Mock).mockResolvedValueOnce({ message: "OK" });
    (authService.verifyResetCode as jest.Mock).mockResolvedValueOnce({
      message: "OK",
      token: "temp-token-123",
    });

    await act(async () => {
      result.current.handleContactChange("user@test.com");
    });
    await act(async () => {
      await result.current.handleNextStep();
    });
    for (let i = 0; i < 6; i++) {
      await act(async () => {
        result.current.handleDigitChange(i, "1");
      });
    }
    await act(async () => {
      await result.current.handleVerifyCode();
    });

    // Step 3 - enter valid passwords
    await act(async () => {
      result.current.handleNewPasswordChange("NewPass1!");
    });
    await act(async () => {
      result.current.handleConfirmPasswordChange("NewPass1!");
    });

    expect(result.current.canSubmitStep3).toBe(true);

    await act(async () => {
      await result.current.handleResetPassword();
    });

    expect(authService.resetPassword).toHaveBeenCalledWith({
      token: "temp-token-123",
      password: "NewPass1!",
    });
    expect(mockNavigateToLogin).toHaveBeenCalled();
  });

  it("rejects mismatched confirm password", async () => {
    const { result } = renderHook(() => useForgotPassword(mockNavigateToLogin));

    await act(async () => {
      result.current.handleNewPasswordChange("NewPass1!");
    });
    await act(async () => {
      result.current.handleConfirmPasswordChange("Different1!");
    });

    expect(result.current.confirmPasswordError).toBe("Las contraseñas no coinciden");
    expect(result.current.canSubmitStep3).toBe(false);
  });
});
