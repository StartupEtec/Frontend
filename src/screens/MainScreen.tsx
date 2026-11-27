import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { UserRole } from '../types/role';
import { PrimaryButton, SecondaryButton } from '../components/base';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/tokens';

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
  const isClient = selectedRole === 'client';
  const accentColor = isClient ? colors.clientAccent : colors.workerAccent;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <View style={styles.topBarSpacer} />
        <Text style={styles.topBarTitle}>Labor-In</Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={onNavigateToProfile}
          testID="btn-main-profile"
          accessibilityLabel="Mi Perfil"
          accessibilityRole="button"
        >
          <Feather name="user" size={20} color={accentColor} accessible={false} />
        </TouchableOpacity>
      </View>

      <View style={styles.centerContainer}>
        <Text style={styles.welcomeText}>Pantalla Principal</Text>
        <Text style={[styles.roleLabel, { color: accentColor }]}>
          {isClient ? 'Modo Cliente' : 'Modo Trabajador'}
        </Text>

        {!justCompletedProfile && !profileCompleted && (
          <PrimaryButton
            title="Terminar de completar perfil ahora"
            onPress={onNavigateToCompleteProfile}
            accentColor={accentColor}
            testID="btn-complete-profile"
          />
        )}

        {profileCompleted && (
          <SecondaryButton
            title="Editar Perfil (Dev)"
            onPress={onNavigateToCompleteProfile}
            accentColor={accentColor}
            testID="btn-dev-complete-profile"
          />
        )}

        <TouchableOpacity
          style={styles.resetButton}
          onPress={onResetOnboarding}
          testID="btn-reset-onboarding"
          activeOpacity={0.8}
        >
          <Feather name="refresh-cw" size={16} color={colors.textMuted} accessible={false} />
          <Text style={styles.resetText}>Resetear Onboarding (Dev)</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarSpacer: { width: 40 },
  topBarTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.pill / 2,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  welcomeText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.semibold,
    textAlign: 'center',
  },
  roleLabel: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
  },
});
