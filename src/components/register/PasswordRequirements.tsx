import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PasswordCriteriaStatus } from "../../types/auth";
import { colors, spacing, borderRadius, typography } from "../../theme/tokens";

interface PasswordRequirementsProps {
  status: PasswordCriteriaStatus;
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
  status,
}) => {
  const criteriaList = [
    { key: "minLength", label: "Mínimo 8 caracteres", isMet: status.minLength },
    {
      key: "hasUppercase",
      label: "Al menos una mayúscula (A-Z)",
      isMet: status.hasUppercase,
    },
    {
      key: "hasLowercase",
      label: "Al menos una minúscula (a-z)",
      isMet: status.hasLowercase,
    },
    {
      key: "hasNumber",
      label: "Al menos un número (0-9)",
      isMet: status.hasNumber,
    },
    {
      key: "hasSymbol",
      label: "Al menos un símbolo (!@#$%^&*)",
      isMet: status.hasSymbol,
    },
  ];

  return (
    <View style={styles.container} testID="password-requirements">
      <Text style={styles.title}>Requisitos de la contraseña:</Text>
      {criteriaList.map((item) => (
        <View key={item.key} style={styles.itemRow}>
          <Feather
            name={item.isMet ? "check" : "circle"}
            size={14}
            color={item.isMet ? colors.success : colors.textMuted}
            accessible={false}
          />
          <Text
            style={[
              styles.itemText,
              item.isMet ? styles.textMet : styles.textUnmet,
            ]}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.md,
    borderRadius: borderRadius.DEFAULT,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  title: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.xs,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 2,
  },
  itemText: {
    fontSize: typography.fontSizes.xs,
  },
  textMet: {
    color: colors.textPrimary,
  },
  textUnmet: {
    color: colors.textMuted,
  },
});
