import { useState, useCallback } from "react";
import { UserRole } from "../types/role";
import { useRoleContext } from "../context/RoleContext";

interface UseRoleSelectionReturn {
  selectedRole: UserRole | null;
  isSaving: boolean;
  error: string | null;
  handleSelectRole: (role: UserRole) => void;
  confirmSelection: () => Promise<void>;
}

export const useRoleSelection = (
  onRoleSelected: (role: UserRole) => void,
): UseRoleSelectionReturn => {
  const { setRole } = useRoleContext();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectRole = useCallback((role: UserRole) => {
    setSelectedRole(role);
    setError(null);
  }, []);

  const confirmSelection = useCallback(async () => {
    if (!selectedRole) return;

    setIsSaving(true);
    setError(null);

    try {
      await setRole(selectedRole);
      onRoleSelected(selectedRole);
    } catch {
      setError("No se pudo guardar tu selección. Intentá de nuevo.");
    } finally {
      setIsSaving(false);
    }
  }, [selectedRole, setRole, onRoleSelected]);

  return { selectedRole, isSaving, error, handleSelectRole, confirmSelection };
};
