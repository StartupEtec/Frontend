import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { LoginScreen } from "../../src/screens/LoginScreen";
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

describe("LoginScreen Component", () => {
  const mockNavigateToOtp = jest.fn();
  const mockNavigateToRegister = jest.fn();
  const mockNavigateBack = jest.fn();
  const mockNavigateToForgotPassword = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it("renders title, inputs, and disabled submit button initially", () => {
    const { getByText, getByTestId, getAllByText } = render(
      <LoginScreen
        onNavigateToOtp={mockNavigateToOtp}
        onNavigateToRegister={mockNavigateToRegister}
        onNavigateBack={mockNavigateBack}
        onNavigateToForgotPassword={mockNavigateToForgotPassword}
      />,
    );

    expect(getAllByText("Iniciar Sesión").length).toBeGreaterThanOrEqual(1);
    expect(getByTestId("btn-login-back")).toBeTruthy();
    expect(getByTestId("input-email-phone")).toBeTruthy();
    expect(getByTestId("input-password")).toBeTruthy();
    expect(getByTestId("btn-remember-me")).toBeTruthy();
    expect(getByTestId("btn-forgot-password")).toBeTruthy();

    const submitBtn = getByTestId("btn-login-submit");
    expect(submitBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it("navigates back when back arrow is pressed", () => {
    const { getByTestId } = render(
      <LoginScreen
        onNavigateToOtp={mockNavigateToOtp}
        onNavigateToRegister={mockNavigateToRegister}
        onNavigateBack={mockNavigateBack}
        onNavigateToForgotPassword={mockNavigateToForgotPassword}
      />,
    );

    fireEvent.press(getByTestId("btn-login-back"));
    expect(mockNavigateBack).toHaveBeenCalled();
  });

  it("enables submit when both fields are valid and submits successfully", async () => {
    (authService.login as jest.Mock).mockResolvedValueOnce({
      status: "PENDING_VERIFICATION",
      message: "Código OTP enviado",
      user: { id: "1", email: "test@example.com" },
    });

    const { getByTestId } = render(
      <LoginScreen
        onNavigateToOtp={mockNavigateToOtp}
        onNavigateToRegister={mockNavigateToRegister}
        onNavigateBack={mockNavigateBack}
        onNavigateToForgotPassword={mockNavigateToForgotPassword}
      />,
    );

    fireEvent.changeText(getByTestId("input-email-phone"), "test@example.com");
    fireEvent.changeText(getByTestId("input-password"), "Password123!");

    const submitBtn = getByTestId("btn-login-submit");
    expect(submitBtn.props.accessibilityState?.disabled).toBe(false);

    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Password123!",
      });
      expect(mockNavigateToOtp).toHaveBeenCalledWith("test@example.com");
    });
  });

  it("submits with phone number", async () => {
    (authService.login as jest.Mock).mockResolvedValueOnce({
      status: "PENDING_VERIFICATION",
      message: "Código OTP enviado",
      user: { id: "1", email: "user@test.com" },
    });

    const { getByTestId } = render(
      <LoginScreen
        onNavigateToOtp={mockNavigateToOtp}
        onNavigateToRegister={mockNavigateToRegister}
        onNavigateBack={mockNavigateBack}
        onNavigateToForgotPassword={mockNavigateToForgotPassword}
      />,
    );

    fireEvent.changeText(getByTestId("input-email-phone"), "+5491122334455");
    fireEvent.changeText(getByTestId("input-password"), "Password123!");

    fireEvent.press(getByTestId("btn-login-submit"));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        phone: "+5491122334455",
        password: "Password123!",
      });
      expect(mockNavigateToOtp).toHaveBeenCalledWith("+5491122334455");
    });
  });

  it("shows server error on 401 credentials error", async () => {
    const { ApiError } = jest.requireActual("../../src/services/api");
    (authService.login as jest.Mock).mockRejectedValueOnce(
      new ApiError("Credenciales incorrectas", 401, "AUTH_FAILED"),
    );

    const { getByTestId, getByText } = render(
      <LoginScreen
        onNavigateToOtp={mockNavigateToOtp}
        onNavigateToRegister={mockNavigateToRegister}
        onNavigateBack={mockNavigateBack}
        onNavigateToForgotPassword={mockNavigateToForgotPassword}
      />,
    );

    fireEvent.changeText(getByTestId("input-email-phone"), "test@example.com");
    fireEvent.changeText(getByTestId("input-password"), "WrongPass1!");
    fireEvent.press(getByTestId("btn-login-submit"));

    await waitFor(() => {
      expect(
        getByText(
          "Credenciales incorrectas. Verificá tu email/teléfono y contraseña.",
        ),
      ).toBeTruthy();
      expect(mockNavigateToOtp).not.toHaveBeenCalled();
    });
  });

  it("navigates to Register when '¿No tenés cuenta?' is pressed", () => {
    const { getByTestId } = render(
      <LoginScreen
        onNavigateToOtp={mockNavigateToOtp}
        onNavigateToRegister={mockNavigateToRegister}
        onNavigateBack={mockNavigateBack}
        onNavigateToForgotPassword={mockNavigateToForgotPassword}
      />,
    );

    fireEvent.press(getByTestId("btn-go-to-register"));
    expect(mockNavigateToRegister).toHaveBeenCalled();
  });

  it("shows validation errors when fields are blurred empty", async () => {
    const { getByTestId, getByText } = render(
      <LoginScreen
        onNavigateToOtp={mockNavigateToOtp}
        onNavigateToRegister={mockNavigateToRegister}
        onNavigateBack={mockNavigateBack}
        onNavigateToForgotPassword={mockNavigateToForgotPassword}
      />,
    );

    fireEvent.changeText(getByTestId("input-email-phone"), "   ");
    fireEvent.changeText(getByTestId("input-password"), "Password123!");

    fireEvent(getByTestId("input-email-phone"), "blur");

    await waitFor(() => {
      expect(
        getByText("El correo electrónico o teléfono es obligatorio"),
      ).toBeTruthy();
    });
  });

  it("shows validation error for short password when blurred", async () => {
    const { getByTestId, getByText } = render(
      <LoginScreen
        onNavigateToOtp={mockNavigateToOtp}
        onNavigateToRegister={mockNavigateToRegister}
        onNavigateBack={mockNavigateBack}
        onNavigateToForgotPassword={mockNavigateToForgotPassword}
      />,
    );

    fireEvent.changeText(getByTestId("input-email-phone"), "test@example.com");
    fireEvent.changeText(getByTestId("input-password"), "ab");

    fireEvent(getByTestId("input-password"), "blur");

    await waitFor(() => {
      expect(
        getByText("La contraseña debe tener al menos 6 caracteres"),
      ).toBeTruthy();
    });
  });

  it("navigates to forgot password screen when link is pressed", () => {
    const { getByTestId } = render(
      <LoginScreen
        onNavigateToOtp={mockNavigateToOtp}
        onNavigateToRegister={mockNavigateToRegister}
        onNavigateBack={mockNavigateBack}
        onNavigateToForgotPassword={mockNavigateToForgotPassword}
      />,
    );

    fireEvent.press(getByTestId("btn-forgot-password"));
    expect(mockNavigateToForgotPassword).toHaveBeenCalled();
  });
});
