import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardTypeOptions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  highlight,
} from '../../theme/tokens';

interface BaseFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  onToggleSecureTextEntry?: () => void;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  testID?: string;
  editable?: boolean;
  required?: boolean;
  accentColor?: string;
  multiline?: boolean;
  maxLength?: number;
  numberOfLines?: number;
  textAlignVertical?: 'top' | 'center';
  /** testID opcional para el texto de error. Por defecto: `error-${testID}`. */
  errorTestID?: string;
}

export const BaseField: React.FC<BaseFieldProps> = ({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  placeholder,
  secureTextEntry,
  onToggleSecureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  testID,
  editable = true,
  required = false,
  accentColor,
  multiline = false,
  maxLength,
  numberOfLines,
  textAlignVertical,
  errorTestID,
}) => {
  const hasError = Boolean(error);
  const borderColor = hasError
    ? colors.error
    : accentColor
      ? accentColor
      : colors.inputBorder;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.requiredAsterisk}>*</Text>}
      </View>
      <View
        style={[
          styles.inputWrapper,
          hasError && styles.inputWrapperError,
          accentColor && !hasError && styles.inputWrapperFocused,
        ]}
      >
        <TextInput
          style={[
            styles.input,
            multiline && styles.inputMultiline,
          ]}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          multiline={multiline}
          maxLength={maxLength}
          numberOfLines={numberOfLines}
          textAlignVertical={textAlignVertical}
          testID={testID}
          accessibilityLabel={label}
        />
        {onToggleSecureTextEntry && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={onToggleSecureTextEntry}
            accessibilityLabel={
              secureTextEntry ? 'Mostrar contraseña' : 'Ocultar contraseña'
            }
            accessibilityRole="button"
            testID={`${testID}-toggle`}
          >
            <Feather
              name={secureTextEntry ? 'eye' : 'eye-off'}
              size={20}
              color={accentColor || colors.textMuted}
              accessible={false}
            />
          </TouchableOpacity>
        )}
      </View>
      {hasError && (
        <Text style={styles.errorText} testID={errorTestID ?? `error-${testID}`}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  label: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  requiredAsterisk: {
    color: highlight,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  inputWrapperError: {
    borderColor: colors.error,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  input: {
    flex: 1,
    height: 48,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
  },
  inputMultiline: {
    height: undefined,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  toggleButton: {
    padding: spacing.xs,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.sm,
  },
});
