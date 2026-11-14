import { renderHook, act } from "@testing-library/react-native";
import { useEditProfile, splitFullName } from "../../src/hooks/useEditProfile";
import { profileService } from "../../src/services/profileService";
import { tokenStorage } from "../../src/services/tokenStorage";
import { ApiError } from "../../src/services/api";
import { PrivateProfileResponse } from "../../src/types/profile";

jest.mock("../../src/services/profileService", () => ({
  profileService: {
    getPrivateProfile: jest.fn(),
    getIdentity: jest.fn(),
    uploadProfileImage: jest.fn(),
    upsertIdentity: jest.fn(),
    updateWorkerProfile: jest.fn(),
  },
  toDisplayUri: jest.requireActual("../../src/services/profileService")
    .toDisplayUri,
  toStoredUrl: jest.requireActual("../../src/services/profileService")
    .toStoredUrl,
  isLocalUri: jest.requireActual("../../src/services/profileService")
    .isLocalUri,
}));

jest.mock("../../src/services/tokenStorage", () => ({
  tokenStorage: {
    getUserId: jest.fn(),
  },
}));

const flush = () => act(async () => {});

const makePrivateProfile = (
  overrides: Partial<PrivateProfileResponse> = {},
): PrivateProfileResponse =>
  ({
    id: "user-123",
    email: "juan@example.com",
    phone: "+5491112345678",
    current_role: "worker",
    is_verified: true,
    verified_email: true,
    verified_phone: true,
    active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    average_rating: null,
    identity: null,
    profile: {
      client: {
        full_name: "Juan Pérez",
        avatar_url: "/uploads/client.jpg",
        bio: null,
      },
      worker: {
        full_name: "Juan Pérez",
        avatar_url: "/uploads/worker.jpg",
        bio: "Electricista matriculado",
      },
    },
    ...overrides,
  }) as PrivateProfileResponse;

describe("useEditProfile Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (tokenStorage.getUserId as jest.Mock).mockResolvedValue("user-123");
    (profileService.getPrivateProfile as jest.Mock).mockResolvedValue(
      makePrivateProfile(),
    );
    (profileService.getIdentity as jest.Mock).mockResolvedValue({
      full_name: "Juan Pérez",
      date_of_birth: "1990-03-15",
      avatar_url: "/uploads/profiles/selfie.jpg",
      dni_front_url: "/uploads/front.jpg",
      dni_back_url: "/uploads/back.jpg",
      is_complete: true,
    });
  });

  describe("splitFullName", () => {
    it("keeps the first word as name and the rest as surname", () => {
      expect(splitFullName("Juan Pérez Gómez")).toEqual({
        firstName: "Juan",
        lastName: "Pérez Gómez",
      });
    });

    it("handles single word, empty and null", () => {
      expect(splitFullName("Ana")).toEqual({ firstName: "Ana", lastName: "" });
      expect(splitFullName("")).toEqual({ firstName: "", lastName: "" });
      expect(splitFullName(null)).toEqual({ firstName: "", lastName: "" });
    });

    it("collapses extra whitespace", () => {
      expect(splitFullName("  Juan   Pérez  ")).toEqual({
        firstName: "Juan",
        lastName: "Pérez",
      });
    });
  });

  it("loads and maps data from /users/me + identity", async () => {
    const { result } = renderHook(() => useEditProfile());
    await flush();

    expect(result.current.status).toBe("success");
    expect(result.current.data.firstName).toBe("Juan");
    expect(result.current.data.lastName).toBe("Pérez");
    expect(result.current.data.phone).toBe("+5491112345678");
    expect(result.current.data.email).toBe("juan@example.com");
    expect(result.current.data.description).toBe("Electricista matriculado");
    expect(result.current.data.avatarUrl).toContain(
      "/uploads/profiles/selfie.jpg",
    );
    expect(profileService.getPrivateProfile).toHaveBeenCalledTimes(1);
  });

  it("falls back to the role profile name/avatar when identity fails", async () => {
    (profileService.getIdentity as jest.Mock).mockRejectedValueOnce(
      new ApiError("sin identidad", 500, "SERVER_ERROR"),
    );

    const { result } = renderHook(() => useEditProfile());
    await flush();

    expect(result.current.status).toBe("success");
    expect(result.current.data.firstName).toBe("Juan");
    expect(result.current.data.avatarUrl).toContain("/uploads/worker.jpg");
  });

  it("uses client profile data when there is no worker profile", async () => {
    (profileService.getPrivateProfile as jest.Mock).mockResolvedValueOnce(
      makePrivateProfile({
        profile: {
          client: {
            full_name: "Maria Lopez",
            avatar_url: "/uploads/client.jpg",
            bio: null,
          },
          worker: null,
        },
      }),
    );
    (profileService.getIdentity as jest.Mock).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useEditProfile());
    await flush();

    expect(result.current.data.firstName).toBe("Maria");
    expect(result.current.data.lastName).toBe("Lopez");
    expect(result.current.data.description).toBe("");
    expect(result.current.data.avatarUrl).toContain("/uploads/client.jpg");
  });

  it("shows the server error when /users/me fails", async () => {
    (profileService.getPrivateProfile as jest.Mock).mockRejectedValueOnce(
      new ApiError("Error de servidor", 500, "SERVER_ERROR"),
    );

    const { result } = renderHook(() => useEditProfile());
    await flush();

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Error de servidor");
  });

  it("shows a session error when there is no userId", async () => {
    (tokenStorage.getUserId as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useEditProfile());
    await flush();

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe(
      "Sesión expirada. Volvé a iniciar sesión.",
    );
    expect(profileService.getPrivateProfile).not.toHaveBeenCalled();
  });

  it("reload retries the fetch and recovers", async () => {
    (profileService.getPrivateProfile as jest.Mock)
      .mockRejectedValueOnce(new ApiError("boom", 500, "SERVER_ERROR"))
      .mockResolvedValueOnce(makePrivateProfile());

    const { result } = renderHook(() => useEditProfile());
    await flush();
    expect(result.current.status).toBe("error");

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.status).toBe("success");
    expect(result.current.data.email).toBe("juan@example.com");
    expect(profileService.getPrivateProfile).toHaveBeenCalledTimes(2);
  });

  describe("saveAvatar", () => {
    it("uploads a local image and persists it to the identity", async () => {
      (profileService.uploadProfileImage as jest.Mock).mockResolvedValue(
        "/uploads/profiles/new.jpg",
      );
      (profileService.upsertIdentity as jest.Mock).mockResolvedValue({
        message: "ok",
      });

      const { result } = renderHook(() => useEditProfile());
      await flush();

      let ok = false;
      await act(async () => {
        ok = await result.current.saveAvatar("file:///local/new.jpg");
      });

      expect(profileService.uploadProfileImage).toHaveBeenCalledWith(
        "file:///local/new.jpg",
        "avatar",
      );
      expect(profileService.upsertIdentity).toHaveBeenCalledWith("user-123", {
        avatar_url: "/uploads/profiles/new.jpg",
      });
      expect(ok).toBe(true);
      expect(result.current.avatarSaving).toBe(false);
      expect(result.current.data.avatarUrl).toContain(
        "/uploads/profiles/new.jpg",
      );
      expect(result.current.saveError).toBeNull();
    });

    it("surfaces an upload error", async () => {
      (profileService.uploadProfileImage as jest.Mock).mockRejectedValue(
        new ApiError("No se pudo subir", 500, "UPLOAD_ERROR"),
      );

      const { result } = renderHook(() => useEditProfile());
      await flush();

      let ok = true;
      await act(async () => {
        ok = await result.current.saveAvatar("file:///local/bad.jpg");
      });

      expect(ok).toBe(false);
      expect(result.current.saveError).toBe("No se pudo subir");
      expect(result.current.avatarSaving).toBe(false);
    });

    it("skips upload for an already-remote image", async () => {
      (profileService.upsertIdentity as jest.Mock).mockResolvedValue({
        message: "ok",
      });

      const { result } = renderHook(() => useEditProfile());
      await flush();

      await act(async () => {
        await result.current.saveAvatar(
          "http://10.0.2.2:3000/uploads/keep.jpg",
        );
      });

      expect(profileService.uploadProfileImage).not.toHaveBeenCalled();
      expect(profileService.upsertIdentity).toHaveBeenCalledWith("user-123", {
        avatar_url: "/uploads/keep.jpg",
      });
    });
  });

  describe("saveDescription", () => {
    it("patches the worker profile and updates local state", async () => {
      (profileService.updateWorkerProfile as jest.Mock).mockResolvedValue({
        message: "ok",
      });

      const { result } = renderHook(() => useEditProfile());
      await flush();

      let ok = false;
      await act(async () => {
        ok = await result.current.saveDescription("Plomero matriculado");
      });

      expect(profileService.updateWorkerProfile).toHaveBeenCalledWith(
        "user-123",
        { bio: "Plomero matriculado" },
      );
      expect(ok).toBe(true);
      expect(result.current.data.description).toBe("Plomero matriculado");
      expect(result.current.descriptionSaving).toBe(false);
    });

    it("surfaces an error when the update fails", async () => {
      (profileService.updateWorkerProfile as jest.Mock).mockRejectedValue(
        new ApiError("Perfil de trabajador no encontrado", 404, "NOT_FOUND"),
      );

      const { result } = renderHook(() => useEditProfile());
      await flush();

      let ok = true;
      await act(async () => {
        ok = await result.current.saveDescription("algo");
      });

      expect(ok).toBe(false);
      expect(result.current.saveError).toBe(
        "Perfil de trabajador no encontrado",
      );
      expect(result.current.descriptionSaving).toBe(false);
    });

    it("surfaces a session error when there is no userId", async () => {
      (tokenStorage.getUserId as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useEditProfile());
      await flush();

      let ok = true;
      await act(async () => {
        ok = await result.current.saveDescription("algo");
      });

      expect(ok).toBe(false);
      expect(result.current.saveError).toBe(
        "Sesión expirada. Volvé a iniciar sesión.",
      );
      expect(profileService.updateWorkerProfile).not.toHaveBeenCalled();
    });
  });

  it("clearSaveError resets the save error", async () => {
    (profileService.updateWorkerProfile as jest.Mock).mockRejectedValue(
      new ApiError("boom", 500, "SERVER_ERROR"),
    );

    const { result } = renderHook(() => useEditProfile());
    await flush();

    await act(async () => {
      await result.current.saveDescription("algo");
    });
    expect(result.current.saveError).toBe("boom");

    act(() => {
      result.current.clearSaveError();
    });
    expect(result.current.saveError).toBeNull();
  });

  describe("formulario de edición", () => {
    it("starts clean, with no changes to save", async () => {
      const { result } = renderHook(() => useEditProfile({ role: "client" }));
      await flush();

      expect(result.current.isDirty).toBe(false);
      expect(result.current.isValid).toBe(true);
      expect(result.current.canSave).toBe(false);
    });

    it("validates fields in real time", async () => {
      const { result } = renderHook(() => useEditProfile({ role: "client" }));
      await flush();

      act(() => {
        result.current.setField("firstName", "");
      });

      expect(result.current.errors.firstName).toBe("Ingresá tu nombre");
      expect(result.current.isValid).toBe(false);
      expect(result.current.canSave).toBe(false);

      act(() => {
        result.current.setField("firstName", "Juana");
      });

      expect(result.current.errors.firstName).toBeUndefined();
      expect(result.current.isDirty).toBe(true);
      expect(result.current.canSave).toBe(true);
    });

    it("requires a category for workers", async () => {
      const { result } = renderHook(() => useEditProfile({ role: "worker" }));
      await flush();

      // El perfil de prueba no tiene categoría.
      expect(result.current.errors.categoryIds).toBe(
        "Seleccioná al menos una categoría"
      );
      expect(result.current.canSave).toBe(false);

      act(() => {
        result.current.setField("categoryIds", ["cat-2"]);
      });

      expect(result.current.errors.categoryIds).toBeUndefined();
    });

    it("saves the full name through the identity endpoint", async () => {
      (profileService.upsertIdentity as jest.Mock).mockResolvedValue({
        message: "ok",
      });

      const { result } = renderHook(() => useEditProfile({ role: "client" }));
      await flush();

      act(() => {
        result.current.setField("firstName", "Juana");
        result.current.setField("lastName", "Gómez");
      });

      let ok = false;
      await act(async () => {
        ok = await result.current.save();
      });

      expect(ok).toBe(true);
      expect(profileService.upsertIdentity).toHaveBeenCalledWith("user-123", {
        full_name: "Juana Gómez",
      });
      expect(result.current.isDirty).toBe(false);
      expect(result.current.saveSuccess).toBe(true);
      expect(result.current.data.firstName).toBe("Juana");
    });

    it("saves bio and category for workers in a single PATCH", async () => {
      (profileService.updateWorkerProfile as jest.Mock).mockResolvedValue({
        message: "ok",
      });

      const { result } = renderHook(() => useEditProfile({ role: "worker" }));
      await flush();

      act(() => {
        result.current.setField("description", "Nueva bio");
        result.current.setField("categoryIds", ["cat-2"]);
      });

      let ok = false;
      await act(async () => {
        ok = await result.current.save();
      });

      expect(ok).toBe(true);
      expect(profileService.updateWorkerProfile).toHaveBeenCalledWith(
        "user-123",
        { bio: "Nueva bio", category_id: "cat-2" },
      );
      expect(result.current.data.description).toBe("Nueva bio");
      expect(result.current.data.categoryIds).toEqual(["cat-2"]);
    });

    it("does not call the API when there are validation errors", async () => {
      const { result } = renderHook(() => useEditProfile({ role: "worker" }));
      await flush();

      let ok = true;
      await act(async () => {
        ok = await result.current.save();
      });

      expect(ok).toBe(false);
      expect(profileService.upsertIdentity).not.toHaveBeenCalled();
      expect(profileService.updateWorkerProfile).not.toHaveBeenCalled();
      // Al intentar guardar se muestran todos los errores.
      expect(result.current.touched.categoryIds).toBe(true);
    });

    it("surfaces a server error and keeps the changes", async () => {
      (profileService.upsertIdentity as jest.Mock).mockRejectedValue(
        new ApiError("No se pudo guardar", 500, "SERVER_ERROR"),
      );

      const { result } = renderHook(() => useEditProfile({ role: "client" }));
      await flush();

      act(() => {
        result.current.setField("firstName", "Juana");
      });

      let ok = true;
      await act(async () => {
        ok = await result.current.save();
      });

      expect(ok).toBe(false);
      expect(result.current.saveError).toBe("No se pudo guardar");
      expect(result.current.isDirty).toBe(true);
      expect(result.current.saveSuccess).toBe(false);
    });

    it("resetForm discards the local changes", async () => {
      const { result } = renderHook(() => useEditProfile({ role: "client" }));
      await flush();

      act(() => {
        result.current.setField("firstName", "Juana");
      });
      expect(result.current.isDirty).toBe(true);

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.form.firstName).toBe("Juan");
      expect(result.current.isDirty).toBe(false);
      expect(result.current.touched.firstName).toBeUndefined();
    });
  });
});
