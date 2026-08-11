/**
 * Authentication & Registration Types
 */

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

export type FormFieldKey = keyof RegisterFormData;

export interface RegisterFormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  acceptedTerms?: string;
  general?: string;
}

export interface PasswordCriteriaStatus {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
}

export interface RegisterApiPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

export interface RegisterApiResponse {
  success: boolean;
  message: string;
  userId?: string;
  requireOtpVerification?: boolean;
}

export interface RegisterScreenProps {
  onNavigateToOtp: () => void;
  onNavigateToLogin: () => void;
  onNavigateBack: () => void;
}

export interface AuthWelcomeScreenProps {
  onNavigateToRegister: () => void;
  onNavigateToLogin: () => void;
  onNavigateToOnboarding: () => void;
}
