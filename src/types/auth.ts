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
  onNavigateToOtp: (contact?: string) => void;
  onNavigateToLogin: () => void;
  onNavigateBack: () => void;
}

export interface AuthWelcomeScreenProps {
  onNavigateToRegister: () => void;
  onNavigateToLogin: () => void;
  onNavigateToOnboarding: () => void;
}

export interface OtpVerificationScreenProps {
  /** The email or phone number that received the OTP */
  contact: string;
  /** Navigate to role-selection screen after successful verification */
  onVerificationSuccess: () => void;
  /** Return to registration to change email/phone */
  onNavigateBackToRegister: () => void;
}

/**
 * Login Types
 */

export interface LoginFormData {
  emailOrPhone: string;
  password: string;
}

export type LoginFieldKey = keyof LoginFormData;

export interface LoginFormErrors {
  emailOrPhone?: string;
  password?: string;
}

export interface LoginApiPayload {
  email?: string;
  phone?: string;
  password: string;
}

export interface LoginApiResponse {
  status: "PENDING_VERIFICATION";
  message: string;
  user: {
    id: string;
    email: string;
  };
}

export interface LoginScreenProps {
  onNavigateToOtp: (contact?: string) => void;
  onNavigateToRegister: () => void;
  onNavigateBack: () => void;
}
