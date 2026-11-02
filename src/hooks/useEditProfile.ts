import { useState, useCallback, useEffect, useMemo } from 'react';
import { profileService, toDisplayUri, toStoredUrl, isLocalUri } from '../services/profileService';
import { categoryService } from '../services/categoryService';
import { tokenStorage } from '../services/tokenStorage';
import { ApiError } from '../services/api';
import { UserRole } from '../types/role';
import { Category } from '../types/category';

/** Datos que muestra la pantalla "Editar Perfil". */
export interface EditProfileData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  /** Bio del perfil de trabajador (solo se usa si el rol activo es worker). */
  description: string;
  /** Categorías elegidas (solo trabajador). */
  categoryIds: string[];
  categoryNames: string[];
  /** URI lista para <Image> (absolutizada) o null si no hay foto. */
  avatarUrl: string | null;
}

/** Campos editables del formulario. */
export interface EditProfileForm {
  firstName: string;
  lastName: string;
  description: string;
  categoryIds: string[];
}

export type EditProfileField = keyof EditProfileForm;

export type EditProfileFieldErrors = Partial<Record<EditProfileField, string>>;

export type EditProfileStatus = 'loading' | 'success' | 'error';

const EMPTY_DATA: EditProfileData = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  description: '',
  categoryIds: [],
  categoryNames: [],
  avatarUrl: null,
};

/** Límites alineados con el backend (full_name 100, bio 500). */
const MAX_NAME_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 500;

/**
 * El backend guarda un único `full_name` ("Nombre Apellido..."), así que
 * se separa en pantalla: la primera palabra es el nombre y el resto el
 * apellido (soporta apellidos compuestos).
 */
export function splitFullName(fullName: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/** Une nombre y apellido en el `full_name` que espera el backend. */
export function joinFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

function toForm(data: EditProfileData): EditProfileForm {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    description: data.description,
    categoryIds: data.categoryIds,
  };
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

function validateField(
  field: EditProfileField,
  form: EditProfileForm,
  role: UserRole
): string | undefined {
  const value = form[field];

  switch (field) {
    case 'firstName': {
      const trimmed = (value as string).trim();
      if (!trimmed) return 'Ingresá tu nombre';
      if (trimmed.length > MAX_NAME_LENGTH) {
        return `Máximo ${MAX_NAME_LENGTH} caracteres`;
      }
      return undefined;
    }
    case 'lastName': {
      const trimmed = (value as string).trim();
      if (!trimmed) return 'Ingresá tu apellido';
      if (trimmed.length > MAX_NAME_LENGTH) {
        return `Máximo ${MAX_NAME_LENGTH} caracteres`;
      }
      return undefined;
    }
    case 'description': {
      if (value.length > MAX_DESCRIPTION_LENGTH) {
        return `Máximo ${MAX_DESCRIPTION_LENGTH} caracteres`;
      }
      return undefined;
    }
    case 'categoryIds': {
      if (role === 'worker' && value.length === 0) {
        return 'Seleccioná al menos una categoría';
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

function buildErrors(form: EditProfileForm, role: UserRole): EditProfileFieldErrors {
  return {
    firstName: validateField('firstName', form, role),
    lastName: validateField('lastName', form, role),
    description: validateField('description', form, role),
    categoryIds: validateField('categoryIds', form, role),
  };
}

export interface UseEditProfileOptions {
  /** Rol activo: define si se muestran/validan descripción y categorías. */
  role?: UserRole;
}

export const useEditProfile = ({ role = 'client' }: UseEditProfileOptions = {}) => {
  const [data, setData] = useState<EditProfileData>(EMPTY_DATA);
  const [form, setForm] = useState<EditProfileForm>(() => toForm(EMPTY_DATA));
  const [touched, setTouched] = useState<Partial<Record<EditProfileField, boolean>>>({});
  const [status, setStatus] = useState<EditProfileStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [descriptionSaving, setDescriptionSaving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const clearSaveError = useCallback(() => setSaveError(null), []);
  const clearSaveSuccess = useCallback(() => setSaveSuccess(false), []);

  const errors = useMemo(() => buildErrors(form, role), [form, role]);
  const isValid = useMemo(() => Object.values(errors).every((value) => !value), [errors]);
  const isDirty = useMemo(() => {
    const initial = toForm(data);
    return (Object.keys(initial) as EditProfileField[]).some(
      (field) => {
        if (field === 'categoryIds') {
          return !arraysEqual(initial[field], form[field]);
        }
        return initial[field] !== form[field];
      }
    );
  }, [data, form]);
  const canSave = isDirty && isValid && !isSaving;

  /** userId o error de sesión expirada (compartido por los guardados). */
  const requireUserId = useCallback(async (): Promise<string> => {
    const userId = await tokenStorage.getUserId();
    if (!userId) {
      throw new ApiError('Sesión expirada. Volvé a iniciar sesión.', 401, 'SESSION_EXPIRED');
    }
    return userId;
  }, []);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const list = await categoryService.listCategories();
      setCategories(list);
    } catch {
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    setSaveError(null);
    try {
      const userId = await requireUserId();

      // /users/me es la fuente principal (mail, teléfono y bio del trabajador).
      const [privateProfile] = await Promise.all([
        profileService.getPrivateProfile(),
        loadCategories(),
      ]);

      // La identidad es un extra opcional (mejor nombre/foto); si falla, se
      // cae a lo que devuelve el perfil por rol.
      const identity = await profileService.getIdentity(userId).catch(() => null);

      const worker = privateProfile.profile?.worker ?? null;
      const client = privateProfile.profile?.client ?? null;

      const fullName =
        privateProfile.full_name ||
        identity?.full_name ||
        worker?.full_name ||
        client?.full_name ||
        '';
      const avatarUrl = identity?.avatar_url || worker?.avatar_url || client?.avatar_url || null;
      const { firstName, lastName } = splitFullName(fullName);

      // Soportar múltiples categorías: el backend devuelve category_id (uno),
      // pero el frontend las maneja como un array.
      const categoryIds = worker?.category_id ? [worker.category_id] : [];
      const categoryNames = worker?.category_name ? [worker.category_name] : [];

      const nextData: EditProfileData = {
        firstName,
        lastName,
        phone: privateProfile.phone || '',
        email: privateProfile.email || '',
        description: worker?.bio || '',
        categoryIds,
        categoryNames,
        avatarUrl: toDisplayUri(avatarUrl),
      };

      setData(nextData);
      setForm(toForm(nextData));
      setTouched({});
      setStatus('success');
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cargar tu perfil. Reintentá.');
      setStatus('error');
    }
  }, [requireUserId, loadCategories]);

  /** Actualiza un campo y lo marca como tocado (validación en tiempo real). */
  const setField = useCallback((field: EditProfileField, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    setSaveSuccess(false);
    setSaveError(null);
  }, []);

  /** Marca un campo como tocado sin modificar su valor (al salir del input). */
  const markTouched = useCallback((field: EditProfileField) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  /** Agrega una categoría a la selección múltiple. */
  const addCategory = useCallback((categoryId: string, categoryName: string) => {
    setForm((prev) => {
      if (prev.categoryIds.includes(categoryId)) return prev;
      return {
        ...prev,
        categoryIds: [...prev.categoryIds, categoryId],
      };
    });
    setData((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds
        : [...prev.categoryIds, categoryId],
      categoryNames: prev.categoryNames.includes(categoryName)
        ? prev.categoryNames
        : [...prev.categoryNames, categoryName],
    }));
    setTouched((prev) => ({ ...prev, categoryIds: true }));
    setSaveSuccess(false);
    setSaveError(null);
  }, []);

  /** Quita una categoría de la selección múltiple. */
  const removeCategory = useCallback((categoryId: string) => {
    setForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.filter((id) => id !== categoryId),
    }));
    setData((prev) => {
      const nameToRemove = prev.categoryNames[prev.categoryIds.indexOf(categoryId)];
      return {
        ...prev,
        categoryIds: prev.categoryIds.filter((id) => id !== categoryId),
        categoryNames: prev.categoryNames.filter((name) => name !== nameToRemove),
      };
    });
    setTouched((prev) => ({ ...prev, categoryIds: true }));
    setSaveSuccess(false);
    setSaveError(null);
  }, []);

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
          ? await profileService.uploadProfileImage(uri, 'avatar')
          : toStoredUrl(uri);
        await profileService.upsertIdentity(userId, { avatar_url: storedUrl });
        setData((prev) => ({ ...prev, avatarUrl: toDisplayUri(storedUrl) }));
        return true;
      } catch (err: unknown) {
        setSaveError(
          err instanceof ApiError ? err.message : 'No pudimos guardar la foto. Reintentá.'
        );
        return false;
      } finally {
        setAvatarSaving(false);
      }
    },
    [requireUserId]
  );

  /**
   * Guarda la descripción del trabajador (PATCH /users/:id/worker-profile).
   * Se mantiene para los flujos que la actualizan por separado.
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
          err instanceof ApiError ? err.message : 'No pudimos guardar la descripción. Reintentá.'
        );
        return false;
      } finally {
        setDescriptionSaving(false);
      }
    },
    [requireUserId]
  );

  /**
   * Guarda todos los cambios del formulario (nombre, apellido, descripción y
   * categorías). Devuelve true si todo salió bien.
   */
  const save = useCallback(async (): Promise<boolean> => {
    if (!isValid) {
      // Mostrar todos los errores al intentar guardar.
      setTouched({
        firstName: true,
        lastName: true,
        description: true,
        categoryIds: true,
      });
      return false;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const userId = await requireUserId();
      const fullName = joinFullName(form.firstName, form.lastName);
      const nameChanged = form.firstName !== data.firstName || form.lastName !== data.lastName;
      const bioChanged = form.description !== data.description;
      const categoryChanged = !arraysEqual(form.categoryIds, data.categoryIds);

      if (nameChanged) {
        await profileService.upsertIdentity(userId, { full_name: fullName });
      }

      if (role === 'worker' && (bioChanged || categoryChanged)) {
        await profileService.updateWorkerProfile(userId, {
          bio: form.description,
          // El backend actualmente acepta una sola categoría; se envía la primera
          // seleccionada. El frontend las maneja como array para futuras mejoras.
          category_id: form.categoryIds[0] || null,
        });
      }

      const categoryNames = form.categoryIds.map((id) => {
        const cat = categories.find((c) => c.id === id);
        return cat ? cat.name : '';
      });
      setData((prev) => ({
        ...prev,
        firstName: form.firstName,
        lastName: form.lastName,
        description: role === 'worker' ? form.description : prev.description,
        categoryIds: role === 'worker' ? form.categoryIds : prev.categoryIds,
        categoryNames: role === 'worker' ? categoryNames : prev.categoryNames,
      }));
      setTouched({});
      setSaveSuccess(true);
      return true;
    } catch (err: unknown) {
      setSaveError(
        err instanceof ApiError ? err.message : 'No pudimos guardar los cambios. Reintentá.'
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isValid, requireUserId, form, data, role, categories]);

  /**
   * Descarta los cambios locales y vuelve a los últimos datos guardados.
   * Se usa al salir de la pantalla con la flecha de volver.
   */
  const resetForm = useCallback(() => {
    setForm(toForm(data));
    setTouched({});
    setSaveError(null);
    setSaveSuccess(false);
  }, [data]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    form,
    errors,
    touched,
    status,
    error,
    reload: load,
    saveAvatar,
    saveDescription,
    save,
    resetForm,
    setField,
    markTouched,
    addCategory,
    removeCategory,
    avatarSaving,
    descriptionSaving,
    isSaving,
    isDirty,
    isValid,
    canSave,
    saveSuccess,
    clearSaveSuccess,
    saveError,
    clearSaveError,
    categories,
    categoriesLoading,
  };
};
