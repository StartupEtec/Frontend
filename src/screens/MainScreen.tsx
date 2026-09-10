import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserRole } from "../types/role";
import { ASYNC_STORAGE_ONBOARDING_KEY } from "../i18n/onboardingContent";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from "../theme/tokens";

export interface MainScreenProps {
  selectedRole: UserRole;
  profileCompleted: boolean;
  justCompletedProfile: boolean;
  onNavigateToProfile: () => void;
  onNavigateToCompleteProfile: () => void;
  onResetOnboarding: () => void;
}

export const MainScreen: React.FC<MainScreenProps> = ({
  selectedRole,
  profileCompleted,
  justCompletedProfile,
  onNavigateToProfile,
  onNavigateToCompleteProfile,
  onResetOnboarding,
}) => {
  const isClient = selectedRole === "client";
  const accentColor = isClient ? colors.clientAccent : colors.workerAccent;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <View style={styles.topBarSpacer} />
        <Text style={styles.topBarTitle}>StartupApp</Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={onNavigateToProfile}
          testID="btn-main-profile"
          accessibilityLabel="Mi Perfil"
          accessibilityRole="button"
        >
          <Text style={styles.profileButtonIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.centerContainer}>
        <Text style={styles.welcomeText}>🏠 Pantalla Principal</Text>
        <Text style={[styles.roleLabel, { color: accentColor }]}>
          {isClient ? "Modo Cliente" : "Modo Trabajador"}
        </Text>

        {!justCompletedProfile && !profileCompleted && (
          <TouchableOpacity
            style={styles.completeProfileButton}
            onPress={onNavigateToCompleteProfile}
            testID="btn-complete-profile"
          >
            <Text style={styles.completeProfileText}>
              Terminar de completar perfil ahora
            </Text>
          </TouchableOpacity>
        )}

        {profileCompleted && (
          <TouchableOpacity
            style={styles.devEditButton}
            onPress={onNavigateToCompleteProfile}
            testID="btn-dev-complete-profile"
          >
            <Text style={styles.devEditText}>✏️ Editar Perfil (Dev)</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.resetButton}
          onPress={onResetOnboarding}
          testID="btn-reset-onboarding"
        >
          <Text style={styles.resetText}>🔄 Resetear Onboarding (Dev)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarSpacer: { width: 40 },
  topBarTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: "700",
  },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.cardBackground,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  profileButtonIcon: { fontSize: 18 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  welcomeText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.semibold,
    textAlign: "center",
  },
  roleLabel: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  completeProfileButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    ...shadows.button,
  },
  completeProfileText: {
    color: "#FFFFFF",
    fontSize: typography.fontSizes.sm,
    fontWeight: "600",
  },
  devEditButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  devEditText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
  },
  resetButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
  },
});

export default MainScreen;
