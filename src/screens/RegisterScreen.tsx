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
import { useRegisterForm } from '../hooks/useRegisterForm';
import { RegisterFormInput } from '../components/register/RegisterFormInput';
import { PasswordRequirements } from '../components/register/PasswordRequirements';
import { RegisterTermsRow } from '../components/register/RegisterTermsRow';
import { TermsModal } from '../components/register/TermsModal';
import { RegisterScreenProps } from '../types/auth';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/tokens';

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
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <TouchableOpacity
                onPress={onNavigateBack}
                style={styles.backButton}
                testID="btn-register-back"
                accessibilityLabel="Volver atrás"
                accessibilityRole="button"
              >
                <Text style={styles.backArrow}>←</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Crear Cuenta</Text>
            </View>
            <Text style={styles.subtitle}>Conéctate como cliente o proveedor en nuestra comunidad.</Text>
          </View>

          {serverError && (
            <View style={styles.serverErrorBox} testID="server-error-banner">
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          )}

          <RegisterFormInput
            label="Nombre"
            value={formData.firstName}
            onChangeText={(t) => handleChange('firstName', t)}
            onBlur={() => handleBlur('firstName')}
            error={touched.firstName ? errors.firstName : undefined}
            placeholder="Ej. Juan"
            autoCapitalize="words"
            testID="input-first-name"
          />

          <RegisterFormInput
            label="Apellido"
            value={formData.lastName}
            onChangeText={(t) => handleChange('lastName', t)}
            onBlur={() => handleBlur('lastName')}
            error={touched.lastName ? errors.lastName : undefined}
            placeholder="Ej. Pérez"
            autoCapitalize="words"
            testID="input-last-name"
          />

          <RegisterFormInput
            label="Correo Electrónico"
            value={formData.email}
            onChangeText={(t) => handleChange('email', t)}
            onBlur={() => handleBlur('email')}
            error={touched.email ? errors.email : undefined}
            placeholder="ejemplo@correo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            testID="input-email"
          />

          <RegisterFormInput
            label="Teléfono Móvil"
            value={formData.phone}
            onChangeText={(t) => handleChange('phone', t)}
            onBlur={() => handleBlur('phone')}
            error={touched.phone ? errors.phone : undefined}
            placeholder="+5491122334455"
            keyboardType="phone-pad"
            testID="input-phone"
          />

          <RegisterFormInput
            label="Contraseña"
            value={formData.password}
            onChangeText={(t) => handleChange('password', t)}
            onBlur={() => handleBlur('password')}
            error={touched.password ? errors.password : undefined}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            onToggleSecureTextEntry={toggleShowPassword}
            testID="input-password"
          />

          <PasswordRequirements status={passwordCriteria} />

          <RegisterFormInput
            label="Confirmar Contraseña"
            value={formData.confirmPassword}
            onChangeText={(t) => handleChange('confirmPassword', t)}
            onBlur={() => handleBlur('confirmPassword')}
            error={touched.confirmPassword ? errors.confirmPassword : undefined}
            placeholder="••••••••"
            secureTextEntry={!showConfirmPassword}
            onToggleSecureTextEntry={toggleShowConfirmPassword}
            testID="input-confirm-password"
          />

          <RegisterTermsRow
            acceptedTerms={formData.acceptedTerms}
            onToggleTerms={() => handleChange('acceptedTerms', !formData.acceptedTerms)}
            onOpenTermsModal={() => setIsTermsModalOpen(true)}
            touched={touched.acceptedTerms}
            error={errors.acceptedTerms}
          />

          <TouchableOpacity
            style={[styles.submitButton, (!isFormValid || isSubmitting) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            testID="btn-register-submit"
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.textPrimary} testID="loading-spinner" />
            ) : (
              <Text style={styles.submitButtonText}>Registrarse</Text>
            )}
          </TouchableOpacity>

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
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backButton: {
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  backArrow: { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold' },
  title: { color: colors.textPrimary, fontSize: typography.fontSizes.xl, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, fontSize: typography.fontSizes.sm, marginTop: spacing.xs },
  serverErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.error,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  serverErrorText: { color: colors.error, fontSize: typography.fontSizes.sm },
  submitButton: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.button,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: colors.textPrimary, fontSize: typography.fontSizes.md, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  loginQuestion: { color: colors.textSecondary, fontSize: typography.fontSizes.sm },
  loginLink: { color: colors.primaryLight, fontSize: typography.fontSizes.sm, fontWeight: '700' },
});

export default RegisterScreen;
