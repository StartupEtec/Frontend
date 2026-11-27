import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  type TextInputInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useForgotPassword } from '../hooks/useForgotPassword';
import { BaseField, PrimaryButton, ErrorBanner } from '../components/base';
import { OtpDigitInput } from '../components/otp/OtpDigitInput';
import { OtpTimer } from '../components/otp/OtpTimer';
import { PasswordRequirements } from '../components/register/PasswordRequirements';
import { SuccessToast } from '../components/SuccessToast';
import { ForgotPasswordScreenProps, PasswordResetStep } from '../types/auth';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/tokens';

const ACCENT_COLOR = colors.clientAccent;

const STEP_LIST: { step: PasswordResetStep; label: string }[] = [
  { step: 1, label: 'Email/Teléfono' },
  { step: 2, label: 'Código' },
  { step: 3, label: 'Nueva contraseña' },
];

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  onNavigateToLogin,
  onNavigateBack,
}) => {
  const {
    step,
    contact,
    code,
    newPassword,
    confirmPassword,
    contactTouched,
    contactError,
    codeError,
    passwordError,
    confirmPasswordError,
    secondsRemaining,
    isSubmitting,
    serverError,
    isResetSuccess,
    canSubmitStep1,
    canSubmitStep2,
    canSubmitStep3,
    handleContactChange,
    handleContactBlur,
    handleDigitChange,
    handleDigitKeyPress,
    handleNewPasswordChange,
    handleConfirmPasswordChange,
    handleNextStep,
    handleVerifyCode,
    handleResetPassword,
    handleBack,
    inputRefs,
  } = useForgotPassword(onNavigateToLogin);

  const textInputRefs = useRef<Array<TextInputInstance | null>>(Array(6).fill(null));
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  useEffect(() => {
    inputRefs.current = textInputRefs.current.map((ref) =>
      ref ? { focus: () => ref.focus() } : null
    );
  }, [inputRefs, step]);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <TouchableOpacity
          onPress={step === 1 ? onNavigateBack : handleBack}
          style={styles.backButton}
          testID="btn-reset-back"
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <Feather name="arrow-left" size={24} color={ACCENT_COLOR} accessible={false} />
        </TouchableOpacity>
        <Text style={styles.title}>Recuperar Contraseña</Text>
      </View>
      {step === 3 && (
        <Text style={styles.subtitle}>
          Todos los pasos completados. Ingresá tu nueva contraseña.
        </Text>
      )}
    </View>
  );

  const renderProgress = () => (
    <View style={styles.progressContainer} testID="progress-indicator">
      {STEP_LIST.map((item) => {
        const isActive = item.step === step;
        const isDone = item.step < step;
        return (
          <View style={styles.progressItem} key={item.step}>
            <View
              style={[
                styles.progressDot,
                (isActive || isDone) && styles.progressDotActive,
                isDone && styles.progressDotDone,
              ]}
            >
              {isDone ? (
                <Feather name="check" size={14} color="#FFFFFF" accessible={false} />
              ) : (
                <Text
                  style={[
                    styles.progressDotText,
                    (isActive || isDone) && styles.progressDotTextActive,
                  ]}
                >
                  {item.step}
                </Text>
              )}
            </View>
            <View style={styles.progressBar} />
          </View>
        );
      })}
    </View>
  );

  const renderStep1 = () => (
    <>
      <Text style={styles.stepTitle}>¿Cuál es tu email o teléfono?</Text>
      <Text style={styles.stepHint}>
        Te enviaremos un código de 6 dígitos para verificar tu identidad.
      </Text>

      {serverError && (
        <ErrorBanner message={serverError} testID="server-error-banner" />
      )}

      <BaseField
        label="Correo Electrónico o Teléfono"
        value={contact}
        onChangeText={handleContactChange}
        onBlur={handleContactBlur}
        error={contactTouched ? contactError : undefined}
        placeholder="ejemplo@correo.com o +5491122334455"
        keyboardType="email-address"
        autoCapitalize="none"
        testID="input-reset-contact"
        required
        accentColor={ACCENT_COLOR}
      />

      <PrimaryButton
        title={isSubmitting ? 'Enviando...' : 'Enviar Código'}
        onPress={handleNextStep}
        disabled={!canSubmitStep1 || isSubmitting}
        loading={isSubmitting}
        accentColor={ACCENT_COLOR}
        testID="btn-send-code"
      />
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={styles.stepTitle}>Ingresá el código</Text>
      <Text style={styles.stepHint}>
        Enviamos un código de 6 dígitos a{' '}
        <Text style={styles.contactHighlight}>
          {contact.length > 6
            ? `${contact.slice(0, 3)}${'*'.repeat(Math.max(2, contact.length - 6))}${contact.slice(-3)}`
            : contact}
        </Text>
      </Text>

      {serverError && (
        <ErrorBanner message={serverError} testID="server-error-banner" />
      )}

      <View style={styles.timerRow}>
        <OtpTimer secondsRemaining={secondsRemaining} />
      </View>

      <View style={styles.digitRow} testID="reset-code-row">
        {code.map((digit, index) => (
          <OtpDigitInput
            key={index}
            ref={(el) => {
              textInputRefs.current[index] = el;
            }}
            index={index}
            value={digit}
            hasError={Boolean(codeError && !isSubmitting)}
            onChangeText={handleDigitChange}
            onKeyPress={handleDigitKeyPress}
          />
        ))}
      </View>

      {codeError && !isSubmitting && <Text style={styles.stepError}>{codeError}</Text>}

      <PrimaryButton
        title={isSubmitting ? 'Verificando...' : 'Verificar'}
        onPress={handleVerifyCode}
        disabled={!canSubmitStep2 || isSubmitting}
        loading={isSubmitting}
        accentColor={ACCENT_COLOR}
        testID="btn-verify-code"
      />
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={styles.stepTitle}>Creá tu nueva contraseña</Text>
      <Text style={styles.stepHint}>Elegí una contraseña segura que no hayas usado antes.</Text>

      {serverError && (
        <ErrorBanner message={serverError} testID="server-error-banner" />
      )}

      <BaseField
        label="Nueva Contraseña"
        value={newPassword}
        onChangeText={handleNewPasswordChange}
        error={passwordError}
        placeholder="••••••••"
        secureTextEntry={!showNewPassword}
        onToggleSecureTextEntry={() => setShowNewPassword((prev) => !prev)}
        testID="input-new-password"
        required
        accentColor={ACCENT_COLOR}
      />

      <PasswordRequirements
        status={{
          minLength: newPassword.length >= 8,
          hasUppercase: /[A-Z]/.test(newPassword),
          hasLowercase: /[a-z]/.test(newPassword),
          hasNumber: /[0-9]/.test(newPassword),
          hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
        }}
      />

      <BaseField
        label="Confirmar Nueva Contraseña"
        value={confirmPassword}
        onChangeText={handleConfirmPasswordChange}
        error={confirmPasswordError}
        placeholder="••••••••"
        secureTextEntry={!showConfirmPassword}
        onToggleSecureTextEntry={() => setShowConfirmPassword((prev) => !prev)}
        testID="input-confirm-password"
        required
        accentColor={ACCENT_COLOR}
      />

      <PrimaryButton
        title={isSubmitting ? 'Guardando...' : 'Guardar Contraseña'}
        onPress={handleResetPassword}
        disabled={!canSubmitStep3 || isSubmitting}
        loading={isSubmitting}
        accentColor={ACCENT_COLOR}
        testID="btn-reset-password"
      />
    </>
  );

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
          {renderHeader()}
          {renderProgress()}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ScrollView>

        <SuccessToast
          visible={isResetSuccess}
          message="¡Contraseña actualizada! Volviendo al inicio de sesión…"
          testID="reset-success-toast"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  header: { marginBottom: spacing.md },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    flex: 1,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    marginTop: spacing.xs,
    lineHeight: typography.fontSizes.md * 1.5,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotActive: {
    borderColor: ACCENT_COLOR,
  },
  progressDotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  progressDotText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: '700',
  },
  progressDotTextActive: {
    color: colors.textPrimary,
  },
  progressBar: {
    flex: 1,
    height: 2,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: spacing.xs,
  },
  stepTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.xs,
  },
  stepHint: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    marginBottom: spacing.lg,
    lineHeight: typography.fontSizes.md * 1.5,
  },
  contactHighlight: {
    color: ACCENT_COLOR,
    fontWeight: '600',
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
  timerRow: { alignItems: 'center', marginBottom: spacing.md },
  digitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  stepError: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
});
