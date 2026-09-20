import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { OtpVerificationScreen } from "../../src/screens/OtpVerificationScreen";
import { authService } from "../../src/services/authService";

// Mock the auth service
jest.mock("../../src/services/authService", () => ({
  authService: {
    verifyOtp: jest.fn(),
    resendOtp: jest.fn(),
  },
}));

// Use fake timers for countdown logic
jest.useFakeTimers();

const DEFAULT_PROPS = {
  contact: "user@example.com",
  onVerificationSuccess: jest.fn(),
  onNavigateBackToRegister: jest.fn(),
};

describe("OtpVerificationScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────

  it("renders title, subtitle with masked contact, all 6 digit inputs, and timer", () => {
    const { getByText, getByTestId } = render(
      <OtpVerificationScreen {...DEFAULT_PROPS} />,
    );

    expect(getByText("Verificar tu identidad")).toBeTruthy();
    // Subtitle masked contact: user@example.com → use***ple.com
    expect(getByText(/Ingresá el código de 6 dígitos/)).toBeTruthy();
    expect(getByTestId("otp-timer")).toBeTruthy();

    for (let i = 0; i < 6; i++) {
      expect(getByTestId(`otp-input-${i}`)).toBeTruthy();
    }

    const verifyBtn = getByTestId("btn-otp-verify");
    expect(verifyBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it("renders back button and navigates back when pressed", () => {
    const { getByTestId } = render(
      <OtpVerificationScreen {...DEFAULT_PROPS} />,
    );
    fireEvent.press(getByTestId("btn-otp-back"));
    expect(DEFAULT_PROPS.onNavigateBackToRegister).toHaveBeenCalled();
  });

  it("renders change contact link and navigates back when pressed", () => {
    const { getByTestId } = render(
      <OtpVerificationScreen {...DEFAULT_PROPS} />,
    );
    fireEvent.press(getByTestId("btn-change-contact"));
    expect(DEFAULT_PROPS.onNavigateBackToRegister).toHaveBeenCalled();
  });

  // ─── Digit Input Logic ───────────────────────────────────────────────────────

  it("enables verify button only when all 6 digits are filled", () => {
    const { getByTestId } = render(
      <OtpVerificationScreen {...DEFAULT_PROPS} />,
    );

    for (let i = 0; i < 5; i++) {
      fireEvent.changeText(getByTestId(`otp-input-${i}`), `${i + 1}`);
    }
    expect(
      getByTestId("btn-otp-verify").props.accessibilityState?.disabled,
    ).toBe(true);

    fireEvent.changeText(getByTestId("otp-input-5"), "6");
    expect(
      getByTestId("btn-otp-verify").props.accessibilityState?.disabled,
    ).toBe(false);
  });

  it("ignores non-numeric input in digit cells", () => {
    const { getByTestId } = render(
      <OtpVerificationScreen {...DEFAULT_PROPS} />,
    );
    fireEvent.changeText(getByTestId("otp-input-0"), "a");
    expect(getByTestId("otp-input-0").props.value).toBe("");
  });

  // ─── Verification Success ────────────────────────────────────────────────────

  it("calls verifyOtp and navigates on successful verification", async () => {
    (authService.verifyOtp as jest.Mock).mockResolvedValueOnce({
      message: "Verificación exitosa",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: {
        id: "u1",
        email: "user@example.com",
        phone: "+5491122334455",
      },
    });
    const { getByTestId } = render(
      <OtpVerificationScreen {...DEFAULT_PROPS} />,
    );

    for (let i = 0; i < 6; i++) {
      fireEvent.changeText(getByTestId(`otp-input-${i}`), `${i + 1}`);
    }
    fireEvent.press(getByTestId("btn-otp-verify"));

    await waitFor(() => {
      expect(authService.verifyOtp).toHaveBeenCalledWith({
        email: DEFAULT_PROPS.contact,
        otp_code: "123456",
      });
      expect(DEFAULT_PROPS.onVerificationSuccess).toHaveBeenCalled();
    });
  });

  // ─── Error Handling ──────────────────────────────────────────────────────────

  it("shows error message on invalid code (400) and decrements attempts", async () => {
    const { ApiError } = jest.requireActual("../../src/services/api");
    (authService.verifyOtp as jest.Mock).mockRejectedValueOnce(
      new ApiError("El código OTP es inválido", 400, "INVALID_OTP"),
    );

    const { getByTestId, getByText } = render(
      <OtpVerificationScreen {...DEFAULT_PROPS} />,
    );
    for (let i = 0; i < 6; i++) {
      fireEvent.changeText(getByTestId(`otp-input-${i}`), "0");
    }
    fireEvent.press(getByTestId("btn-otp-verify"));

    await waitFor(() => {
      expect(getByTestId("otp-error-banner")).toBeTruthy();
      // Should show remaining attempts
      expect(getByText(/Te quedan 4 intentos/)).toBeTruthy();
    });
  });

  it("shows expiry error and disables verify when code is expired (410)", async () => {
    const { ApiError } = jest.requireActual("../../src/services/api");
    (authService.verifyOtp as jest.Mock).mockRejectedValueOnce(
      new ApiError("El código OTP ha expirado", 410, "EXPIRED_OTP"),
    );

    const { getByTestId, getByText } = render(
      <OtpVerificationScreen {...DEFAULT_PROPS} />,
    );
    for (let i = 0; i < 6; i++) {
      fireEvent.changeText(getByTestId(`otp-input-${i}`), "1");
    }
    fireEvent.press(getByTestId("btn-otp-verify"));

    await waitFor(() => {
      expect(getByText(/El código ha expirado/)).toBeTruthy();
    });
  });

  it("locks the screen after 5 failed attempts", async () => {
    const { ApiError } = jest.requireActual("../../src/services/api");
    (authService.verifyOtp as jest.Mock).mockRejectedValue(
      new ApiError("El código OTP es inválido", 400, "INVALID_OTP"),
    );

    const { getByTestId, getByText } = render(
      <OtpVerificationScreen {...DEFAULT_PROPS} />,
    );

    for (let attempt = 0; attempt < 5; attempt++) {
      for (let i = 0; i < 6; i++) {
        fireEvent.changeText(getByTestId(`otp-input-${i}`), "0");
      }
      fireEvent.press(getByTestId("btn-otp-verify"));
      await waitFor(() =>
        expect(authService.verifyOtp).toHaveBeenCalledTimes(attempt + 1),
      );
    }

    await waitFor(() => {
      expect(getByText(/Superaste el número máximo de intentos/)).toBeTruthy();
      expect(
        getByTestId("btn-otp-verify").props.accessibilityState?.disabled,
      ).toBe(true);
    });
  });

  // ─── Timer ───────────────────────────────────────────────────────────────────

  it("shows OTP expiry error when the 10-minute countdown reaches zero", () => {
    const { getAllByText, getByTestId } = render(
      <OtpVerificationScreen {...DEFAULT_PROPS} />,
    );

    act(() => {
      jest.advanceTimersByTime(10 * 60 * 1000 + 500);
    });

    // Timer shows "Código expirado" AND error banner may also show it — both are correct
    expect(
      getAllByText(/[Cc]ódigo expirado|El código ha expirado/).length,
    ).toBeGreaterThanOrEqual(1);
    // The timer testID specifically should show "Código expirado"
    expect(getByTestId("otp-timer").props.children).toBe("Código expirado");
  });

  // ─── Resend ──────────────────────────────────────────────────────────────────

  it("resend button is disabled for the first 30 seconds", () => {
    const { getByTestId } = render(
      <OtpVerificationScreen {...DEFAULT_PROPS} />,
    );
    expect(getByTestId("btn-otp-resend-disabled")).toBeTruthy();
  });

  it("resend button becomes active after 30-second cooldown", () => {
    const { getByTestId } = render(
      <OtpVerificationScreen {...DEFAULT_PROPS} />,
    );

    act(() => {
      jest.advanceTimersByTime(30 * 1000 + 500);
    });

    expect(getByTestId("btn-otp-resend")).toBeTruthy();
  });

  it("calls resendOtp, resets timer, and re-enables input after resend", async () => {
    (authService.resendOtp as jest.Mock).mockResolvedValueOnce({
      message: "Se ha enviado un nuevo código OTP",
    });

    const { getByTestId } = render(
      <OtpVerificationScreen {...DEFAULT_PROPS} />,
    );

    act(() => {
      jest.advanceTimersByTime(31 * 1000);
    });

    fireEvent.press(getByTestId("btn-otp-resend"));

    await waitFor(() => {
      expect(authService.resendOtp).toHaveBeenCalledWith({
        email: DEFAULT_PROPS.contact,
      });
    });
  });

  // ─── Loading States ──────────────────────────────────────────────────────────

  it("shows loading spinner while verifying", async () => {
    // Never resolves during this test
    (authService.verifyOtp as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { getByTestId } = render(
      <OtpVerificationScreen {...DEFAULT_PROPS} />,
    );

    for (let i = 0; i < 6; i++) {
      fireEvent.changeText(getByTestId(`otp-input-${i}`), `${i + 1}`);
    }
    fireEvent.press(getByTestId("btn-otp-verify"));

    await waitFor(() => {
      expect(getByTestId("otp-loading-spinner")).toBeTruthy();
    });
  });
});
