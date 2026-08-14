/**
 * OTP Verification Types
 */

export interface OtpVerifyApiPayload {
  /** The 6-digit OTP code entered by the user */
  code: string;
  /** Email or phone that received the OTP */
  contact: string;
}

export interface OtpVerifyApiResponse {
  success: boolean;
  message: string;
  /** JWT access token issued upon successful verification */
  accessToken?: string;
}

export interface OtpResendApiPayload {
  contact: string;
}

export interface OtpResendApiResponse {
  success: boolean;
  message: string;
}

export type OtpErrorCode =
  | 'INVALID_CODE'
  | 'CODE_EXPIRED'
  | 'MAX_ATTEMPTS_EXCEEDED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR';
