import { useState, useCallback, useEffect, useRef } from "react";
import { UserRole } from "../types/role";
import { userService } from "../services/userService";
import { tokenStorage } from "../services/tokenStorage";
import { ApiError } from "../services/api";

/** Segundos del aviso naranja antes de cambiar igual de modo. */
export const CERTIFICATION_COUNTDOWN_SECONDS = 3;

interface UseRoleSwitchReturn {
  isSubmitting: boolean;
  error: string | null;
  warning: string | null;
  countdown: number;
  handleSwitchRole: (newRole: UserRole) => Promise<void>;
  clearError: () => void;
  clearWarning: () => void;
}

export const useRoleSwitch = (
  currentRole: UserRole,
  onRoleChanged: (newRole: UserRole, newToken: string) => void,
): UseRoleSwitchReturn => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef = useRef<{ newRole: UserRole; newToken: string } | null>(
    null,
  );

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
  }, []);

  useEffect(() => stopTimer, [stopTimer]);

  const finishSwitch = useCallback(async () => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    setCountdown(0);
    if (!pending) {
      setIsSubmitting(false);
      return;
    }
    await tokenStorage.setAccessToken(pending.newToken);
    setIsSubmitting(false);
    onRoleChanged(pending.newRole, pending.newToken);
  }, [onRoleChanged]);

  const handleSwitchRole = useCallback(
    async (newRole: UserRole) => {
      if (newRole === currentRole) return;

      setError(null);
      setCountdown(0);
      stopTimer();
      setIsSubmitting(true);

      try {
        const userId = await tokenStorage.getUserId();
        if (!userId) {
          setError("No se encontró el usuario. Iniciá sesión de nuevo.");
          setIsSubmitting(false);
          return;
        }

        const result = await userService.switchRole(userId, {
          role: newRole,
        });

        if (result.certification_pending) {
          // Aviso temporal (naranja): el modo cambia igual al terminar el
          // temporizador.
          pendingRef.current = {
            newRole: result.new_role,
            newToken: result.accessToken,
          };
          setCountdown(CERTIFICATION_COUNTDOWN_SECONDS);
          timerRef.current = setInterval(() => {
            setCountdown((c) => {
              if (c <= 1) {
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }
                void finishSwitch();
                return 0;
              }
              return c - 1;
            });
          }, 1000);
          return;
        }

        await tokenStorage.setAccessToken(result.accessToken);
        setIsSubmitting(false);
        onRoleChanged(result.new_role, result.accessToken);
      } catch (err: unknown) {
        // SAME_ROLE: el backend ya está en ese rol. La UI había quedado
        // desincronizada (típicamente una selección inicial de rol que nunca
        // se persistió en el servidor). En vez de bloquear con un popup falso
        // ("Ya estás en ese rol"), se aplica el cambio localmente y se reusa el
        // token actual, para que lo que muestra la app coincida con el backend.
        if (err instanceof ApiError && err.errorCode === "SAME_ROLE") {
          const currentToken = await tokenStorage.getAccessToken();
          if (currentToken) {
            setIsSubmitting(false);
            onRoleChanged(newRole, currentToken);
            return;
          }
        }

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
          setError(
            "Error de conexión. Verificá tu internet e intentá de nuevo.",
          );
        }
        setIsSubmitting(false);
      }
    },
    [currentRole, onRoleChanged, stopTimer, finishSwitch],
  );

  const clearError = useCallback(() => setError(null), []);

  const clearWarning = useCallback(() => {
    stopTimer();
    setCountdown(0);
    setIsSubmitting(false);
  }, [stopTimer]);

  const baseWarning =
    "Tu perfil de trabajador aún no está aprobado por el equipo";

  return {
    isSubmitting,
    error,
    warning: countdown > 0 ? `${baseWarning} (Cambiando ${countdown}…)` : null,
    countdown,
    handleSwitchRole,
    clearError,
    clearWarning,
  };
};
