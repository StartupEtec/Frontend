import { apiClient } from "./api";
import { SwitchRolePayload, SwitchRoleResponse } from "../types/user";
import { PublicWorkerProfile } from "../types/worker";

export const userService = {
  /**
   * Perfil público de cualquier usuario (GET /users/:id, sin autenticación):
   * nombre, avatar, bio y rating promedio. Lo usa la ficha del trabajador
   * que se abre desde la búsqueda en mapa.
   */
  async getPublicProfile(userId: string): Promise<PublicWorkerProfile> {
    return apiClient<PublicWorkerProfile>(`/users/${userId}`, {
      method: "GET",
    });
  },

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
