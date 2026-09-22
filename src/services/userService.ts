import { apiClient } from "./api";
import { SwitchRolePayload, SwitchRoleResponse } from "../types/user";

export const userService = {
  async switchRole(
    userId: string,
    payload: SwitchRolePayload,
  ): Promise<SwitchRoleResponse> {
    return apiClient<SwitchRoleResponse>(`/users/${userId}/switch-role`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
