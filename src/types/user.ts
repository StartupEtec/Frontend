import { UserRole } from "./role";

export interface SwitchRolePayload {
  role: UserRole;
}

export interface SwitchRoleResponse {
  new_role: UserRole;
  previous_role: UserRole;
  accessToken: string;
  timestamp: string;
}
