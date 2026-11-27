import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { UserRole } from '../types/role';
import { useEditProfile } from '../hooks/useEditProfile';
import { AvatarEditor } from '../components/profile/AvatarEditor';
import { ProfileInfoRow } from '../components/profile/ProfileInfoRow';
import { SuccessToast } from '../components/SuccessToast';
import {
  BaseField,
  PrimaryButton,
  ErrorBanner,
  Chip,
  BaseModal,
} from '../components/base';
import { colors, spacing, borderRadius, typography, shadows, roleAccent } from '../theme/tokens';

const MAX_DESCRIPTION_LENGTH = 500;

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ role, onGoBack }) => {
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
  const [_descriptionHeight, setDescriptionHeight] = useState(100);

  const handleAvatarChange = (uri: string) => {
    void saveAvatar(uri);
  };

  const handleGoBack = () => {
    resetForm();
    onGoBack();
  };

  const handleSave = async () => {
    await save();
  };

  const isDescriptionAtLimit = form.description.length >= MAX_DESCRIPTION_LENGTH;

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
          <Feather name="arrow-left" size={24} color={accentColor} accessible={false} />
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
          <ErrorBanner message={error || 'Error cargando el perfil'} testID="edit-profile-error" />
          <PrimaryButton
            title="Reintentar"
            onPress={() => {
              clearSaveError();
              void reload();
            }}
            accentColor={accentColor}
            testID="btn-edit-profile-retry"
          />
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
              <ErrorBanner message={saveError} testID="edit-profile-save-error" />
            )}

            <View style={styles.card}>
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
              <Text style={styles.note}>
                Para cambiar tu teléfono o mail tenés que verificarlos con un código.
              </Text>
            </View>

            {role === 'worker' && (
              <View style={styles.card}>
                <BaseField
                  label="Descripción"
                  value={form.description}
                  onChangeText={(value) => setField('description', value)}
                  onBlur={() => markTouched('description')}
                  error={touched.description ? errors.description : undefined}
                  placeholder="Contá qué servicios ofrecés..."
                  multiline
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  testID="input-description"
                  errorTestID="error-description"
                  required
                  accentColor={accentColor}
                />
                {isDescriptionAtLimit && (
                  <Text style={styles.charCountAtLimit}>
                    {form.description.length}/{MAX_DESCRIPTION_LENGTH}
                  </Text>
                )}

                <View style={styles.categoriesContainer}>
                  <Text style={styles.fieldLabel}>Categorías</Text>
                  <View style={styles.chipsWrapper}>
                    {form.categoryIds.map((categoryId) => {
                      const category = categories.find((c) => c.id === categoryId);
                      if (!category) return null;
                      return (
                        <Chip
                          key={categoryId}
                          label={category.name}
                          backgroundColor={colors.primaryFixedDim}
                          textColor={colors.primary}
                          testID={`chip-category-${categoryId}`}
                        />
                      );
                    })}
                    <TouchableOpacity
                      style={styles.addChip}
                      onPress={() => setCategoryModalVisible(true)}
                      testID="btn-add-category-chip"
                      accessibilityRole="button"
                      accessibilityLabel="Agregar categoría"
                    >
                      <Text style={styles.addChipText}>+ Agregar categoría</Text>
                    </TouchableOpacity>
                  </View>
                  {touched.categoryIds && errors.categoryIds ? (
                    <Text style={styles.fieldError} testID="error-categoryIds">
                      {errors.categoryIds}
                    </Text>
                  ) : null}
                </View>
              </View>
            )}

            <PrimaryButton
              title={isSaving ? 'Guardando...' : 'Guardar cambios'}
              onPress={handleSave}
              disabled={!canSave}
              loading={isSaving}
              accentColor={accentColor}
              testID="btn-edit-profile-save"
            />
          </ScrollView>
        </KeyboardAvoidingView>

        <SuccessToast
          visible={saveSuccess}
          message="¡Cambios guardados!"
          onFinish={clearSaveSuccess}
          testID="edit-profile-save-toast"
        />

        <BaseModal
          visible={categoryModalVisible}
          onRequestClose={() => setCategoryModalVisible(false)}
          testID="category-modal"
        >
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
                      <Text style={styles.categoryOptionText}>{item.name}</Text>
                      {isSelected && (
                        <Feather name="check" size={18} color={accentColor} />
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.emptyCategories}>No hay categorías disponibles.</Text>
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
        </BaseModal>
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  note: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  charCountAtLimit: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  categoriesContainer: {
    marginVertical: spacing.sm,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  fieldError: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
  },
  chipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryFixedDim,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  addChipText: {
    color: colors.primary,
    fontSize: typography.fontSizes.md,
  },
  modalCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.card,
    maxHeight: '90%',
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
