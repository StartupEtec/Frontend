import { useState, useCallback, useEffect } from "react";
import { UserRole } from "../types/role";
import { ProfileFormData, ProfileFormErrors } from "../types/profile";
import {
  profileService,
  toDisplayUri,
  toStoredUrl,
  isLocalUri,
} from "../services/profileService";
import { tokenStorage } from "../services/tokenStorage";
import { ApiError } from "../services/api";

interface UseCompleteProfileOptions {
  /** Solo visual (color de acento). El guardado es único, sin bifurcar por rol. */
  role: UserRole;
  onCompleted: () => void;
}

export type ProfileStatus = "idle" | "saving" | "success" | "error";

interface StoredIdentity {
  full_name?: string | null;
  date_of_birth?: string | null;
  avatar_url?: string | null;
  dni_front_url?: string | null;
  dni_back_url?: string | null;
  is_complete?: boolean;
}

/** Date -> "YYYY-MM-DD" con getters locales (sin corrimiento UTC). */
export function toIsoDateOnly(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** "YYYY-MM-DD" -> Date local (sin corrimiento UTC). */
function isoToLocalDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "YYYY-MM-DD" -> "DD/MM/YYYY" para mostrar. */
function isoToDisplay(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function isValidBirthDate(date: Date): boolean {
  if (Number.isNaN(date.getTime())) return false;
  const min = new Date(1900, 0, 1);
  const now = new Date();
  // Comparar solo fecha calendario (ignorar hora)
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const lo = new Date(min.getFullYear(), min.getMonth(), min.getDate());
  const hi = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return d >= lo && d <= hi;
}

export const useCompleteProfile = ({
  role: _role,
}: UseCompleteProfileOptions) => {
  void _role;
  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: "",
    selfieUri: null,
    dniFrontUri: null,
    dniBackUri: null,
    dateOfBirth: "",
    dateOfBirthDate: null,
  });
  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [status, setStatus] = useState<ProfileStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [isNew, setIsNew] = useState(true);

  // Precarga única: la identidad vale para ambos roles. Se precarga lo que
  // haya (aunque esté parcial por backfill) y solo se considera existente
  // cuando el backend marca is_complete.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const userId = await tokenStorage.getUserId();
        if (!userId) return;
        const identity =
          (await profileService.getIdentity(userId)) as StoredIdentity | null;
        if (cancelled || !identity) return;
        setFormData({
          fullName: identity.full_name ?? "",
          selfieUri: toDisplayUri(identity.avatar_url),
          dniFrontUri: toDisplayUri(identity.dni_front_url),
          dniBackUri: toDisplayUri(identity.dni_back_url),
          dateOfBirth: isoToDisplay(identity.date_of_birth),
          dateOfBirthDate: isoToLocalDate(identity.date_of_birth),
        });
        setIsNew(!identity.is_complete);
      } catch {
        // Offline: se queda en modo crear con el form vacío.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = useCallback(
    <K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
        general: undefined,
      }));
    },
    [],
  );

  const validate = useCallback((): boolean => {
    const newErrors: ProfileFormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "El nombre es obligatorio.";
    }

    if (!formData.selfieUri) {
      newErrors.selfieUri = "La foto de perfil es obligatoria.";
    }

    if (!formData.dniFrontUri) {
      newErrors.dniFrontUri =
        "La foto del frente del documento es obligatoria.";
    }

    if (!formData.dniBackUri) {
      newErrors.dniBackUri = "La foto del dorso del documento es obligatoria.";
    }

    if (!formData.dateOfBirthDate) {
      newErrors.dateOfBirth = "La fecha de nacimiento es obligatoria.";
    } else if (!isValidBirthDate(formData.dateOfBirthDate)) {
      newErrors.dateOfBirth = "La fecha de nacimiento no es válida.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    setStatus("saving");
    try {
      const userId = await tokenStorage.getUserId();
      if (!userId) {
        setErrors({ general: "Sesión expirada. Volvé a iniciar sesión." });
        setStatus("error");
        return;
      }

      const dateOfBirth = toIsoDateOnly(formData.dateOfBirthDate as Date);

      // Solo se suben las imágenes nuevas (file://, content://); las que
      // ya están guardadas (URLs remotas) se reutilizan tal cual.
      const resolveUrl = async (
        uri: string,
        prefix: string,
      ): Promise<string> => {
        if (isLocalUri(uri)) {
          return profileService.uploadProfileImage(uri, prefix);
        }
        return toStoredUrl(uri);
      };

      let avatarUrl: string;
      let dniFrontUrl: string;
      let dniBackUrl: string;
      try {
        avatarUrl = await resolveUrl(formData.selfieUri as string, "selfie");
        dniFrontUrl = await resolveUrl(
          formData.dniFrontUri as string,
          "dni-front",
        );
        dniBackUrl = await resolveUrl(
          formData.dniBackUri as string,
          "dni-back",
        );
      } catch (uploadErr: unknown) {
        // Mostrar siempre el mensaje real (ApiError o nativo) para no
        // esconder la causa detrás de un genérico.
        const msg =
          uploadErr instanceof ApiError
            ? uploadErr.message
            : uploadErr instanceof Error && uploadErr.message
              ? `No se pudo subir: ${uploadErr.message}`
              : "No se pudieron subir las imágenes. Reintentá.";
        setErrors({ general: msg });
        setStatus("error");
        return;
      }

      // Un solo guardado para ambos roles (el backend hace backfill a
      // client_profiles y worker_profiles).
      await profileService.upsertIdentity(userId, {
        full_name: formData.fullName.trim(),
        date_of_birth: dateOfBirth,
        avatar_url: avatarUrl,
        dni_front_url: dniFrontUrl,
        dni_back_url: dniBackUrl,
      });
      setIsNew(false);

      setStatus("success");
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar el perfil. Reintentá.";
      setErrors({ general: msg });
      setStatus("error");
    }
  }, [formData, validate]);

  return {
    formData,
    errors,
    status,
    loading,
    updateField,
    handleSave,
  };
};
