import { useState, useEffect, useCallback, useRef } from "react";
import { authService } from "../services/authService";
import { ApiError } from "../services/api";
import { tokenStorage } from "../services/tokenStorage";
import { toContactIdentifier } from "../utils/contact";

/** Duration of the full OTP validity window in seconds */
const OTP_EXPIRY_SECONDS = 10 * 60; // 10 minutes
/** Time (in seconds) the resend button stays disabled after sending */
const RESEND_COOLDOWN_SECONDS = 30;
/** Maximum number of invalid code attempts before locking */
const MAX_ATTEMPTS = 5;

export type OtpStatus =
  "idle" | "verifying" | "resending" | "success" | "locked";

interface UseOtpVerificationOptions {
  contact: string;
  onVerificationSuccess: () => void;
}

interface UseOtpVerificationReturn {
  code: string[];
  status: OtpStatus;
  /** Human-readable error message, null when none */
  errorMessage: string | null;
  /** Seconds remaining on the OTP expiry clock */
  secondsRemaining: number;
  /** Whether the Resend button is allowed to be pressed */
  canResend: boolean;
  /** Seconds left on the resend cooldown (shown inside the disabled button) */
  resendCooldown: number;
  /** Remaining attempt count */
  attemptsLeft: number;
  handleDigitChange: (index: number, digit: string) => void;
  handleDigitKeyPress: (index: number, key: string) => void;
  handleVerify: () => Promise<void>;
  handleResend: () => Promise<void>;
  inputRefs: React.MutableRefObject<Array<{ focus: () => void } | null>>;
}

export const useOtpVerification = ({
  contact,
  onVerificationSuccess,
}: UseOtpVerificationOptions): UseOtpVerificationReturn => {
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [status, setStatus] = useState<OtpStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] =
    useState<number>(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState<number>(
    RESEND_COOLDOWN_SECONDS,
  );
  const [attemptsLeft, setAttemptsLeft] = useState<number>(MAX_ATTEMPTS);

  const inputRefs = useRef<Array<{ focus: () => void } | null>>(
    Array(6).fill(null),
  );

  // ---------- Countdown timers ----------

  useEffect(() => {
    if (status === "locked" || status === "success") return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorMessage(
            "El código ha expirado. Por favor solicitá uno nuevo.",
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [resendCooldown]);

  // ---------- Derived state ----------

  const canResend =
    resendCooldown === 0 && secondsRemaining > 0 && status !== "locked";

  // ---------- Digit handling ----------

  const handleDigitChange = useCallback((index: number, digit: string) => {
    // Only accept single numeric characters
    const sanitized = digit.replace(/[^0-9]/g, "").slice(-1);

    setCode((prev) => {
      const next = [...prev];
      next[index] = sanitized;
      return next;
    });

    setErrorMessage(null);

    if (sanitized && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleDigitKeyPress = useCallback(
    (index: number, key: string) => {
      if (key === "Backspace" && !code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [code],
  );

  // ---------- Verify OTP ----------

  const handleVerify = useCallback(async () => {
    const fullCode = code.join("");

    if (fullCode.length < 6) {
      setErrorMessage("Ingresá los 6 dígitos del código.");
      return;
    }

    if (status === "locked") return;
    if (secondsRemaining === 0) {
      setErrorMessage("El código ha expirado. Por favor solicitá uno nuevo.");
      return;
    }

    setStatus("verifying");
    setErrorMessage(null);

    try {
      const result = await authService.verifyOtp({
        ...toContactIdentifier(contact),
        otp_code: fullCode,
      });
      if (result.accessToken) {
        await tokenStorage.setAccessToken(result.accessToken);
      }
      if (result.refreshToken) {
        await tokenStorage.setRefreshToken(result.refreshToken);
      }
      if (result.user?.id) {
        await tokenStorage.setUserId(result.user.id);
      }
      setStatus("success");
      onVerificationSuccess();
    } catch (err: any) {
      setStatus("idle");

      if (err instanceof ApiError) {
        const errorCode = err.errorCode;

        if (errorCode === "VALIDATION_ERROR") {
          setErrorMessage(
            err.message ||
              "Hay un error en los datos enviados. Verificá e intentá de nuevo.",
          );
          return;
        }

        if (errorCode === "EXPIRED_OTP" || err.statusCode === 410) {
          setErrorMessage(
            "El código ha expirado. Por favor solicitá uno nuevo.",
          );
          return;
        }

        if (errorCode === "OTP_ATTEMPTS_EXCEEDED") {
          setAttemptsLeft(0);
          setStatus("locked");
          setErrorMessage(
            "Demasiados intentos fallidos. Solicitá un nuevo código.",
          );
          return;
        }

        if (errorCode === "TOO_MANY_REQUESTS" || err.statusCode === 429) {
          setErrorMessage(
            err.message || "Demasiados intentos. Reintentá más tarde.",
          );
          return;
        }
      }

      // Fallback: el fallo cuenta como intento fallido de código (400/INVALID_OTP back).
      const newAttemptsLeft = attemptsLeft - 1;
      setAttemptsLeft(newAttemptsLeft);

      if (newAttemptsLeft <= 0) {
        setStatus("locked");
        setErrorMessage(
          "Superaste el número máximo de intentos. Solicitá un nuevo código.",
        );
        return;
      }

      if (err instanceof ApiError) {
        setErrorMessage(
          err.errorCode === "INVALID_OTP" || err.statusCode === 400
            ? `Código incorrecto. Te quedan ${newAttemptsLeft} intento${newAttemptsLeft === 1 ? "" : "s"}.`
            : err.message ||
                "Error del servidor. Reintentá en unos instantes.",
        );
      } else {
        setErrorMessage(
          "Error de conexión. Verificá tu internet e intentá de nuevo.",
        );
      }
    }
  }, [
    code,
    contact,
    status,
    secondsRemaining,
    attemptsLeft,
    onVerificationSuccess,
  ]);

  // ---------- Resend OTP ----------

  const handleResend = useCallback(async () => {
    if (!canResend) return;

    setStatus("resending");
    setErrorMessage(null);

    try {
      await authService.resendOtp(toContactIdentifier(contact));

      // Reset timers and attempts
      setSecondsRemaining(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setAttemptsLeft(MAX_ATTEMPTS);
      setCode(Array(6).fill(""));
      setStatus("idle");

      // Focus first digit
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setStatus("idle");
      if (err instanceof ApiError) {
        setErrorMessage(
          err.message || "No se pudo reenviar el código. Reintentá más tarde.",
        );
      } else {
        setErrorMessage("Error de conexión al intentar reenviar el código.");
      }
    }
  }, [canResend, contact]);

  return {
    code,
    status,
    errorMessage,
    secondsRemaining,
    canResend,
    resendCooldown,
    attemptsLeft,
    handleDigitChange,
    handleDigitKeyPress,
    handleVerify,
    handleResend,
    inputRefs,
  };
};
