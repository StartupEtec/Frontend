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
import { useRegisterForm } from '../hooks/useRegisterForm';
import { BaseField, PrimaryButton, ErrorBanner } from '../components/base';
import { PasswordRequirements } from '../components/register/PasswordRequirements';
import { RegisterTermsRow } from '../components/register/RegisterTermsRow';
import { TermsModal } from '../components/register/TermsModal';
import { RegisterScreenProps } from '../types/auth';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/tokens';

const ACCENT_COLOR = colors.clientAccent;

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onNavigateToOtp,
  onNavigateToLogin,
  onNavigateBack,
}) => {
  const {
    formData,
    touched,
    errors,
    passwordCriteria,
    isFormValid,
    showPassword,
    showConfirmPassword,
    isTermsModalOpen,
    isSubmitting,
    serverError,
    handleChange,
    handleBlur,
    toggleShowPassword,
    toggleShowConfirmPassword,
    setIsTermsModalOpen,
    handleAcceptTerms,
    handleSubmit,
  } = useRegisterForm(onNavigateToOtp, onNavigateToLogin);

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
                testID="btn-register-back"
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
              <Text style={styles.title}>Crear Cuenta</Text>
            </View>
            <Text style={styles.subtitle}>
              Conéctate como cliente o proveedor en nuestra comunidad.
            </Text>
          </View>

          {serverError && (
            <ErrorBanner message={serverError} testID="server-error-banner" />
          )}

          <BaseField
            label="Nombre"
            value={formData.firstName}
            onChangeText={(t) => handleChange('firstName', t)}
            onBlur={() => handleBlur('firstName')}
            error={touched.firstName ? errors.firstName : undefined}
            placeholder="Ej. Juan"
            autoCapitalize="words"
            testID="input-first-name"
            required
            accentColor={ACCENT_COLOR}
          />

          <BaseField
            label="Apellido"
            value={formData.lastName}
            onChangeText={(t) => handleChange('lastName', t)}
            onBlur={() => handleBlur('lastName')}
            error={touched.lastName ? errors.lastName : undefined}
            placeholder="Ej. Pérez"
            autoCapitalize="words"
            testID="input-last-name"
            required
            accentColor={ACCENT_COLOR}
          />

          <BaseField
            label="Correo Electrónico"
            value={formData.email}
            onChangeText={(t) => handleChange('email', t)}
            onBlur={() => handleBlur('email')}
            error={touched.email ? errors.email : undefined}
            placeholder="ejemplo@correo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            testID="input-email"
            required
            accentColor={ACCENT_COLOR}
          />

          <BaseField
            label="Teléfono Móvil"
            value={formData.phone}
            onChangeText={(t) => handleChange('phone', t)}
            onBlur={() => handleBlur('phone')}
            error={touched.phone ? errors.phone : undefined}
            placeholder="+5491122334455"
            keyboardType="phone-pad"
            testID="input-phone"
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

          <PasswordRequirements status={passwordCriteria} />

          <BaseField
            label="Confirmar Contraseña"
            value={formData.confirmPassword}
            onChangeText={(t) => handleChange('confirmPassword', t)}
            onBlur={() => handleBlur('confirmPassword')}
            error={touched.confirmPassword ? errors.confirmPassword : undefined}
            placeholder="••••••••"
            secureTextEntry={!showConfirmPassword}
            onToggleSecureTextEntry={toggleShowConfirmPassword}
            testID="input-confirm-password"
            required
            accentColor={ACCENT_COLOR}
          />

          <RegisterTermsRow
            acceptedTerms={formData.acceptedTerms}
            onToggleTerms={() => handleChange('acceptedTerms', !formData.acceptedTerms)}
            onOpenTermsModal={() => setIsTermsModalOpen(true)}
            touched={touched.acceptedTerms}
            error={errors.acceptedTerms}
          />

          <PrimaryButton
            title={isSubmitting ? 'Registrando...' : 'Registrarse'}
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            loading={isSubmitting}
            accentColor={ACCENT_COLOR}
            testID="btn-register-submit"
          />

          <View style={styles.loginRow}>
            <Text style={styles.loginQuestion}>¿Ya tenés cuenta? </Text>
            <TouchableOpacity onPress={onNavigateToLogin} testID="btn-go-to-login">
              <Text style={styles.loginLink}>Iniciar Sesión</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <TermsModal
        visible={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAccept={handleAcceptTerms}
      />
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
  serverErrorBox: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.error,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  serverErrorText: {
    color: colors.onErrorContainer,
    fontSize: typography.fontSizes.sm,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  loginQuestion: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  loginLink: {
    color: ACCENT_COLOR,
    fontSize: typography.fontSizes.sm,
    fontWeight: '700',
  },
});
