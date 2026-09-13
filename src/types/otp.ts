/**
 * OTP Verification Types
 */

export interface OtpVerifyApiPayload {
  /** The 6-digit OTP code entered by the user */
  otp_code: string;
  /** Email that received the OTP (canonicalizado a E.164 en el backend) */
  email?: string;
  /** Phone that received the OTP */
  phone?: string;
}

export interface OtpVerifyApiResponse {
  message: string;
  /** JWT access token issued upon successful verification */
  accessToken?: string;
  /** JWT refresh token for obtaining new access tokens */
  refreshToken?: string;
  /** Authenticated user data returned by the backend */
  user?: {
    id: string;
    email: string;
    phone: string;
  };
}

export interface OtpResendApiPayload {
  /** Email que recibió el OTP */
  email?: string;
  /** Phone que recibió el OTP */
  phone?: string;
}

export interface OtpResendApiResponse {
  message: string;
}

export type OtpErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_OTP"
  | "EXPIRED_OTP"
  | "OTP_ATTEMPTS_EXCEEDED"
  | "TOO_MANY_REQUESTS";