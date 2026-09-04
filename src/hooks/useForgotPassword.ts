import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  PasswordResetStep,
  ForgotPasswordApiPayload,
  VerifyResetCodeApiPayload,
} from "../types/auth";
import { authService } from "../services/authService";
import { ApiError } from "../services/api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{8,15}$/;
const RESET_CODE_EXPIRY_SECONDS = 30 * 60; // 30 minutes
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

interface UseForgotPasswordReturn {
  step: PasswordResetStep;
  contact: string;
  code: string[];
  newPassword: string;
  confirmPassword: string;
  contactTouched: boolean;
  contactError?: string;
  codeError?: string;
  passwordError?: string;
  confirmPasswordError?: string;
  secondsRemaining: number;
  isSubmitting: boolean;
  serverError: string | null;
  canSubmitStep1: boolean;
  canSubmitStep2: boolean;
  canSubmitStep3: boolean;
  handleContactChange: (value: string) => void;
  handleContactBlur: () => void;
  handleDigitChange: (index: number, digit: string) => void;
  handleDigitKeyPress: (index: number, key: string) => void;
  handleNewPasswordChange: (value: string) => void;
  handleConfirmPasswordChange: (value: string) => void;
  handleNextStep: () => Promise<void>;
  handleVerifyCode: () => Promise<void>;
  handleResetPassword: () => Promise<void>;
  handleBack: () => void;
  inputRefs: React.MutableRefObject<Array<{ focus: () => void } | null>>;
}

export const useForgotPassword = (
  onNavigateToLogin: () => void,
): UseForgotPasswordReturn => {
  const [step, setStep] = useState<PasswordResetStep>(1);
  const [contact, setContact] = useState("");
  const [contactTouched, setContactTouched] = useState(false);
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    RESET_CODE_EXPIRY_SECONDS,
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string>("");

  const inputRefs = useRef<Array<{ focus: () => void } | null>>(
    Array(6).fill(null),
  );

  // Source of the contact (email vs phone) to send to backend
  const contactPayload = useMemo<ForgotPasswordApiPayload>(() => {
    const value = contact.trim();
    if (EMAIL_REGEX.test(value)) {
      return { email: value };
    }
    if (PHONE_REGEX.test(value.replace(/\s+/g, ""))) {
      return { phone: value.replace(/\s+/g, "") };
    }
    return {};
  }, [contact]);

  // ----- Countdown for step 2 -----

  useEffect(() => {
    if (step !== 2) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  // ----- Step 1 validation -----

  const contactError = useMemo(() => {
    if (!contactTouched) return undefined;
    const value = contact.trim();
    if (!value) {
      return "El correo electrónico o teléfono es obligatorio";
    }
    if (!EMAIL_REGEX.test(value) && !PHONE_REGEX.test(value.replace(/\s+/g, ""))) {
      return "Ingresá un correo electrónico o teléfono válido";
    }
    return undefined;
  }, [contact, contactTouched]);

  const canSubmitStep1 = useMemo(() => {
    return Object.keys(contactPayload).length > 0;
  }, [contactPayload]);

  // ----- Step 2 validation -----

  const codeComplete = code.every((d) => d !== "");
  const codeError = useMemo(() => {
    if (codeComplete) return undefined;
    if (code.every((d) => d === "")) return undefined;
    return "Ingresá los 6 dígitos del código";
  }, [code, codeComplete]);

  const canSubmitStep2 = codeComplete;

  // ----- Step 3 validation -----

  const passwordError = useMemo(() => {
    if (!newPassword) return undefined;
    if (newPassword.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres";
    }
    if (!PASSWORD_PATTERN.test(newPassword)) {
      return "Debe incluir mayúscula, minúscula, número y símbolo";
    }
    return undefined;
  }, [newPassword]);

  const confirmPasswordError = useMemo(() => {
    if (!confirmPassword) return undefined;
    if (confirmPassword !== newPassword) {
      return "Las contraseñas no coinciden";
    }
    return undefined;
  }, [confirmPassword, newPassword]);

  const canSubmitStep3 = useMemo(() => {
    return (
      newPassword.length > 0 &&
      passwordError === undefined &&
      confirmPassword.length > 0 &&
      confirmPasswordError === undefined
    );
  }, [newPassword, passwordError, confirmPassword, confirmPasswordError]);

  // ----- Handlers -----

  const handleContactChange = useCallback((value: string) => {
    setContact(value);
    setServerError(null);
  }, []);

  const handleContactBlur = useCallback(() => {
    setContactTouched(true);
  }, []);

  const handleDigitChange = useCallback((index: number, digit: string) => {
    const sanitized = digit.replace(/[^0-9]/g, "").slice(-1);
    setCode((prev) => {
      const next = [...prev];
      next[index] = sanitized;
      return next;
    });
    setServerError(null);
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

  const handleNewPasswordChange = useCallback((value: string) => {
    setNewPassword(value);
    setServerError(null);
  }, []);

  const handleConfirmPasswordChange = useCallback((value: string) => {
    setConfirmPassword(value);
    setServerError(null);
  }, []);

  const handleNextStep = useCallback(async () => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      await authService.forgotPassword(contactPayload);
      setStep(2);
      setSecondsRemaining(RESET_CODE_EXPIRY_SECONDS);
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.statusCode === 404) {
          setServerError(
            "El correo electrónico o teléfono no está registrado",
          );
        } else if (err.statusCode === 429) {
          setServerError(
            "Demasiadas solicitudes. Esperá unos minutos y volvé a intentar.",
          );
        } else {
          setServerError(
            err.message || "No se pudo enviar el código. Reintentá.",
          );
        }
      } else {
        setServerError("Error de conexión. Verificá tu internet e intentá de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [contactPayload]);

  const handleVerifyCode = useCallback(async () => {
    if (!canSubmitStep2) return;
    setServerError(null);
    setIsSubmitting(true);

    const payload: VerifyResetCodeApiPayload = {
      ...contactPayload,
      reset_code: code.join(""),
    };

    try {
      const result = await authService.verifyResetCode(payload);
      setResetToken(result.token);
      setStep(3);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.statusCode === 400) {
          setServerError("Código de recuperación inválido o expirado");
        } else {
          setServerError(
            err.message || "No se pudo verificar el código. Reintentá.",
          );
        }
      } else {
        setServerError("Error de conexión. Verificá tu internet e intentá de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmitStep2, code, contactPayload]);

  const handleResetPassword = useCallback(async () => {
    if (!canSubmitStep3) return;
    setServerError(null);
    setIsSubmitting(true);

    try {
      await authService.resetPassword({
        token: resetToken,
        password: newPassword,
      });
      onNavigateToLogin();
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.statusCode === 400) {
          setServerError(
            "El token temporal es inválido o ya fue utilizado. Volvé a comenzar.",
          );
        } else {
          setServerError(
            err.message || "No se pudo restablecer la contraseña. Reintentá.",
          );
        }
      } else {
        setServerError("Error de conexión. Verificá tu internet e intentá de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmitStep3, resetToken, newPassword, onNavigateToLogin]);

  const handleBack = useCallback(() => {
    setServerError(null);
    if (step === 1) {
      // handled by navigator (go back to login/welcome)
    } else if (step === 2) {
      setStep(1);
      setCode(Array(6).fill(""));
    } else {
      setStep(2);
    }
  }, [step]);

  return {
    step,
    contact,
    code,
    newPassword,
    confirmPassword,
    contactTouched,
    contactError,
    codeError,
    passwordError,
    confirmPasswordError,
    secondsRemaining,
    isSubmitting,
    serverError,
    canSubmitStep1,
    canSubmitStep2,
    canSubmitStep3,
    handleContactChange,
    handleContactBlur,
    handleDigitChange,
    handleDigitKeyPress,
    handleNewPasswordChange,
    handleConfirmPasswordChange,
    handleNextStep,
    handleVerifyCode,
    handleResetPassword,
    handleBack,
    inputRefs,
  };
};
