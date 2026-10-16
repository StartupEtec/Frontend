import { useState, useCallback, useEffect } from "react";
import {
  profileService,
  toDisplayUri,
  toStoredUrl,
  isLocalUri,
} from "../services/profileService";
import { tokenStorage } from "../services/tokenStorage";
import { ApiError } from "../services/api";

/** Datos que muestra la pantalla "Editar Perfil". */
export interface EditProfileData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  /** Bio del perfil de trabajador (solo se usa si el rol activo es worker). */
  description: string;
  /** URI lista para <Image> (absolutizada) o null si no hay foto. */
  avatarUrl: string | null;
}

export type EditProfileStatus = "loading" | "success" | "error";

const EMPTY_DATA: EditProfileData = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  description: "",
  avatarUrl: null,
};

/**
 * El backend guarda un único `full_name` ("Nombre Apellido..."), así que
 * se separa en pantalla: la primera palabra es el nombre y el resto el
 * apellido (soporta apellidos compuestos).
 */
export function splitFullName(fullName: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export const useEditProfile = () => {
  const [data, setData] = useState<EditProfileData>(EMPTY_DATA);
  const [status, setStatus] = useState<EditProfileStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [descriptionSaving, setDescriptionSaving] = useState(false);

  const clearSaveError = useCallback(() => setSaveError(null), []);

  /** userId o error de sesión expirada (compartido por los guardados). */
  const requireUserId = useCallback(async (): Promise<string> => {
    const userId = await tokenStorage.getUserId();
    if (!userId) {
      throw new ApiError(
        "Sesión expirada. Volvé a iniciar sesión.",
        401,
        "SESSION_EXPIRED",
      );
    }
    return userId;
  }, []);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const userId = await requireUserId();

      // /users/me es la fuente principal (mail, teléfono y bio del trabajador).
      const privateProfile = await profileService.getPrivateProfile();

      // La identidad es un extra opcional (mejor nombre/foto); si falla, se
      // cae a lo que devuelve el perfil por rol.
      const identity = await profileService
        .getIdentity(userId)
        .catch(() => null);

      const worker = privateProfile.profile?.worker ?? null;
      const client = privateProfile.profile?.client ?? null;

      const fullName =
        identity?.full_name || worker?.full_name || client?.full_name || null;
      const avatarUrl =
        identity?.avatar_url ||
        worker?.avatar_url ||
        client?.avatar_url ||
        null;
      const { firstName, lastName } = splitFullName(fullName);

      setData({
        firstName,
        lastName,
        phone: privateProfile.phone || "",
        email: privateProfile.email || "",
        description: worker?.bio || "",
        avatarUrl: toDisplayUri(avatarUrl),
      });
      setStatus("success");
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No pudimos cargar tu perfil. Reintentá.",
      );
      setStatus("error");
    }
  }, [requireUserId]);

  /**
   * Guarda una foto nueva: sube el archivo local y persiste la URL en la
   * identidad (PATCH /users/:id/identity). Devuelve true si guardó bien.
   */
  const saveAvatar = useCallback(
    async (uri: string): Promise<boolean> => {
      setAvatarSaving(true);
      setSaveError(null);
      try {
        const userId = await requireUserId();
        const storedUrl = isLocalUri(uri)
          ? await profileService.uploadProfileImage(uri, "avatar")
          : toStoredUrl(uri);
        await profileService.upsertIdentity(userId, { avatar_url: storedUrl });
        setData((prev) => ({ ...prev, avatarUrl: toDisplayUri(storedUrl) }));
        return true;
      } catch (err: unknown) {
        setSaveError(
          err instanceof ApiError
            ? err.message
            : "No pudimos guardar la foto. Reintentá.",
        );
        return false;
      } finally {
        setAvatarSaving(false);
      }
    },
    [requireUserId],
  );

  /**
   * Guarda la descripción del trabajador (PATCH /users/:id/worker-profile).
   * Devuelve true si guardó bien.
   */
  const saveDescription = useCallback(
    async (bio: string): Promise<boolean> => {
      setDescriptionSaving(true);
      setSaveError(null);
      try {
        const userId = await requireUserId();
        await profileService.updateWorkerProfile(userId, { bio });
        setData((prev) => ({ ...prev, description: bio }));
        return true;
      } catch (err: unknown) {
        setSaveError(
          err instanceof ApiError
            ? err.message
            : "No pudimos guardar la descripción. Reintentá.",
        );
        return false;
      } finally {
        setDescriptionSaving(false);
      }
    },
    [requireUserId],
  );

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    status,
    error,
    reload: load,
    saveAvatar,
    saveDescription,
    avatarSaving,
    descriptionSaving,
    saveError,
    clearSaveError,
  };
};
