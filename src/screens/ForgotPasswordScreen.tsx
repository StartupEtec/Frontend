import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useForgotPassword } from "../hooks/useForgotPassword";
import { RegisterFormInput } from "../components/register/RegisterFormInput";
import { OtpDigitInput } from "../components/otp/OtpDigitInput";
import { OtpTimer } from "../components/otp/OtpTimer";
import { PasswordRequirements } from "../components/register/PasswordRequirements";
import { ForgotPasswordScreenProps, PasswordResetStep } from "../types/auth";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from "../theme/tokens";

const STEP_LIST: { step: PasswordResetStep; label: string }[] = [
  { step: 1, label: "Email/Teléfono" },
  { step: 2, label: "Código" },
  { step: 3, label: "Nueva contraseña" },
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

  const textInputRefs = useRef<Array<TextInput | null>>(Array(6).fill(null));
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  useEffect(() => {
    inputRefs.current = textInputRefs.current.map((ref) =>
      ref ? { focus: () => ref.focus() } : null,
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
          <Text style={styles.backArrow}>←</Text>
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
              <Text
                style={[
                  styles.progressDotText,
                  (isActive || isDone) && styles.progressDotTextActive,
                ]}
              >
                {isDone ? "✓" : item.step}
              </Text>
            </View>
            <View style={styles.progressBar} />
          </View>
        );
      })}
      <Text style={styles.progressLabel}>
        Paso {step} de 3
      </Text>
    </View>
  );

  const renderStep1 = () => (
    <>
      <Text style={styles.stepTitle}>¿Cuál es tu email o teléfono?</Text>
      <Text style={styles.stepHint}>
        Te enviaremos un código de 6 dígitos para verificar tu identidad.
      </Text>

      {serverError && (
        <View style={styles.serverErrorBox} testID="server-error-banner">
          <Text style={styles.serverErrorText}>{serverError}</Text>
        </View>
      )}

      <RegisterFormInput
        label="Correo Electrónico o Teléfono"
        value={contact}
        onChangeText={handleContactChange}
        onBlur={handleContactBlur}
        error={contactTouched ? contactError : undefined}
        placeholder="ejemplo@correo.com o +5491122334455"
        keyboardType="email-address"
        autoCapitalize="none"
        testID="input-reset-contact"
      />

      <TouchableOpacity
        style={[
          styles.actionButton,
          (!canSubmitStep1 || isSubmitting) && styles.actionButtonDisabled,
        ]}
        onPress={handleNextStep}
        disabled={!canSubmitStep1 || isSubmitting}
        testID="btn-send-code"
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.textPrimary} testID="loading-spinner" />
        ) : (
          <Text style={styles.actionButtonText}>Enviar Código</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={styles.stepTitle}>Ingresá el código</Text>
      <Text style={styles.stepHint}>
        Enviamos un código de 6 dígitos a{" "}
        <Text style={styles.contactHighlight}>
          {contact.length > 6
            ? `${contact.slice(0, 3)}${"*".repeat(Math.max(2, contact.length - 6))}${contact.slice(-3)}`
            : contact}
        </Text>
      </Text>

      {serverError && (
        <View style={styles.serverErrorBox} testID="server-error-banner">
          <Text style={styles.serverErrorText}>{serverError}</Text>
        </View>
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

      {codeError && !isSubmitting && (
        <Text style={styles.stepError}>{codeError}</Text>
      )}

      <TouchableOpacity
        style={[
          styles.actionButton,
          (!canSubmitStep2 || isSubmitting) && styles.actionButtonDisabled,
        ]}
        onPress={handleVerifyCode}
        disabled={!canSubmitStep2 || isSubmitting}
        testID="btn-verify-code"
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.textPrimary} testID="loading-spinner" />
        ) : (
          <Text style={styles.actionButtonText}>Verificar</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={styles.stepTitle}>Creá tu nueva contraseña</Text>
      <Text style={styles.stepHint}>
        Elegí una contraseña segura que no hayas usado antes.
      </Text>

      {serverError && (
        <View style={styles.serverErrorBox} testID="server-error-banner">
          <Text style={styles.serverErrorText}>{serverError}</Text>
        </View>
      )}

      <RegisterFormInput
        label="Nueva Contraseña"
        value={newPassword}
        onChangeText={handleNewPasswordChange}
        error={passwordError}
        placeholder="••••••••"
        secureTextEntry={!showNewPassword}
        onToggleSecureTextEntry={() =>
          setShowNewPassword((prev) => !prev)
        }
        testID="input-new-password"
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

      <RegisterFormInput
        label="Confirmar Nueva Contraseña"
        value={confirmPassword}
        onChangeText={handleConfirmPasswordChange}
        error={confirmPasswordError}
        placeholder="••••••••"
        secureTextEntry={!showConfirmPassword}
        onToggleSecureTextEntry={() =>
          setShowConfirmPassword((prev) => !prev)
        }
        testID="input-confirm-password"
      />

      <TouchableOpacity
        style={[
          styles.actionButton,
          (!canSubmitStep3 || isSubmitting) && styles.actionButtonDisabled,
        ]}
        onPress={handleResetPassword}
        disabled={!canSubmitStep3 || isSubmitting}
        testID="btn-reset-password"
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.textPrimary} testID="loading-spinner" />
        ) : (
          <Text style={styles.actionButtonText}>Guardar Contraseña</Text>
        )}
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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

          <TouchableOpacity
            style={styles.loginLinkRow}
            onPress={onNavigateToLogin}
            testID="btn-back-to-login"
            accessibilityRole="button"
          >
            <Text style={styles.loginLinkText}>← Volver a Iniciar Sesión</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.md },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  backArrow: { color: colors.textPrimary, fontSize: 24, fontWeight: "bold" },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: "700",
    flex: 1,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.xs,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  progressItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  progressDotActive: {
    borderColor: colors.primary,
  },
  progressDotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  progressDotText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: "700",
  },
  progressDotTextActive: {
    color: colors.textPrimary,
  },
  progressBar: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: "600",
    marginLeft: spacing.sm,
    minWidth: 70,
  },
  stepTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  stepHint: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  contactHighlight: {
    color: colors.primaryLight,
    fontWeight: "600",
  },
  serverErrorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: colors.error,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  serverErrorText: { color: colors.error, fontSize: typography.fontSizes.sm },
  actionButton: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.md,
    ...shadows.button,
  },
  actionButtonDisabled: { opacity: 0.5 },
  actionButtonText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: "700",
  },
  timerRow: { alignItems: "center", marginBottom: spacing.md },
  digitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  stepError: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  loginLinkRow: {
    alignItems: "center",
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
  },
  loginLinkText: {
    color: colors.primaryLight,
    fontSize: typography.fontSizes.sm,
    fontWeight: "600",
  },
});

export default ForgotPasswordScreen;
