import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { UserRole } from '../types/role';
import { PrimaryButton, SecondaryButton } from '../components/base';
import { RoleSwitchModal } from '../components/RoleSwitchModal';
import { SuccessToast } from '../components/SuccessToast';
import { useRoleSwitch } from '../hooks/useRoleSwitch';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/tokens';

export interface ProfileScreenProps {
  currentRole: UserRole;
  onRoleChanged: (newRole: UserRole, newToken: string) => void;
  onGoBack: () => void;
  onEditProfile: () => void;
  onManageLocations: () => void;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentRole,
  onRoleChanged,
  onGoBack,
  onEditProfile,
  onManageLocations,
  onLogout,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const { isSubmitting, error, warning, handleSwitchRole, clearError, clearWarning } =
    useRoleSwitch(currentRole, (newRole, newToken) => {
      setModalVisible(false);
      onRoleChanged(newRole, newToken);
      const label = newRole === 'client' ? 'Cliente' : 'Trabajador';
      setSuccessMessage(`Cambiaste a rol de ${label}`);
      setShowSuccess(true);
    });

  useEffect(() => {
    if (modalVisible) {
      clearError();
    }
  }, [modalVisible, clearError]);

  const isClient = currentRole === 'client';
  const accentColor = isClient ? colors.clientAccent : colors.workerAccent;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onGoBack}
            style={styles.backButton}
            testID="btn-profile-back"
            accessibilityLabel="Volver"
            accessibilityRole="button"
          >
            <Feather name="arrow-left" size={24} color={accentColor} accessible={false} />
          </TouchableOpacity>
          <Text style={styles.title}>Mi Perfil</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarSection}>
            <View style={[styles.avatarCircle, { borderColor: accentColor }]}>
              <Feather
                name={isClient ? 'search' : 'tool'}
                size={36}
                color={accentColor}
                accessible={false}
              />
            </View>
            <Text style={styles.greeting}>Hola,</Text>
            <Text style={styles.currentRoleLabel}>
              Estás en modo{' '}
              <Text style={{ color: accentColor, fontWeight: '700' }}>
                {isClient ? 'Cliente' : 'Trabajador'}
              </Text>
            </Text>
          </View>

          <View style={styles.menuSection}>
            <TouchableOpacity
              style={[styles.menuItem, styles.roleMenuItem]}
              onPress={() => setModalVisible(true)}
              testID="btn-switch-role"
              accessibilityRole="button"
              accessibilityLabel="Cambiar rol"
            >
              <View style={styles.menuItemLeft}>
                <Feather name="refresh-cw" size={20} color={accentColor} accessible={false} />
                <View>
                  <Text style={styles.menuItemTitle}>Cambiar Rol</Text>
                  <Text style={styles.menuItemSubtitle}>Alternar entre Cliente y Trabajador</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={onEditProfile}
              testID="btn-edit-profile"
              accessibilityRole="button"
              accessibilityLabel="Editar perfil"
            >
              <View style={styles.menuItemLeft}>
                <Feather name="user" size={20} color={accentColor} accessible={false} />
                <View>
                  <Text style={styles.menuItemTitle}>Editar Perfil</Text>
                  <Text style={styles.menuItemSubtitle}>Actualizá tu información personal</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textMuted} accessible={false} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={onManageLocations}
              testID="btn-manage-locations"
              accessibilityRole="button"
              accessibilityLabel="Mis ubicaciones"
            >
              <View style={styles.menuItemLeft}>
                <Feather name="map-pin" size={20} color={accentColor} accessible={false} />
                <View>
                  <Text style={styles.menuItemTitle}>Mis Ubicaciones</Text>
                  <Text style={styles.menuItemSubtitle}>Administrá tus direcciones guardadas</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textMuted} accessible={false} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              testID="btn-settings"
              accessibilityRole="button"
            >
              <View style={styles.menuItemLeft}>
                <Feather name="settings" size={20} color={accentColor} accessible={false} />
                <View>
                  <Text style={styles.menuItemTitle}>Configuración</Text>
                  <Text style={styles.menuItemSubtitle}>Notificaciones, idioma y más</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textMuted} accessible={false} />
            </TouchableOpacity>
          </View>

          <View style={styles.logoutSection}>
            <SecondaryButton
              title="Cerrar Sesión"
              onPress={onLogout}
              accentColor={colors.error}
              testID="btn-logout"
              accessibilityLabel="Cerrar sesión"
            />
          </View>
        </ScrollView>

        {showSuccess && (
          <SuccessToast
            visible={showSuccess}
            message={successMessage}
            testID="success-toast"
            onFinish={() => {
              setShowSuccess(false);
            }}
          />
        )}

        <RoleSwitchModal
          visible={modalVisible}
          currentRole={currentRole}
          isSubmitting={isSubmitting}
          error={error}
          warning={warning}
          onSelectRole={handleSwitchRole}
          onDismiss={() => {
            clearWarning();
            setModalVisible(false);
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  greeting: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  currentRoleLabel: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: '600',
  },
  menuSection: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  menuItemTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: '600',
  },
  menuItemSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  logoutSection: {
    marginTop: spacing.md,
  },
});
