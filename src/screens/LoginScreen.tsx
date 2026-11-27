import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useLoginForm } from '../hooks/useLoginForm';
import { BaseField, PrimaryButton, ErrorBanner } from '../components/base';
import { LoginScreenProps } from '../types/auth';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/tokens';

const ACCENT_COLOR = colors.clientAccent;

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigateToOtp,
  onNavigateToRegister,
  onNavigateBack,
  onNavigateToForgotPassword,
}) => {
  const {
    formData,
    touched,
    errors,
    isFormValid,
    showPassword,
    rememberMe,
    isSubmitting,
    serverError,
    handleChange,
    handleBlur,
    toggleShowPassword,
    toggleRememberMe,
    handleSubmit,
  } = useLoginForm(onNavigateToOtp);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <TouchableOpacity
                onPress={onNavigateBack}
                style={styles.backButton}
                testID="btn-login-back"
                accessibilityLabel="Volver atrás"
                accessibilityRole="button"
              >
                <Feather
                  name="arrow-left"
                  size={24}
                  color={ACCENT_COLOR}
                  accessible={false}
                />
              </TouchableOpacity>
              <Text style={styles.title}>Iniciar Sesión</Text>
            </View>
            <Text style={styles.subtitle}>Ingresá tus credenciales para acceder a tu cuenta.</Text>
          </View>

          {serverError && (
            <ErrorBanner message={serverError} testID="server-error-banner" />
          )}

          <BaseField
            label="Correo Electrónico o Teléfono"
            value={formData.emailOrPhone}
            onChangeText={(t) => handleChange('emailOrPhone', t)}
            onBlur={() => handleBlur('emailOrPhone')}
            error={touched.emailOrPhone ? errors.emailOrPhone : undefined}
            placeholder="ejemplo@correo.com o +5491122334455"
            keyboardType="email-address"
            autoCapitalize="none"
            testID="input-email-phone"
            required
            accentColor={ACCENT_COLOR}
          />

          <BaseField
            label="Contraseña"
            value={formData.password}
            onChangeText={(t) => handleChange('password', t)}
            onBlur={() => handleBlur('password')}
            error={touched.password ? errors.password : undefined}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            onToggleSecureTextEntry={toggleShowPassword}
            testID="input-password"
            required
            accentColor={ACCENT_COLOR}
          />

          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={toggleRememberMe}
              testID="btn-remember-me"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rememberMe }}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && (
                  <Feather name="check" size={14} color={colors.onPrimary} accessible={false} />
                )}
              </View>
              <Text style={styles.rememberText}>Recordar email/teléfono</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="btn-forgot-password"
              accessibilityRole="button"
              onPress={onNavigateToForgotPassword}
            >
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>

          <PrimaryButton
            title={isSubmitting ? 'Ingresando...' : 'Iniciar Sesión'}
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            loading={isSubmitting}
            accentColor={ACCENT_COLOR}
            testID="btn-login-submit"
          />

          <View style={styles.registerRow}>
            <Text style={styles.registerQuestion}>¿No tenés cuenta? </Text>
            <TouchableOpacity onPress={onNavigateToRegister} testID="btn-go-to-register">
              <Text style={styles.registerLink}>Registrarse</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  header: { marginBottom: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backButton: {
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    marginTop: spacing.xs,
    lineHeight: typography.fontSizes.md * 1.5,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: ACCENT_COLOR,
    borderColor: ACCENT_COLOR,
  },
  rememberText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
  },
  forgotText: {
    color: ACCENT_COLOR,
    fontSize: typography.fontSizes.xs,
    fontWeight: '600',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  registerQuestion: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  registerLink: {
    color: ACCENT_COLOR,
    fontSize: typography.fontSizes.sm,
    fontWeight: '700',
  },
});
