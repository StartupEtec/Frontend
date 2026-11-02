import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { UserRole } from '../types/role';
import { useEditProfile, EditProfileField } from '../hooks/useEditProfile';
import { ProfileInfoRow } from '../components/profile/ProfileInfoRow';
import { AvatarEditor } from '../components/profile/AvatarEditor';
import { SuccessToast } from '../components/SuccessToast';
import { colors, spacing, borderRadius, typography, shadows, roleAccent } from '../theme/tokens';

export interface EditProfileScreenProps {
  role: UserRole;
  onGoBack: () => void;
}

const MAX_DESCRIPTION_LENGTH = 500;

/**
 * "Editar Perfil".
 * - Foto editable (cámara/galería) con compresión y máximo de 5 MB.
 * - Nombre y apellido: solo lectura (se corroboran con la foto del DNI).
 * - Descripción: editable con auto-ajuste de altura y contador de caracteres.
 * - Categorías: selección múltiple con agregar/quitar.
 * - Teléfono y mail son solo lectura (cambiarlos requiere verificación OTP).
 * - Un único botón "Guardar cambios"; la flecha de volver descarta lo no
 *   guardado.
 */
export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({
  role,
  onGoBack,
}) => {
  const {
    data,
    form,
    errors,
    touched,
    status,
    error,
    reload,
    saveAvatar,
    save,
    resetForm,
    setField,
    markTouched,
    addCategory,
    removeCategory,
    avatarSaving,
    isSaving,
    canSave,
    saveSuccess,
    clearSaveSuccess,
    saveError,
    clearSaveError,
    categories,
    categoriesLoading,
  } = useEditProfile({ role });
  const accentColor = roleAccent(role);

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  /** Altura dinámica del TextInput de descripción para auto-ajuste. */
  const [descriptionHeight, setDescriptionHeight] = useState(100);

  const handleAvatarChange = (uri: string) => {
    void saveAvatar(uri);
  };

  const handleGoBack = () => {
    // La flecha descarta los cambios no guardados al navegar de vuelta.
    resetForm();
    onGoBack();
  };

  const handleSave = async () => {
    await save();
  };

  const isDescriptionAtLimit = form.description.length >= MAX_DESCRIPTION_LENGTH;

  const renderField = (
    field: EditProfileField,
    label: string,
    options: {
      placeholder?: string;
      multiline?: boolean;
      maxLength?: number;
      keyboardType?: 'default' | 'email-address';
      editable?: boolean;
    } = {}
  ) => {
    const showError = touched[field] && errors[field];
    const isMultiline = options.multiline ?? false;
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
          style={[
            styles.input,
            isMultiline && styles.inputMultiline,
            showError && styles.inputError,
            field === 'description' && isDescriptionAtLimit && styles.inputError,
          ]}
          value={String(form[field])}
          onChangeText={(value) => setField(field, value)}
          onBlur={() => markTouched(field)}
          placeholder={options.placeholder}
          placeholderTextColor={colors.textMuted}
          multiline={isMultiline}
          numberOfLines={isMultiline ? undefined : 1}
          maxLength={options.maxLength}
          keyboardType={options.keyboardType ?? 'default'}
          textAlignVertical={isMultiline ? 'top' : 'center'}
          editable={options.editable ?? true}
          testID={`input-${field}`}
          accessibilityLabel={label}
          onContentSizeChange={
            isMultiline
              ? ({ nativeEvent }: { nativeEvent: { contentSize: { height: number } } }) =>
                  setDescriptionHeight(nativeEvent.contentSize.height)
              : undefined
          }
        />
        {isMultiline && (
          <Text
            style={[
              styles.charCount,
              isDescriptionAtLimit && styles.charCountAtLimit,
            ]}
          >
            {form.description.length}/{MAX_DESCRIPTION_LENGTH}
          </Text>
        )}
        {showError && (
          <Text style={styles.fieldError} testID={`error-${field}`}>
            {errors[field]}
          </Text>
        )}
      </View>
    );
  };

  const selectedCategoryNames = form.categoryIds
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter(Boolean);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.backButton}
          testID="btn-edit-profile-back"
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <Feather name="arrow-left" size={24} color={accentColor} />
        </TouchableOpacity>
        <Text style={styles.title}>Editar Perfil</Text>
        <View style={styles.headerSpacer} />
      </View>

      {status === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.centerText}>Cargando perfil...</Text>
        </View>
      )}

      {status === 'error' && (
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

      {status === 'success' && (
        <>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
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
                  <Text style={styles.saveErrorText} testID="edit-profile-save-error">
                    {saveError}
                  </Text>
                </View>
              )}

              <View style={styles.card}>
                {/* Nombre y apellido: solo lectura, se corroboran con el DNI. */}
                <ProfileInfoRow
                  label="Nombre"
                  value={data.firstName}
                  testID="edit-profile-first-name"
                  last={false}
                  accentColor={accentColor}
                />
                <ProfileInfoRow
                  label="Apellido"
                  value={data.lastName}
                  testID="edit-profile-last-name"
                  last
                  accentColor={accentColor}
                />
              </View>

              <View style={styles.card}>
                <ProfileInfoRow
                  label="Teléfono"
                  value={data.phone}
                  testID="edit-profile-phone"
                  last={false}
                  accentColor={accentColor}
                />
                <ProfileInfoRow
                  label="Mail"
                  value={data.email}
                  testID="edit-profile-email"
                  last
                  accentColor={accentColor}
                />
              </View>
              <Text style={styles.note}>
                Para cambiar tu teléfono o mail tenés que verificarlos con un código.
              </Text>

              {role === 'worker' && (
                <View style={styles.card}>
                  {renderField('description', 'Descripción', {
                    placeholder: 'Contá qué servicios ofrecés...',
                    multiline: true,
                    maxLength: MAX_DESCRIPTION_LENGTH,
                  })}

                  <View style={styles.categoriesContainer}>
                    <Text style={styles.fieldLabel}>Categorías</Text>
                    <View style={styles.chipsWrapper}>
                      {form.categoryIds.map((categoryId) => {
                        const category = categories.find((c) => c.id === categoryId);
                        if (!category) return null;
                        return (
                          <TouchableOpacity
                            key={categoryId}
                            style={styles.chip}
                            onPress={() => removeCategory(categoryId)}
                            testID={`chip-category-${categoryId}`}
                            accessibilityRole="button"
                            accessibilityLabel={`Quitar categoría ${category.name}`}
                          >
                            <Text style={styles.chipText}>{category.name}</Text>
                            <Feather
                              name="x"
                              size={14}
                              color={colors.textSecondary}
                              style={styles.chipX}
                              accessible={false}
                            />
                          </TouchableOpacity>
                        );
                      })}
                      {form.categoryIds.length > 0 && (
                        <TouchableOpacity
                          style={styles.chip}
                          onPress={() => setCategoryModalVisible(true)}
                          testID="btn-add-category-chip"
                          accessibilityRole="button"
                          accessibilityLabel="Agregar categoría"
                        >
                          <Text style={styles.chipText}>+ Agregar</Text>
                        </TouchableOpacity>
                      )}
                      {form.categoryIds.length === 0 && (
                        <TouchableOpacity
                          style={styles.chip}
                          onPress={() => setCategoryModalVisible(true)}
                          testID="btn-add-category-chip"
                          accessibilityRole="button"
                          accessibilityLabel="Agregar categoría"
                        >
                          <Text style={styles.chipPlaceholderText}>
                            Agregar categoría
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {touched.categoryIds && errors.categoryIds ? (
                      <Text style={styles.fieldError} testID="error-categoryIds">
                        {errors.categoryIds}
                      </Text>
                    ) : null}
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: accentColor },
                  !canSave && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!canSave}
                testID="btn-edit-profile-save"
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSave }}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar cambios</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>

          <SuccessToast
            visible={saveSuccess}
            message="¡Cambios guardados!"
            onFinish={clearSaveSuccess}
            testID="edit-profile-save-toast"
          />

          <Modal visible={categoryModalVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Elegí categorías</Text>
                {categoriesLoading ? (
                  <ActivityIndicator color={accentColor} />
                ) : (
                  <FlatList
                    data={categories}
                    keyExtractor={(item) => item.id}
                    style={styles.categoryList}
                    renderItem={({ item }) => {
                      const isSelected = form.categoryIds.includes(item.id);
                      return (
                        <TouchableOpacity
                          style={[
                            styles.categoryOption,
                            isSelected && styles.categoryOptionSelected,
                          ]}
                          onPress={() => {
                            if (isSelected) {
                              removeCategory(item.id);
                            } else {
                              addCategory(item.id, item.name);
                            }
                          }}
                          testID={`category-option-${item.id}`}
                          accessibilityRole="button"
                        >
                          <Text style={styles.categoryOptionText}>
                            {item.name}
                          </Text>
                          {isSelected && (
                            <Feather
                              name="check"
                              size={18}
                              color={accentColor}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    }}
                    ListEmptyComponent={
                      <Text style={styles.emptyCategories}>
                        No hay categorías disponibles.
                      </Text>
                    }
                  />
                )}
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setCategoryModalVisible(false)}
                  testID="btn-category-cancel"
                  accessibilityRole="button"
                >
                  <Text style={styles.modalCloseText}>Listo</Text>
                </TouchableOpacity>
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
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: { width: 40 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
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
    alignItems: 'center',
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
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  field: {
    marginVertical: spacing.sm,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.error,
  },
  fieldError: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
  },
  charCount: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  charCountAtLimit: {
    color: colors.error,
  },
  categoriesContainer: {
    marginVertical: spacing.sm,
  },
  chipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    marginRight: spacing.xs,
  },
  chipX: {
    marginLeft: spacing.xs,
  },
  chipPlaceholderText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.md,
  },
  note: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  saveButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 52,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: 'center',
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
    textAlign: 'center',
  },
  categoryList: {
    maxHeight: 360,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryOptionSelected: {
    backgroundColor: colors.primaryFixed,
  },
  categoryOptionText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
  },
  emptyCategories: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  modalClose: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  modalCloseText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
  },
});

export default EditProfileScreen;
