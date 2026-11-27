import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { PrimaryButton, SecondaryButton } from '../components/base';
import { AuthWelcomeScreenProps } from '../types/auth';
import { colors, spacing, borderRadius, typography } from '../theme/tokens';

const ACCENT_COLOR = colors.clientAccent;

export const AuthWelcomeScreen: React.FC<AuthWelcomeScreenProps> = ({
  onNavigateToRegister,
  onNavigateToLogin,
  onNavigateToOnboarding,
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={styles.container}>
        <View style={styles.logoBadge}>
          <Feather name="link" size={36} color={ACCENT_COLOR} />
        </View>

        <Text style={styles.title}>Te Damos la Bienvenida</Text>
        <Text style={styles.subtitle}>
          Conecta con profesionales e independientes en una sola plataforma segura y flexible.
        </Text>

        <View style={styles.actionsContainer}>
          <PrimaryButton
            title="Registrarse"
            onPress={onNavigateToRegister}
            accentColor={ACCENT_COLOR}
            testID="btn-auth-register"
          />
          <SecondaryButton
            title="Iniciar Sesión"
            onPress={onNavigateToLogin}
            accentColor={ACCENT_COLOR}
            testID="btn-auth-login"
          />
        </View>

        <TouchableOpacity
          style={styles.replayButton}
          onPress={onNavigateToOnboarding}
          testID="btn-replay-onboarding"
          activeOpacity={0.7}
        >
          <Feather name="refresh-cw" size={14} color={colors.textMuted} accessible={false} />
          <Text style={styles.replayText}>Ver presentación de nuevo</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
    maxWidth: 320,
  },
  actionsContainer: {
    width: '100%',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  replayText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    textDecorationLine: 'underline',
  },
});
