import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { ForgotPasswordScreen } from "../../src/screens/ForgotPasswordScreen";
import { authService } from "../../src/services/authService";

jest.mock("../../src/services/authService", () => ({
  authService: {
    forgotPassword: jest.fn(),
    verifyResetCode: jest.fn(),
    resetPassword: jest.fn(),
  },
}));

describe("ForgotPasswordScreen Component", () => {
  const mockNavigateToLogin = jest.fn();
  const mockNavigateBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders step 1 with email/phone input and Enviar Código button", () => {
    const { getByTestId, getByText } = render(
      <ForgotPasswordScreen
        onNavigateToLogin={mockNavigateToLogin}
        onNavigateBack={mockNavigateBack}
      />,
    );

    expect(getByText("Recuperar Contraseña")).toBeTruthy();
    expect(getByText("Paso 1 de 3")).toBeTruthy();
    expect(getByTestId("input-reset-contact")).toBeTruthy();
    expect(getByTestId("btn-send-code")).toBeTruthy();
  });

  it("disables Enviar Código until a valid contact is entered", () => {
    const { getByTestId } = render(
      <ForgotPasswordScreen
        onNavigateToLogin={mockNavigateToLogin}
        onNavigateBack={mockNavigateBack}
      />,
    );

    const sendBtn = getByTestId("btn-send-code");
    expect(sendBtn.props.accessibilityState?.disabled).toBe(true);

    fireEvent.changeText(getByTestId("input-reset-contact"), "user@test.com");

    expect(sendBtn.props.accessibilityState?.disabled).toBe(false);
  });

  it("moves to step 2 when Enviar Código succeeds", async () => {
    (authService.forgotPassword as jest.Mock).mockResolvedValueOnce({
      message: "Código de recuperación enviado correctamente.",
    });

    const { getByTestId, getByText } = render(
      <ForgotPasswordScreen
        onNavigateToLogin={mockNavigateToLogin}
        onNavigateBack={mockNavigateBack}
      />,
    );

    fireEvent.changeText(getByTestId("input-reset-contact"), "user@test.com");
    fireEvent.press(getByTestId("btn-send-code"));

    await waitFor(() => {
      expect(getByText("Paso 2 de 3")).toBeTruthy();
      expect(getByTestId("reset-code-row")).toBeTruthy();
      expect(getByTestId("btn-verify-code")).toBeTruthy();
    });
  });

  it("shows server error when user not found", async () => {
    const { ApiError } = jest.requireActual("../../src/services/api");
    (authService.forgotPassword as jest.Mock).mockRejectedValueOnce(
      new ApiError("El correo electrónico o teléfono no está registrado", 404, "USER_NOT_FOUND"),
    );

    const { getByTestId, getByText } = render(
      <ForgotPasswordScreen
        onNavigateToLogin={mockNavigateToLogin}
        onNavigateBack={mockNavigateBack}
      />,
    );

    fireEvent.changeText(getByTestId("input-reset-contact"), "user@test.com");
    fireEvent.press(getByTestId("btn-send-code"));

    await waitFor(() => {
      expect(
        getByText("El correo electrónico o teléfono no está registrado"),
      ).toBeTruthy();
      expect(getByText("Paso 1 de 3")).toBeTruthy();
    });
  });

  it("navigates back to login from step 1 back arrow", () => {
    const { getByTestId } = render(
      <ForgotPasswordScreen
        onNavigateToLogin={mockNavigateToLogin}
        onNavigateBack={mockNavigateBack}
      />,
    );

    fireEvent.press(getByTestId("btn-reset-back"));
    expect(mockNavigateBack).toHaveBeenCalled();
  });

  it("navigates to login via Volver a Iniciar Sesión link", () => {
    const { getByTestId } = render(
      <ForgotPasswordScreen
        onNavigateToLogin={mockNavigateToLogin}
        onNavigateBack={mockNavigateBack}
      />,
    );

    fireEvent.press(getByTestId("btn-back-to-login"));
    expect(mockNavigateToLogin).toHaveBeenCalled();
  });

  it("progresses through all 3 steps to reset password", async () => {
    (authService.forgotPassword as jest.Mock).mockResolvedValueOnce({
      message: "OK",
    });
    (authService.verifyResetCode as jest.Mock).mockResolvedValueOnce({
      message: "OK",
      token: "temp-token-123",
    });
    (authService.resetPassword as jest.Mock).mockResolvedValueOnce({
      message: "Contraseña restablecida correctamente.",
    });

    const { getByTestId, getByText, getAllByTestId } = render(
      <ForgotPasswordScreen
        onNavigateToLogin={mockNavigateToLogin}
        onNavigateBack={mockNavigateBack}
      />,
    );

    // Step 1
    fireEvent.changeText(getByTestId("input-reset-contact"), "user@test.com");
    fireEvent.press(getByTestId("btn-send-code"));

    await waitFor(() => {
      expect(getByText("Paso 2 de 3")).toBeTruthy();
    });

    // Step 2 - enter code
    for (let i = 0; i < 6; i++) {
      fireEvent.changeText(getByTestId(`otp-input-${i}`), String(i + 1));
    }
    fireEvent.press(getByTestId("btn-verify-code"));

    await waitFor(() => {
      expect(getByText("Paso 3 de 3")).toBeTruthy();
    });

    // Step 3
    fireEvent.changeText(getByTestId("input-new-password"), "NewPass1!");
    fireEvent.changeText(getByTestId("input-confirm-password"), "NewPass1!");
    fireEvent.press(getByTestId("btn-reset-password"));

    await waitFor(() => {
      expect(authService.resetPassword).toHaveBeenCalledWith({
        token: "temp-token-123",
        password: "NewPass1!",
      });
      expect(mockNavigateToLogin).toHaveBeenCalled();
    });
  });

  it("toggles visibility of the new password field", async () => {
    (authService.forgotPassword as jest.Mock).mockResolvedValueOnce({
      message: "OK",
    });
    (authService.verifyResetCode as jest.Mock).mockResolvedValueOnce({
      message: "OK",
      token: "temp-token-123",
    });

    const { getByTestId, getByText } = render(
      <ForgotPasswordScreen
        onNavigateToLogin={mockNavigateToLogin}
        onNavigateBack={mockNavigateBack}
      />,
    );

    fireEvent.changeText(getByTestId("input-reset-contact"), "user@test.com");
    fireEvent.press(getByTestId("btn-send-code"));
    await waitFor(() => expect(getByText("Paso 2 de 3")).toBeTruthy());

    for (let i = 0; i < 6; i++) {
      fireEvent.changeText(getByTestId(`otp-input-${i}`), String(i + 1));
    }
    fireEvent.press(getByTestId("btn-verify-code"));
    await waitFor(() => expect(getByText("Paso 3 de 3")).toBeTruthy());

    const newPasswordInput = getByTestId("input-new-password");
    expect(newPasswordInput.props.secureTextEntry).toBe(true);

    fireEvent.press(getByTestId("input-new-password-toggle"));
    expect(getByTestId("input-new-password").props.secureTextEntry).toBe(false);

    fireEvent.press(getByTestId("input-new-password-toggle"));
    expect(getByTestId("input-new-password").props.secureTextEntry).toBe(true);

    const confirmInput = getByTestId("input-confirm-password");
    expect(confirmInput.props.secureTextEntry).toBe(true);
    fireEvent.press(getByTestId("input-confirm-password-toggle"));
    expect(getByTestId("input-confirm-password").props.secureTextEntry).toBe(false);
  });

  it("auto-advances to the next digit when entering the reset code", async () => {
    const focusSpy = jest.spyOn(require("react-native").TextInput.prototype, "focus");

    (authService.forgotPassword as jest.Mock).mockResolvedValueOnce({
      message: "OK",
    });

    const { getByTestId, getByText } = render(
      <ForgotPasswordScreen
        onNavigateToLogin={mockNavigateToLogin}
        onNavigateBack={mockNavigateBack}
      />,
    );

    fireEvent.changeText(getByTestId("input-reset-contact"), "user@test.com");
    fireEvent.press(getByTestId("btn-send-code"));
    await waitFor(() => expect(getByText("Paso 2 de 3")).toBeTruthy());

    fireEvent.changeText(getByTestId("otp-input-0"), "1");

    await waitFor(() => {
      expect(focusSpy).toHaveBeenCalled();
    });

    focusSpy.mockRestore();
  });
});
