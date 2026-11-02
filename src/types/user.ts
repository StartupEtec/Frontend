import { UserRole } from './role';

export interface SwitchRolePayload {
  role: UserRole;
}

export interface SwitchRoleResponse {
  new_role: UserRole;
  previous_role: UserRole;
  accessToken: string;
  certification_pending?: boolean;
  timestamp: string;
}

/** Respuesta de GET /users/me (perfil privado del usuario autenticado). */
export interface MyProfileResponse {
  id: string;
  email: string;
  phone: string;
  current_role: UserRole;
  is_verified: boolean;
  verified_email: boolean;
  verified_phone: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  average_rating: string | null;
  identity: {
    full_name: string | null;
    date_of_birth: string | null;
    avatar_url: string | null;
    dni_front_url: string | null;
    dni_back_url: string | null;
  } | null;
  profile: {
    client: Record<string, unknown> | null;
    worker: Record<string, unknown> | null;
  };
}
