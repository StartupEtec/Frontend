import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { UserRole } from "../types/role";
import { useEditProfile, EditProfileData } from "../hooks/useEditProfile";
import { ProfileInfoRow } from "../components/profile/ProfileInfoRow";
import { AvatarEditor } from "../components/profile/AvatarEditor";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  roleAccent,
} from "../theme/tokens";

export interface EditProfileScreenProps {
  role: UserRole;
  onGoBack: () => void;
}

interface RowConfig {
  label: string;
  value: string;
  testID: string;
  onEdit?: () => void;
  editTestID?: string;
  editDisabled?: boolean;
}

/**
 * "Editar Perfil": muestra los datos del usuario.
 * - La foto de perfil es editable (cámara/galería).
 * - La descripción solo se muestra en modo trabajador y es editable.
 * - Nombre, Apellido, Teléfono y Mail permanecen solo lectura por ahora.
 */
export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({
  role,
  onGoBack,
}) => {
  const {
    data,
    status,
    error,
    reload,
    saveAvatar,
    saveDescription,
    avatarSaving,
    descriptionSaving,
    saveError,
    clearSaveError,
  } = useEditProfile();
  const accentColor = roleAccent(role);

  const [descModalVisible, setDescModalVisible] = useState(false);
  const [descDraft, setDescDraft] = useState("");

  const openDescriptionEditor = () => {
    setDescDraft(data.description || "");
    clearSaveError();
    setDescModalVisible(true);
  };

  const handleSaveDescription = async () => {
    const ok = await saveDescription(descDraft);
    if (ok) {
      setDescModalVisible(false);
    }
    // Si falla, el error aparece en el modal/banner según el caso.
  };

  const handleCancelDescription = () => {
    setDescModalVisible(false);
    clearSaveError();
  };

  const handleAvatarChange = (uri: string) => {
    void saveAvatar(uri);
  };

  const buildRows = (d: EditProfileData): RowConfig[] => {
    const rows: RowConfig[] = [
      {
        label: "Nombre",
        value: d.firstName,
        testID: "edit-profile-first-name",
      },
      {
        label: "Apellido",
        value: d.lastName,
        testID: "edit-profile-last-name",
      },
      { label: "Teléfono", value: d.phone, testID: "edit-profile-phone" },
      { label: "Mail", value: d.email, testID: "edit-profile-email" },
    ];
    if (role === "worker") {
      rows.push({
        label: "Descripción",
        value: d.description,
        testID: "edit-profile-description",
        onEdit: openDescriptionEditor,
        editTestID: "btn-edit-description",
        editDisabled: descriptionSaving,
      });
    }
    return rows;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onGoBack}
          style={styles.backButton}
          testID="btn-edit-profile-back"
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <Text style={[styles.backArrow, { color: accentColor }]}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Editar Perfil</Text>
        <View style={styles.headerSpacer} />
      </View>

      {status === "loading" && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.centerText}>Cargando perfil...</Text>
        </View>
      )}

      {status === "error" && (
        <View style={styles.center}>
          <Text style={styles.errorText} testID="edit-profile-error">
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: accentColor }]}
            onPress={() => {
              clearSaveError();
              void reload();
            }}
            testID="btn-edit-profile-retry"
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "success" && (
        <>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.avatarSection}>
              <AvatarEditor
                uri={data.avatarUrl}
                onChange={handleAvatarChange}
                saving={avatarSaving}
                accentColor={accentColor}
                size={160}
              />
            </View>

            {saveError && (
              <View style={styles.saveErrorBanner}>
                <Text
                  style={styles.saveErrorText}
                  testID="edit-profile-save-error"
                >
                  {saveError}
                </Text>
              </View>
            )}

            <View style={styles.card}>
              {buildRows(data).map((row, index, all) => (
                <ProfileInfoRow
                  key={row.testID}
                  label={row.label}
                  value={row.value}
                  testID={row.testID}
                  last={index === all.length - 1}
                  onEdit={row.onEdit}
                  editTestID={row.editTestID}
                  editDisabled={row.editDisabled}
                  accentColor={accentColor}
                />
              ))}
            </View>

            <Text style={styles.note}>
              Podés cambiar tu foto y tu descripción. Nombre, teléfono y mail
              todavía no se pueden editar.
            </Text>
          </ScrollView>

          <Modal visible={descModalVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Editar descripción</Text>
                <TextInput
                  style={styles.modalInput}
                  value={descDraft}
                  onChangeText={(t) => {
                    setDescDraft(t);
                    if (saveError) clearSaveError();
                  }}
                  placeholder="Contá qué servicios ofrecés..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  maxLength={500}
                  testID="input-description"
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{descDraft.length}/500</Text>
                {saveError && (
                  <Text
                    style={styles.modalError}
                    testID="edit-description-error"
                  >
                    {saveError}
                  </Text>
                )}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancel}
                    onPress={handleCancelDescription}
                    testID="btn-description-cancel"
                    accessibilityRole="button"
                  >
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalSave,
                      { backgroundColor: accentColor },
                      descriptionSaving && styles.modalSaveDisabled,
                    ]}
                    onPress={handleSaveDescription}
                    disabled={descriptionSaving}
                    testID="btn-description-save"
                    accessibilityRole="button"
                  >
                    {descriptionSaving ? (
                      <ActivityIndicator
                        color={colors.onPrimary}
                        size="small"
                      />
                    ) : (
                      <Text style={styles.modalSaveText}>Guardar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  backArrow: { fontSize: 24, fontWeight: "bold" },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSpacer: { width: 40 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  centerText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.md,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  retryButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  retryText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  saveErrorBanner: {
    backgroundColor: colors.errorContainer,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  saveErrorText: {
    color: colors.onErrorContainer,
    fontSize: typography.fontSizes.sm,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  note: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: "center",
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  modalInput: {
    minHeight: 120,
    maxHeight: 180,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
  },
  charCount: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    textAlign: "right",
    marginTop: spacing.xs,
  },
  modalError: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalCancel: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
  },
  modalSave: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    minWidth: 88,
    alignItems: "center",
  },
  modalSaveDisabled: {
    opacity: 0.7,
  },
  modalSaveText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default EditProfileScreen;
