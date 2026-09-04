import { apiClient } from "./api";
import {
  RegisterApiPayload,
  RegisterApiResponse,
  LoginApiPayload,
  LoginApiResponse,
  ForgotPasswordApiPayload,
  ForgotPasswordApiResponse,
  VerifyResetCodeApiPayload,
  VerifyResetCodeApiResponse,
  ResetPasswordApiPayload,
  ResetPasswordApiResponse,
} from "../types/auth";
import {
  OtpVerifyApiPayload,
  OtpVerifyApiResponse,
  OtpResendApiPayload,
  OtpResendApiResponse,
} from "../types/otp";

export const authService = {
  /**
   * Register a new user
   * POST /auth/register
   */
  async register(payload: RegisterApiPayload): Promise<RegisterApiResponse> {
    return apiClient<RegisterApiResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Verify a 6-digit OTP code
   * POST /auth/verify-otp
   */
  async verifyOtp(payload: OtpVerifyApiPayload): Promise<OtpVerifyApiResponse> {
    return apiClient<OtpVerifyApiResponse>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Request a new OTP code to be sent
   * POST /auth/resend-otp
   */
  async resendOtp(payload: OtpResendApiPayload): Promise<OtpResendApiResponse> {
    return apiClient<OtpResendApiResponse>("/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Login with email/phone + password (sends OTP for verification)
   * POST /auth/login
   */
  async login(payload: LoginApiPayload): Promise<LoginApiResponse> {
    return apiClient<LoginApiResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Request a password reset code by email or phone
   * POST /auth/forgot-password
   */
  async forgotPassword(
    payload: ForgotPasswordApiPayload,
  ): Promise<ForgotPasswordApiResponse> {
    return apiClient<ForgotPasswordApiResponse>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Verify the password reset code
   * POST /auth/verify-reset-code
   */
  async verifyResetCode(
    payload: VerifyResetCodeApiPayload,
  ): Promise<VerifyResetCodeApiResponse> {
    return apiClient<VerifyResetCodeApiResponse>("/auth/verify-reset-code", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Set a new password using the temporal token
   * POST /auth/reset-password
   */
  async resetPassword(
    payload: ResetPasswordApiPayload,
  ): Promise<ResetPasswordApiResponse> {
    return apiClient<ResetPasswordApiResponse>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
