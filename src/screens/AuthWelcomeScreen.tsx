import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthWelcomeScreenProps } from "../types/auth";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from "../theme/tokens";

export const AuthWelcomeScreen: React.FC<AuthWelcomeScreenProps> = ({
  onNavigateToRegister,
  onNavigateToLogin,
  onNavigateToOnboarding,
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <View style={styles.container}>
        {/* Branding Icon / Logo Placeholder */}
        <View style={styles.logoBadge}>
          <Text style={styles.logoIcon}>✨</Text>
        </View>

        <Text style={styles.title}>Te Damos la Bienvenida</Text>
        <Text style={styles.subtitle}>
          Conecta con profesionales e independientes en una sola plataforma
          segura y flexible.
        </Text>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={onNavigateToRegister}
            testID="btn-auth-register"
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Registrarse</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onNavigateToLogin}
            testID="btn-auth-login"
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.replayButton}
          onPress={onNavigateToOnboarding}
          testID="btn-replay-onboarding"
          activeOpacity={0.7}
        >
          <Text style={styles.replayText}>🔄 Ver presentación de nuevo</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.cardBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoIcon: {
    fontSize: 36,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.xxl,
    maxWidth: 320,
  },
  actionsContainer: {
    width: "100%",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  button: {
    height: 52,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  primaryButton: {
    backgroundColor: colors.primary,
    ...shadows.button,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  replayButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  replayText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    textDecorationLine: "underline",
  },
});

export default AuthWelcomeScreen;
