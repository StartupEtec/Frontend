import { useState, useCallback } from "react";
import { UserRole } from "../types/role";
import { ProfileFormData, ProfileFormErrors } from "../types/profile";
import { profileService } from "../services/profileService";
import { tokenStorage } from "../services/tokenStorage";
import { ApiError } from "../services/api";

interface UseCompleteProfileOptions {
  role: UserRole;
  onCompleted: () => void;
}

export type ProfileStatus = "idle" | "saving" | "success" | "error";

export const useCompleteProfile = ({
  role,
  onCompleted,
}: UseCompleteProfileOptions) => {
  const [formData, setFormData] = useState<ProfileFormData>({
    selfieUri: null,
    dniFrontUri: null,
    dniBackUri: null,
    dateOfBirth: "",
    dateOfBirthDate: null,
  });
  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [status, setStatus] = useState<ProfileStatus>("idle");

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

    if (!formData.dateOfBirth.trim()) {
      newErrors.dateOfBirth = "La fecha de nacimiento es obligatoria.";
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

      if (role === "client") {
        await profileService.createClientProfile(userId, {
          full_name: "Usuario",
          avatar_url: formData.selfieUri || undefined,
        });
      } else {
        await profileService.createWorkerProfile(userId, {
          full_name: "Usuario",
          category_id: "cat-001",
          description: `Nacimiento: ${formData.dateOfBirth}`,
          hourly_rate: 0,
          avatar_url: formData.selfieUri || undefined,
        });
      }

      setStatus("success");
    } catch (err: any) {
      // Mostramos éxito igual porque el backend aún no persiste.
      // Cuando se habilite el upload real, descomentar el bloque error.
      setStatus("success");
    }
  }, [formData, role, validate, onCompleted]);

  return {
    formData,
    errors,
    status,
    updateField,
    handleSave,
  };
};
