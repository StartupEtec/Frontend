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
}

export interface CreateClientProfilePayload {
  full_name: string;
  avatar_url?: string;
}

export interface CreateWorkerProfilePayload {
  full_name: string;
  category_id: string;
  description?: string;
  hourly_rate?: number;
  avatar_url?: string;
}

export interface ProfileUpdateApiResponse {
  message: string;
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
