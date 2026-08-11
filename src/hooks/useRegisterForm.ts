import { useState, useMemo, useCallback } from 'react';
import {
  RegisterFormData,
  RegisterFormErrors,
  PasswordCriteriaStatus,
  FormFieldKey,
} from '../types/auth';
import { authService } from '../services/authService';
import { ApiError } from '../services/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{8,15}$/;

export const useRegisterForm = (
  onNavigateToOtp: () => void,
  onNavigateToLogin: () => void
) => {
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
  });

  const [touched, setTouched] = useState<Record<FormFieldKey, boolean>>({
    firstName: false,
    lastName: false,
    email: false,
    phone: false,
    password: false,
    confirmPassword: false,
    acceptedTerms: false,
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const passwordCriteria = useMemo<PasswordCriteriaStatus>(() => {
    const pwd = formData.password;
    return {
      minLength: pwd.length >= 8,
      hasUppercase: /[A-Z]/.test(pwd),
      hasLowercase: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    };
  }, [formData.password]);

  const errors = useMemo<RegisterFormErrors>(() => {
    const errs: RegisterFormErrors = {};

    if (!formData.firstName.trim()) {
      errs.firstName = 'El nombre es obligatorio';
    } else if (formData.firstName.trim().length < 2) {
      errs.firstName = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!formData.lastName.trim()) {
      errs.lastName = 'El apellido es obligatorio';
    } else if (formData.lastName.trim().length < 2) {
      errs.lastName = 'El apellido debe tener al menos 2 caracteres';
    }

    if (!formData.email.trim()) {
      errs.email = 'El correo electrónico es obligatorio';
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      errs.email = 'Formato de correo electrónico inválido';
    }

    const cleanPhone = formData.phone.replace(/\s+/g, '');
    if (!cleanPhone) {
      errs.phone = 'El teléfono es obligatorio';
    } else if (!PHONE_REGEX.test(cleanPhone)) {
      errs.phone = 'El teléfono debe contener entre 8 y 15 dígitos';
    }

    const allCriteriaMet = Object.values(passwordCriteria).every(Boolean);
    if (!formData.password) {
      errs.password = 'La contraseña es obligatoria';
    } else if (!allCriteriaMet) {
      errs.password = 'La contraseña no cumple con todos los requisitos de complejidad';
    }

    if (!formData.confirmPassword) {
      errs.confirmPassword = 'Debes confirmar la contraseña';
    } else if (formData.confirmPassword !== formData.password) {
      errs.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (!formData.acceptedTerms) {
      errs.acceptedTerms = 'Debes aceptar los términos y condiciones';
    }

    return errs;
  }, [formData, passwordCriteria]);

  const isFormValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  const handleChange = useCallback((field: FormFieldKey, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setServerError(null);
  }, []);

  const handleBlur = useCallback((field: FormFieldKey) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const toggleShowConfirmPassword = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
  }, []);

  const handleAcceptTerms = useCallback(() => {
    handleChange('acceptedTerms', true);
    setTouched((prev) => ({ ...prev, acceptedTerms: true }));
  }, [handleChange]);

  const handleSubmit = useCallback(async () => {
    // Mark all fields as touched to show errors if any
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
      acceptedTerms: true,
    });

    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      await authService.register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.replace(/\s+/g, ''),
        password: formData.password,
      });

      onNavigateToOtp();
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.statusCode === 409) {
          setServerError('El correo electrónico o número de teléfono ya se encuentra registrado.');
        } else {
          setServerError(err.message || 'Ocurrió un error al procesar el registro.');
        }
      } else {
        setServerError('Error de conexión con el servidor. Por favor reintenta.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isFormValid, onNavigateToOtp]);

  return {
    formData,
    touched,
    errors,
    passwordCriteria,
    isFormValid,
    showPassword,
    showConfirmPassword,
    isTermsModalOpen,
    isSubmitting,
    serverError,
    handleChange,
    handleBlur,
    toggleShowPassword,
    toggleShowConfirmPassword,
    setIsTermsModalOpen,
    handleAcceptTerms,
    handleSubmit,
    onNavigateToLogin,
  };
};
