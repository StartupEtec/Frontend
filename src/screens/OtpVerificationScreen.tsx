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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { OtpVerificationScreenProps } from '../types/auth';
import { useOtpVerification } from '../hooks/useOtpVerification';
import { OtpDigitInput } from '../components/otp/OtpDigitInput';
import { OtpTimer } from '../components/otp/OtpTimer';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/tokens';

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

  // TextInput refs for imperative focus management
  const textInputRefs = useRef<Array<TextInput | null>>(Array(6).fill(null));

  // Wire TextInput refs into the hook's focus controller
  useEffect(() => {
    inputRefs.current = textInputRefs.current.map((ref) =>
      ref ? { focus: () => ref.focus() } : null
    );
  }, [inputRefs]);

  // Auto-focus first digit on mount
  useEffect(() => {
    const timer = setTimeout(() => textInputRefs.current[0]?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const isVerifying = status === 'verifying';
  const isResending = status === 'resending';
  const isLocked = status === 'locked';
  const codeComplete = code.every((d) => d !== '');
  const hasError = !!errorMessage;

  // Mask contact for privacy: show only first 3 chars + asterisks
  const maskedContact = contact.length > 6
    ? `${contact.slice(0, 3)}${'*'.repeat(contact.length - 6)}${contact.slice(-3)}`
    : contact;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onNavigateBackToRegister}
              style={styles.backButton}
              testID="btn-otp-back"
              accessibilityLabel="Volver al registro"
              accessibilityRole="button"
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            <View style={styles.iconBadge}>
              <Text style={styles.iconEmoji}>🔐</Text>
            </View>

            <Text style={styles.title}>Verificar tu identidad</Text>
            <Text style={styles.subtitle}>
              Ingresá el código de 6 dígitos enviado a{'\n'}
              <Text style={styles.contactHighlight}>{maskedContact}</Text>
            </Text>
          </View>

          {/* ── Timer ── */}
          <View style={styles.timerRow}>
            <OtpTimer secondsRemaining={secondsRemaining} />
          </View>

          {/* ── 6-Digit Input Row ── */}
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

          {/* ── Error Banner ── */}
          {errorMessage && (
            <View style={styles.errorBanner} testID="otp-error-banner">
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* ── Verify Button ── */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (!codeComplete || isVerifying || isLocked) && styles.verifyButtonDisabled,
            ]}
            onPress={handleVerify}
            disabled={!codeComplete || isVerifying || isLocked}
            testID="btn-otp-verify"
            accessibilityRole="button"
            accessibilityLabel="Verificar código"
          >
            {isVerifying ? (
              <ActivityIndicator color={colors.textPrimary} testID="otp-loading-spinner" />
            ) : (
              <Text style={styles.verifyButtonText}>Verificar</Text>
            )}
          </TouchableOpacity>

          {/* ── Resend Row ── */}
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
                    color={colors.primary}
                    testID="resend-loading-spinner"
                  />
                ) : (
                  <Text style={styles.resendActive}>Reenviar Código</Text>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendDisabled} testID="btn-otp-resend-disabled">
                {resendCooldown > 0
                  ? `Reenviar en ${resendCooldown}s`
                  : 'Código expirado'}
              </Text>
            )}
          </View>

          {/* ── Change Contact Link ── */}
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
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
  },

  // Header
  header: { alignItems: 'center', marginBottom: spacing.lg },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
    marginBottom: spacing.md,
  },
  backArrow: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconEmoji: { fontSize: 36 },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  contactHighlight: {
    color: colors.primaryLight,
    fontWeight: '600',
  },

  // Timer
  timerRow: { alignItems: 'center', marginBottom: spacing.lg },

  // Digit inputs
  digitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  // Error
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
  },

  // Verify button
  verifyButton: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.button,
  },
  verifyButtonDisabled: { opacity: 0.45 },
  verifyButtonText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: '700',
  },

  // Resend
  resendRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
    minHeight: 24,
  },
  resendActive: {
    color: colors.primaryLight,
    fontSize: typography.fontSizes.sm,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  resendDisabled: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
  },

  // Change contact
  changeContactRow: { alignItems: 'center', paddingVertical: spacing.xs },
  changeContactText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    textDecorationLine: 'underline',
  },
});

export default OtpVerificationScreen;
