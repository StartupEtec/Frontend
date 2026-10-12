import { UserRole } from "./role";

export interface ProfileFormData {
  fullName: string;
  selfieUri: string | null;
  dniFrontUri: string | null;
  dniBackUri: string | null;
  dateOfBirth: string;
  dateOfBirthDate: Date | null;
}

export interface ProfileFormErrors {
  fullName?: string;
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
  hourly_rate?: number | null;
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

export type ProfileScreenProps = {
  role: UserRole;
  onProfileCompleted: () => void;
  onGoBack: () => void;
};
