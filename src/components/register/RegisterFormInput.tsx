import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardTypeOptions,
} from "react-native";
import { colors, spacing, borderRadius, typography } from "../../theme/tokens";

interface RegisterFormInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  onToggleSecureTextEntry?: () => void;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  testID?: string;
  editable?: boolean;
}

export const RegisterFormInput: React.FC<RegisterFormInputProps> = ({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  placeholder,
  secureTextEntry,
  onToggleSecureTextEntry,
  keyboardType = "default",
  autoCapitalize = "none",
  testID,
  editable = true,
}) => {
  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, hasError && styles.inputWrapperError]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          testID={testID}
          accessibilityLabel={label}
        />
        {onToggleSecureTextEntry && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={onToggleSecureTextEntry}
            accessibilityLabel={
              secureTextEntry ? "Mostrar contraseña" : "Ocultar contraseña"
            }
            accessibilityRole="button"
            testID={`${testID}-toggle`}
          >
            <Text style={styles.toggleText}>
              {secureTextEntry ? "👁️" : "🙈"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {hasError && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  inputWrapperError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    height: 48,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
  },
  toggleButton: {
    padding: spacing.xs,
  },
  toggleText: {
    fontSize: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
  },
});
