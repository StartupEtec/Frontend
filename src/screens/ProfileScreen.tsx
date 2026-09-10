import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { UserRole } from "../types/role";
import { RoleSwitchModal } from "../components/RoleSwitchModal";
import { useRoleSwitch } from "../hooks/useRoleSwitch";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from "../theme/tokens";

export interface ProfileScreenProps {
  currentRole: UserRole;
  onRoleChanged: (newRole: UserRole, newToken: string) => void;
  onGoBack: () => void;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentRole,
  onRoleChanged,
  onGoBack,
  onLogout,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const { isSubmitting, error, handleSwitchRole, clearError } =
    useRoleSwitch(currentRole, (newRole, newToken) => {
      setModalVisible(false);
      const label = newRole === "client" ? "Cliente" : "Trabajador";
      setSuccessMessage(`Cambiaste a rol de ${label}`);
      setShowSuccess(true);
      toastOpacity.setValue(0);
      Animated.sequence([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2500),
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSuccess(false);
        onRoleChanged(newRole, newToken);
      });
    });

  useEffect(() => {
    if (modalVisible) {
      clearError();
    }
  }, [modalVisible, clearError]);

  const isClient = currentRole === "client";
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
            <Text style={styles.backArrow}>←</Text>
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
              <Text style={styles.avatarIcon}>
                {isClient ? "🔍" : "🛠️"}
              </Text>
            </View>
            <Text style={styles.greeting}>Hola,</Text>
            <Text style={styles.currentRoleLabel}>
              Estás en modo{" "}
              <Text style={{ color: accentColor, fontWeight: "700" }}>
                {isClient ? "Cliente" : "Trabajador"}
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
                <Text style={styles.menuItemIcon}>🔄</Text>
                <View>
                  <Text style={styles.menuItemTitle}>Cambiar Rol</Text>
                  <Text style={styles.menuItemSubtitle}>
                    Alternar entre Cliente y Trabajador
                  </Text>
                </View>
              </View>
              <View
                style={[styles.roleBadge, { backgroundColor: accentColor }]}
              >
                <Text style={styles.roleBadgeText}>
                  {isClient ? "Cliente" : "Trabajador"}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              testID="btn-edit-profile"
              accessibilityRole="button"
            >
              <View style={styles.menuItemLeft}>
                <Text style={styles.menuItemIcon}>👤</Text>
                <View>
                  <Text style={styles.menuItemTitle}>Editar Perfil</Text>
                  <Text style={styles.menuItemSubtitle}>
                    Actualizá tu información personal
                  </Text>
                </View>
              </View>
              <Text style={styles.menuItemChevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              testID="btn-settings"
              accessibilityRole="button"
            >
              <View style={styles.menuItemLeft}>
                <Text style={styles.menuItemIcon}>⚙️</Text>
                <View>
                  <Text style={styles.menuItemTitle}>Configuración</Text>
                  <Text style={styles.menuItemSubtitle}>
                    Notificaciones, idioma y más
                  </Text>
                </View>
              </View>
              <Text style={styles.menuItemChevron}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.logoutSection}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={onLogout}
              testID="btn-logout"
              accessibilityRole="button"
            >
              <Text style={styles.logoutText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {showSuccess && (
          <Animated.View
            style={[styles.successToast, { opacity: toastOpacity }]}
            testID="success-toast"
          >
            <Text style={styles.successToastText}>{successMessage}</Text>
          </Animated.View>
        )}

        <RoleSwitchModal
          visible={modalVisible}
          currentRole={currentRole}
          isSubmitting={isSubmitting}
          error={error}
          onSelectRole={handleSwitchRole}
          onDismiss={() => setModalVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
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
  backArrow: { color: colors.textPrimary, fontSize: 24, fontWeight: "bold" },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSpacer: { width: 40 },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    backgroundColor: colors.cardBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  avatarIcon: { fontSize: 36 },
  greeting: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  currentRoleLabel: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: "600",
  },
  menuSection: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  roleMenuItem: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  menuItemIcon: { fontSize: 22 },
  menuItemTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: "600",
  },
  menuItemSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
  },
  roleBadgeText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xs,
    fontWeight: "700",
  },
  menuItemChevron: {
    color: colors.textMuted,
    fontSize: 24,
    fontWeight: "300",
  },
  logoutSection: {
    marginTop: spacing.md,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  logoutText: {
    color: colors.error,
    fontSize: typography.fontSizes.md,
    fontWeight: "600",
  },
  successToast: {
    position: "absolute",
    bottom: spacing.xl,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: "rgba(34, 197, 94, 0.95)",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  successToastText: {
    color: "#FFFFFF",
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default ProfileScreen;
