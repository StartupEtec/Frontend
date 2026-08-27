import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLoginForm } from "../hooks/useLoginForm";
import { RegisterFormInput } from "../components/register/RegisterFormInput";
import { LoginScreenProps } from "../types/auth";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from "../theme/tokens";

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigateToOtp,
  onNavigateToRegister,
  onNavigateBack,
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
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                <Text style={styles.backArrow}>←</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Iniciar Sesión</Text>
            </View>
            <Text style={styles.subtitle}>
              Ingresá tus credenciales para acceder a tu cuenta.
            </Text>
          </View>

          {serverError && (
            <View style={styles.serverErrorBox} testID="server-error-banner">
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          )}

          <RegisterFormInput
            label="Correo Electrónico o Teléfono"
            value={formData.emailOrPhone}
            onChangeText={(t) => handleChange("emailOrPhone", t)}
            onBlur={() => handleBlur("emailOrPhone")}
            error={touched.emailOrPhone ? errors.emailOrPhone : undefined}
            placeholder="ejemplo@correo.com o +5491122334455"
            keyboardType="email-address"
            autoCapitalize="none"
            testID="input-email-phone"
          />

          <RegisterFormInput
            label="Contraseña"
            value={formData.password}
            onChangeText={(t) => handleChange("password", t)}
            onBlur={() => handleBlur("password")}
            error={touched.password ? errors.password : undefined}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            onToggleSecureTextEntry={toggleShowPassword}
            testID="input-password"
          />

          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={toggleRememberMe}
              testID="btn-remember-me"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rememberMe }}
            >
              <View
                style={[
                  styles.checkbox,
                  rememberMe && styles.checkboxChecked,
                ]}
              >
                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rememberText}>Recordar email/teléfono</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="btn-forgot-password"
              accessibilityRole="button"
            >
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!isFormValid || isSubmitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            testID="btn-login-submit"
          >
            {isSubmitting ? (
              <ActivityIndicator
                color={colors.textPrimary}
                testID="loading-spinner"
              />
            ) : (
              <Text style={styles.submitButtonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerQuestion}>¿No tenés cuenta? </Text>
            <TouchableOpacity
              onPress={onNavigateToRegister}
              testID="btn-go-to-register"
            >
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
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.lg },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  backButton: {
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  backArrow: { color: colors.textPrimary, fontSize: 24, fontWeight: "bold" },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.xs,
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
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  rememberText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
  },
  forgotText: {
    color: colors.primaryLight,
    fontSize: typography.fontSizes.xs,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.md,
    ...shadows.button,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: "700",
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  registerQuestion: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  registerLink: {
    color: colors.primaryLight,
    fontSize: typography.fontSizes.sm,
    fontWeight: "700",
  },
});

export default LoginScreen;
