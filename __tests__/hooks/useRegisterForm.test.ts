import { renderHook, act } from "@testing-library/react-native";
import { useRegisterForm } from "../../src/hooks/useRegisterForm";
import { authService } from "../../src/services/authService";
import { ApiError } from "../../src/services/api";

jest.mock("../../src/services/authService", () => ({
  authService: {
    register: jest.fn(),
  },
}));

describe("useRegisterForm Hook", () => {
  const mockNavigateToOtp = jest.fn();
  const mockNavigateToLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes with empty form data and invalid state", () => {
    const { result } = renderHook(() =>
      useRegisterForm(mockNavigateToOtp, mockNavigateToLogin),
    );

    expect(result.current.formData.firstName).toBe("");
    expect(result.current.formData.email).toBe("");
    expect(result.current.isFormValid).toBe(false);
    expect(result.current.showPassword).toBe(false);
    expect(result.current.showConfirmPassword).toBe(false);
    expect(result.current.isTermsModalOpen).toBe(false);
  });

  it("validates email format correctly", () => {
    const { result } = renderHook(() =>
      useRegisterForm(mockNavigateToOtp, mockNavigateToLogin),
    );

    act(() => {
      result.current.handleChange("email", "invalid-email");
    });

    expect(result.current.errors.email).toBe(
      "Formato de correo electrónico inválido",
    );

    act(() => {
      result.current.handleChange("email", "test@example.com");
    });

    expect(result.current.errors.email).toBeUndefined();
  });

  it("evaluates password complexity criteria accurately", () => {
    const { result } = renderHook(() =>
      useRegisterForm(mockNavigateToOtp, mockNavigateToLogin),
    );

    act(() => {
      result.current.handleChange("password", "pass");
    });

    expect(result.current.passwordCriteria.minLength).toBe(false);
    expect(result.current.passwordCriteria.hasUppercase).toBe(false);

    act(() => {
      result.current.handleChange("password", "Pass123!");
    });

    expect(result.current.passwordCriteria.minLength).toBe(true);
    expect(result.current.passwordCriteria.hasUppercase).toBe(true);
    expect(result.current.passwordCriteria.hasLowercase).toBe(true);
    expect(result.current.passwordCriteria.hasNumber).toBe(true);
    expect(result.current.passwordCriteria.hasSymbol).toBe(true);
    expect(result.current.errors.password).toBeUndefined();
  });

  it("validates password and confirmPassword matching", () => {
    const { result } = renderHook(() =>
      useRegisterForm(mockNavigateToOtp, mockNavigateToLogin),
    );

    act(() => {
      result.current.handleChange("password", "Password123!");
      result.current.handleChange("confirmPassword", "Different123!");
    });

    expect(result.current.errors.confirmPassword).toBe(
      "Las contraseñas no coinciden",
    );

    act(() => {
      result.current.handleChange("confirmPassword", "Password123!");
    });

    expect(result.current.errors.confirmPassword).toBeUndefined();
  });

  it("toggles password visibility states", () => {
    const { result } = renderHook(() =>
      useRegisterForm(mockNavigateToOtp, mockNavigateToLogin),
    );

    act(() => {
      result.current.toggleShowPassword();
      result.current.toggleShowConfirmPassword();
    });

    expect(result.current.showPassword).toBe(true);
    expect(result.current.showConfirmPassword).toBe(true);
  });

  it("handles terms modal open and acceptance", () => {
    const { result } = renderHook(() =>
      useRegisterForm(mockNavigateToOtp, mockNavigateToLogin),
    );

    act(() => {
      result.current.setIsTermsModalOpen(true);
    });

    expect(result.current.isTermsModalOpen).toBe(true);

    act(() => {
      result.current.handleAcceptTerms();
    });

    expect(result.current.formData.acceptedTerms).toBe(true);
  });

  it("submits form successfully and calls onNavigateToOtp", async () => {
    (authService.register as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: "Registration successful",
      userId: "123",
    });

    const { result } = renderHook(() =>
      useRegisterForm(mockNavigateToOtp, mockNavigateToLogin),
    );

    act(() => {
      result.current.handleChange("firstName", "Juan");
      result.current.handleChange("lastName", "Pérez");
      result.current.handleChange("email", "juan@example.com");
      result.current.handleChange("phone", "+5491122334455");
      result.current.handleChange("password", "Segura123!");
      result.current.handleChange("confirmPassword", "Segura123!");
      result.current.handleChange("acceptedTerms", true);
    });

    expect(result.current.isFormValid).toBe(true);

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(authService.register).toHaveBeenCalledWith({
      email: "juan@example.com",
      phone: "+5491122334455",
      password: "Segura123!",
    });
    expect(mockNavigateToOtp).toHaveBeenCalled();
  });

  it("handles 409 duplicate email error gracefully", async () => {
    (authService.register as jest.Mock).mockRejectedValueOnce(
      new ApiError("Email exists", 409, "CONFLICT"),
    );

    const { result } = renderHook(() =>
      useRegisterForm(mockNavigateToOtp, mockNavigateToLogin),
    );

    act(() => {
      result.current.handleChange("firstName", "Juan");
      result.current.handleChange("lastName", "Pérez");
      result.current.handleChange("email", "duplicate@example.com");
      result.current.handleChange("phone", "+5491122334455");
      result.current.handleChange("password", "Segura123!");
      result.current.handleChange("confirmPassword", "Segura123!");
      result.current.handleChange("acceptedTerms", true);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.serverError).toBe(
      "El correo electrónico o número de teléfono ya se encuentra registrado.",
    );
  });
});
