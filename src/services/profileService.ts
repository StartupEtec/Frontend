import { apiClient } from "./api";
import {
  UpdateProfilePayload,
  CreateClientProfilePayload,
  CreateWorkerProfilePayload,
  ProfileUpdateApiResponse,
} from "../types/profile";

export const profileService = {
  async updateProfile(
    userId: string,
    data: UpdateProfilePayload,
  ): Promise<ProfileUpdateApiResponse> {
    return apiClient<ProfileUpdateApiResponse>(`/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async createClientProfile(
    userId: string,
    data: CreateClientProfilePayload,
  ): Promise<ProfileUpdateApiResponse> {
    return apiClient<ProfileUpdateApiResponse>(
      `/users/${userId}/client-profile`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },

  async createWorkerProfile(
    userId: string,
    data: CreateWorkerProfilePayload,
  ): Promise<ProfileUpdateApiResponse> {
    return apiClient<ProfileUpdateApiResponse>(
      `/users/${userId}/worker-profile`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },
};
