import { UserRole } from "./role";

export interface ProfileFormData {
  selfieUri: string | null;
  dniFrontUri: string | null;
  dniBackUri: string | null;
  dateOfBirth: string;
  dateOfBirthDate: Date | null;
}

export interface ProfileFormErrors {
  selfieUri?: string;
  dniFrontUri?: string;
  dniBackUri?: string;
  dateOfBirth?: string;
  general?: string;
}

export interface UpdateProfilePayload {
  full_name?: string;
  avatar_url?: string;
  bio?: string;
}

export interface ClientProfilePayload {
  full_name: string;
  date_of_birth: string;
  avatar_url: string;
  dni_front_url: string;
  dni_back_url: string;
  bio?: string;
}

export interface WorkerProfilePayload extends ClientProfilePayload {
  category_id?: string | null;
  availability_status?: "AVAILABLE" | "BUSY" | "OFFLINE";
}

export type CreateClientProfilePayload = ClientProfilePayload;

export type CreateWorkerProfilePayload = WorkerProfilePayload;

export type UpdateClientProfilePayload = Partial<ClientProfilePayload>;

export type UpdateWorkerProfilePayload = Partial<WorkerProfilePayload>;

export interface UploadImageApiResponse {
  message: string;
  url: string;
}

/**
 * Identidad única del usuario (vale para cliente y trabajador).
 * Solo identidad: nombre, fecha, foto y DNI. Sin campos por rol.
 */
export interface IdentityPayload {
  full_name: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  dni_front_url: string | null;
  dni_back_url: string | null;
  /** true solo cuando están los 5 campos (vale para ambos roles). */
  is_complete: boolean;
}

export type CreateIdentityPayload = IdentityPayload;

export type UpdateIdentityPayload = Partial<IdentityPayload>;

export interface IdentityApiResponse {
  message: string;
  profile?: IdentityPayload & { id?: string };
}

export interface ProfileUpdateApiResponse {
  message: string;
  profile?: unknown;
  user?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

/** Identidad incluida en GET /users/me (presente solo cuando está completa). */
export type PrivateIdentity = Omit<IdentityPayload, "is_complete">;

/** Perfil por rol (cliente o trabajador) tal como lo devuelve GET /users/me. */
export interface PrivateRoleProfile {
  id?: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  availability_status?: string | null;
  certification_status?: string | null;
}

/**
 * Respuesta de GET /users/me (perfil privado del usuario autenticado).
 * Es la fuente de mail, teléfono y descripción (bio) para "Editar Perfil".
 */
export interface PrivateProfileResponse {
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
  identity: PrivateIdentity | null;
  profile: {
    client: PrivateRoleProfile | null;
    worker: PrivateRoleProfile | null;
  };
}

export type ProfileScreenProps = {
  role: UserRole;
  onProfileCompleted: () => void;
  onGoBack: () => void;
};
