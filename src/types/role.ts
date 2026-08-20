/**
 * Role Selection Types
 */

export type UserRole = "client" | "worker";

export interface RoleCardData {
  role: UserRole;
  title: string;
  description: string;
  iconName: string;
  accentColor: string;
}

export interface RoleSelectionScreenProps {
  onRoleSelected: (role: UserRole) => void;
}

export interface RoleCardProps {
  role: UserRole;
  title: string;
  description: string;
  iconName: string;
  accentColor: string;
  onSelect: (role: UserRole) => void;
  testID?: string;
}
