import { useState, useMemo, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LoginFormData, LoginFormErrors, LoginFieldKey } from "../types/auth";
import { authService } from "../services/authService";
import { ApiError } from "../services/api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{8,15}$/;
const REMEMBERED_CONTACT_KEY = "@startup_app/remembered_contact";

export const useLoginForm = (
  onNavigateToOtp: (contact?: string) => void,
) => {
  const [formData, setFormData] = useState<LoginFormData>({
    emailOrPhone: "",
    password: "",
  });

  const [touched, setTouched] = useState<Record<LoginFieldKey, boolean>>({
    emailOrPhone: false,
    password: false,
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const loadRemembered = async () => {
      try {
        const saved = await AsyncStorage.getItem(REMEMBERED_CONTACT_KEY);
        if (saved) {
          setFormData((prev) => ({ ...prev, emailOrPhone: saved }));
          setRememberMe(true);
        }
      } catch {
        // Silent fail — non-critical
      }
    };
    loadRemembered();
  }, []);

  const errors = useMemo<LoginFormErrors>(() => {
    const errs: LoginFormErrors = {};
    const value = formData.emailOrPhone.trim();

    if (!value) {
      errs.emailOrPhone = "El correo electrónico o teléfono es obligatorio";
    } else {
      const isEmail = EMAIL_REGEX.test(value);
      const isPhone = PHONE_REGEX.test(value.replace(/\s+/g, ""));
      if (!isEmail && !isPhone) {
        errs.emailOrPhone = "Ingresá un correo electrónico o teléfono válido";
      }
    }

    if (!formData.password) {
      errs.password = "La contraseña es obligatoria";
    } else if (formData.password.length < 6) {
      errs.password = "La contraseña debe tener al menos 6 caracteres";
    }

    return errs;
  }, [formData]);

  const isFormValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  const handleChange = useCallback(
    (field: LoginFieldKey, value: string | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setServerError(null);
    },
    [],
  );

  const handleBlur = useCallback((field: LoginFieldKey) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const toggleRememberMe = useCallback(() => {
    setRememberMe((prev) => !prev);
  }, []);

  const handleSubmit = useCallback(async () => {
    setTouched({ emailOrPhone: true, password: true });

    if (!isFormValid) return;

    setIsSubmitting(true);
    setServerError(null);

    const value = formData.emailOrPhone.trim();
    const isEmail = EMAIL_REGEX.test(value);
    const isPhone = PHONE_REGEX.test(value.replace(/\s+/g, ""));

    const payload = {
      password: formData.password,
      ...(isEmail ? { email: value } : { phone: value.replace(/\s+/g, "") }),
    };

    try {
      const response = await authService.login(payload);

      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBERED_CONTACT_KEY, value);
      } else {
        await AsyncStorage.removeItem(REMEMBERED_CONTACT_KEY);
      }

      const contact = isEmail ? value : value.replace(/\s+/g, "");
      onNavigateToOtp(contact);
    } catch (err: any) {
      if (err instanceof ApiError) {
        switch (err.statusCode) {
          case 401:
            setServerError("Credenciales incorrectas. Verificá tu email/teléfono y contraseña.");
            break;
          case 404:
            setServerError("No se encontró una cuenta con esos datos.");
            break;
          case 403:
            setServerError("Tu cuenta aún no fue verificada. Revisa tu correo o teléfono para el código OTP.");
            break;
          case 429:
            setServerError("Demasiados intentos. Esperá unos minutos y volvé a intentar.");
            break;
          default:
            setServerError(err.message || "Ocurrió un error al iniciar sesión.");
        }
      } else {
        setServerError("Error de conexión. Verificá tu internet y reintenta.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isFormValid, rememberMe, onNavigateToOtp]);

  return {
    formData,
    touched,
    errors,
    isFormValid,
    showPassword,
    rememberMe,
    isSubmitting,
    serverError,
    handleChange,
    handleBlur,
    toggleShowPassword,
    toggleRememberMe,
    handleSubmit,
  };
};
