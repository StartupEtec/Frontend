import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type TextInputInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { OtpVerificationScreenProps } from '../types/auth';
import { useOtpVerification } from '../hooks/useOtpVerification';
import { OtpDigitInput } from '../components/otp/OtpDigitInput';
import { OtpTimer } from '../components/otp/OtpTimer';
import { PrimaryButton, ErrorBanner } from '../components/base';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/tokens';

const ACCENT_COLOR = colors.clientAccent;

export const OtpVerificationScreen: React.FC<OtpVerificationScreenProps> = ({
  contact,
  onVerificationSuccess,
  onNavigateBackToRegister,
}) => {
  const {
    code,
    status,
    errorMessage,
    secondsRemaining,
    canResend,
    resendCooldown,
    handleDigitChange,
    handleDigitKeyPress,
    handleVerify,
    handleResend,
    inputRefs,
  } = useOtpVerification({ contact, onVerificationSuccess });

  const textInputRefs = useRef<Array<TextInputInstance | null>>(Array(6).fill(null));

  useEffect(() => {
    inputRefs.current = textInputRefs.current.map((ref) =>
      ref ? { focus: () => ref.focus() } : null
    );
  }, [inputRefs]);

  useEffect(() => {
    const timer = setTimeout(() => textInputRefs.current[0]?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const isVerifying = status === 'verifying';
  const isResending = status === 'resending';
  const isLocked = status === 'locked';
  const codeComplete = code.every((d) => d !== '');
  const hasError = !!errorMessage;

  const maskedContact =
    contact.length > 6
      ? `${contact.slice(0, 3)}${'*'.repeat(contact.length - 6)}${contact.slice(-3)}`
      : contact;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onNavigateBackToRegister}
              style={styles.backButton}
              testID="btn-otp-back"
              accessibilityLabel="Volver al registro"
              accessibilityRole="button"
            >
              <Feather name="arrow-left" size={24} color={ACCENT_COLOR} accessible={false} />
            </TouchableOpacity>

            <View style={styles.iconBadge}>
              <Feather name="lock" size={32} color={ACCENT_COLOR} accessible={false} />
            </View>

            <Text style={styles.title}>Verificar tu identidad</Text>
            <Text style={styles.subtitle}>
              Ingresá el código de 6 dígitos enviado a{'\n'}
              <Text style={styles.contactHighlight}>{maskedContact}</Text>
            </Text>
          </View>

          <View style={styles.timerRow}>
            <OtpTimer secondsRemaining={secondsRemaining} />
          </View>

          <View style={styles.digitRow} testID="otp-digit-row">
            {code.map((digit, index) => (
              <OtpDigitInput
                key={index}
                ref={(el) => {
                  textInputRefs.current[index] = el;
                }}
                index={index}
                value={digit}
                hasError={hasError && !isLocked}
                onChangeText={handleDigitChange}
                onKeyPress={handleDigitKeyPress}
              />
            ))}
          </View>

          {errorMessage && (
            <ErrorBanner message={errorMessage} testID="otp-error-banner" />
          )}

          <PrimaryButton
            title={isVerifying ? 'Verificando...' : 'Verificar'}
            onPress={handleVerify}
            disabled={!codeComplete || isVerifying || isLocked}
            loading={isVerifying}
            loadingTestID="otp-loading-spinner"
            accentColor={ACCENT_COLOR}
            testID="btn-otp-verify"
            accessibilityLabel="Verificar código"
          />

          <View style={styles.resendRow}>
            {canResend ? (
              <TouchableOpacity
                onPress={handleResend}
                disabled={isResending}
                testID="btn-otp-resend"
                accessibilityRole="button"
              >
                {isResending ? (
                  <ActivityIndicator
                    size="small"
                    color={ACCENT_COLOR}
                    testID="resend-loading-spinner"
                  />
                ) : (
                  <Text style={styles.resendActive}>
                    {secondsRemaining === 0 ? 'Reenviar Nuevo Código' : 'Reenviar Código'}
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendDisabled} testID="btn-otp-resend-disabled">
                {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar Código'}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.changeContactRow}
            onPress={onNavigateBackToRegister}
            testID="btn-change-contact"
            accessibilityRole="button"
            accessibilityLabel="Cambiar email o teléfono"
          >
            <Text style={styles.changeContactText}>Cambiar email/teléfono</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    paddingTop: spacing.md,
  },

  header: { alignItems: 'center', marginBottom: spacing.lg },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
    marginBottom: spacing.md,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
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
  },
  contactHighlight: {
    color: ACCENT_COLOR,
    fontWeight: '600',
  },

  timerRow: { alignItems: 'center', marginBottom: spacing.lg },

  digitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  errorBanner: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.onErrorContainer,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
  },

  resendRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
    minHeight: 24,
  },
  resendActive: {
    color: ACCENT_COLOR,
    fontSize: typography.fontSizes.sm,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  resendDisabled: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
  },

  changeContactRow: { alignItems: 'center', paddingVertical: spacing.xs },
  changeContactText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    textDecorationLine: 'underline',
  },
});
