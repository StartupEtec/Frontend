import { apiClient } from "./api";
import { RegisterApiPayload, RegisterApiResponse } from "../types/auth";
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
};
