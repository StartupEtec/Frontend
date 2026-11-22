import { useCallback, useEffect, useState } from 'react';
import { PublicWorkerProfile } from '../types/worker';
import { userService } from '../services/userService';
import { ApiError } from '../services/api';

export type WorkerProfileStatus = 'loading' | 'success' | 'error';

/** Mensaje amigable según el error del perfil público. */
export function profileErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.statusCode === 404) return 'Trabajador no encontrado.';
    if (err.statusCode >= 500) return 'No pudimos cargar el perfil. Reintentá.';
    return err.message || 'No pudimos cargar el perfil. Reintentá.';
  }
  if (err instanceof Error && err.message) return err.message;
  return 'No pudimos cargar el perfil. Reintentá.';
}

/**
 * Carga el perfil público de un trabajador (GET /users/:id).
 *
 * La pantalla ya tiene los datos básicos de la búsqueda, así que este hook
 * solo aporta la bio, el avatar/nombre actualizados y el rating fresco.
 */
export const useWorkerProfile = (userId: string) => {
  const [profile, setProfile] = useState<PublicWorkerProfile | null>(null);
  const [status, setStatus] = useState<WorkerProfileStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    setNotFound(false);
    try {
      const result = await userService.getPublicProfile(userId);
      setProfile(result);
      setStatus('success');
    } catch (err: unknown) {
      setError(profileErrorMessage(err));
      setNotFound(err instanceof ApiError && err.statusCode === 404);
      setStatus('error');
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { profile, status, error, notFound, reload: load };
};

export default useWorkerProfile;
