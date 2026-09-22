import { useState, useCallback } from "react";
import { UserRole } from "../types/role";
import { userService } from "../services/userService";
import { tokenStorage } from "../services/tokenStorage";
import { ApiError } from "../services/api";

interface UseRoleSwitchReturn {
  isSubmitting: boolean;
  error: string | null;
  handleSwitchRole: (newRole: UserRole) => Promise<void>;
  clearError: () => void;
}

export const useRoleSwitch = (
  currentRole: UserRole,
  onRoleChanged: (newRole: UserRole, newToken: string) => void,
): UseRoleSwitchReturn => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSwitchRole = useCallback(
    async (newRole: UserRole) => {
      if (newRole === currentRole) return;

      setError(null);
      setIsSubmitting(true);

      try {
        const userId = await tokenStorage.getUserId();
        if (!userId) {
          setError("No se encontró el usuario. Iniciá sesión de nuevo.");
          return;
        }

        const result = await userService.switchRole(userId, {
          role: newRole,
        });

        await tokenStorage.setAccessToken(result.accessToken);
        onRoleChanged(result.new_role, result.accessToken);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          const messageMap: Record<string, string> = {
            MISSING_CLIENT_PROFILE:
              "Necesitás tener un perfil de cliente completado para cambiar de rol.",
            MISSING_WORKER_PROFILE:
              "Necesitás tener un perfil de trabajador completado para cambiar de rol.",
            WORKER_NOT_CERTIFIED:
              "Tu perfil de trabajador debe estar aprobado para activar el modo Trabajador.",
            SAME_ROLE: "Ya estás en ese rol.",
            USER_NOT_FOUND: "Usuario no encontrado.",
          };
          setError(
            messageMap[err.errorCode || ""] ||
              err.message ||
              "No se pudo cambiar el rol. Intentá de nuevo.",
          );
        } else {
          setError("Error de conexión. Verificá tu internet e intentá de nuevo.");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentRole, onRoleChanged],
  );

  const clearError = useCallback(() => setError(null), []);

  return { isSubmitting, error, handleSwitchRole, clearError };
};
