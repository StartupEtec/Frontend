import { renderHook, act } from "@testing-library/react-native";
import { useLoginForm } from "../../src/hooks/useLoginForm";
import { authService } from "../../src/services/authService";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("../../src/services/authService", () => ({
  authService: {
    login: jest.fn(),
  },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe("useLoginForm", () => {
  const mockNavigateToOtp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it("initializes with empty form and invalid state", () => {
    const { result } = renderHook(() => useLoginForm(mockNavigateToOtp));

    expect(result.current.formData.emailOrPhone).toBe("");
    expect(result.current.formData.password).toBe("");
    expect(result.current.isFormValid).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.serverError).toBeNull();
  });

  it("validates required email/phone", async () => {
    const { result } = renderHook(() => useLoginForm(mockNavigateToOtp));

    await act(async () => {
      result.current.handleChange("emailOrPhone", "test@example.com");
      result.current.handleChange("password", "Password123!");
    });

    expect(result.current.isFormValid).toBe(true);
  });

  it("validates phone number format", async () => {
    const { result } = renderHook(() => useLoginForm(mockNavigateToOtp));

    await act(async () => {
      result.current.handleChange("emailOrPhone", "+5491122334455");
      result.current.handleChange("password", "Password123!");
    });

    expect(result.current.isFormValid).toBe(true);
  });

  it("rejects invalid email/phone format", async () => {
    const { result } = renderHook(() => useLoginForm(mockNavigateToOtp));

    await act(async () => {
      result.current.handleChange("emailOrPhone", "not-valid");
      result.current.handleChange("password", "Password123!");
    });

    expect(result.current.isFormValid).toBe(false);
  });

  it("rejects password shorter than 6 characters", async () => {
    const { result } = renderHook(() => useLoginForm(mockNavigateToOtp));

    await act(async () => {
      result.current.handleChange("emailOrPhone", "test@example.com");
      result.current.handleChange("password", "abc");
    });

    expect(result.current.isFormValid).toBe(false);
  });

  it("calls authService.login and navigates to OTP on success", async () => {
    (authService.login as jest.Mock).mockResolvedValueOnce({
      status: "PENDING_VERIFICATION",
      message: "OTP sent",
      user: { id: "1", email: "test@example.com" },
    });

    const { result } = renderHook(() => useLoginForm(mockNavigateToOtp));

    await act(async () => {
      result.current.handleChange("emailOrPhone", "test@example.com");
      result.current.handleChange("password", "Password123!");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(authService.login).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "Password123!",
    });
    expect(mockNavigateToOtp).toHaveBeenCalledWith("test@example.com");
  });

  it("sends phone instead of email when phone is entered", async () => {
    (authService.login as jest.Mock).mockResolvedValueOnce({
      status: "PENDING_VERIFICATION",
      message: "OTP sent",
      user: { id: "1", email: "user@test.com" },
    });

    const { result } = renderHook(() => useLoginForm(mockNavigateToOtp));

    await act(async () => {
      result.current.handleChange("emailOrPhone", "+5491122334455");
      result.current.handleChange("password", "Password123!");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(authService.login).toHaveBeenCalledWith({
      phone: "+5491122334455",
      password: "Password123!",
    });
    expect(mockNavigateToOtp).toHaveBeenCalledWith("+5491122334455");
  });

  it("sets server error on login failure", async () => {
    const { ApiError } = jest.requireActual("../../src/services/api");
    (authService.login as jest.Mock).mockRejectedValueOnce(
      new ApiError("Credenciales incorrectas", 401, "AUTH_FAILED"),
    );

    const { result } = renderHook(() => useLoginForm(mockNavigateToOtp));

    await act(async () => {
      result.current.handleChange("emailOrPhone", "test@example.com");
      result.current.handleChange("password", "WrongPass1!");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.serverError).toBe(
      "Credenciales incorrectas. Verificá tu email/teléfono y contraseña.",
    );
    expect(mockNavigateToOtp).not.toHaveBeenCalled();
  });

  it("saves remembered contact to AsyncStorage", async () => {
    (authService.login as jest.Mock).mockResolvedValueOnce({
      status: "PENDING_VERIFICATION",
      message: "OTP sent",
      user: { id: "1", email: "test@example.com" },
    });

    const { result } = renderHook(() => useLoginForm(mockNavigateToOtp));

    await act(async () => {
      result.current.handleChange("emailOrPhone", "test@example.com");
      result.current.handleChange("password", "Password123!");
      result.current.toggleRememberMe();
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@startup_app/remembered_contact",
      "test@example.com",
    );
  });

  it("removes remembered contact when rememberMe is off", async () => {
    (authService.login as jest.Mock).mockResolvedValueOnce({
      status: "PENDING_VERIFICATION",
      message: "OTP sent",
      user: { id: "1", email: "test@example.com" },
    });

    const { result } = renderHook(() => useLoginForm(mockNavigateToOtp));

    await act(async () => {
      result.current.handleChange("emailOrPhone", "test@example.com");
      result.current.handleChange("password", "Password123!");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      "@startup_app/remembered_contact",
    );
  });

  it("toggles password visibility", () => {
    const { result } = renderHook(() => useLoginForm(mockNavigateToOtp));

    expect(result.current.showPassword).toBe(false);

    act(() => {
      result.current.toggleShowPassword();
    });

    expect(result.current.showPassword).toBe(true);
  });
});
