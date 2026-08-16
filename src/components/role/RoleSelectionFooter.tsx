import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, borderRadius, typography } from "../../theme/tokens";

interface RoleSelectionFooterProps {
  testID?: string;
}

export const RoleSelectionFooter: React.FC<RoleSelectionFooterProps> = ({
  testID,
}) => (
  <View style={styles.container} testID={testID}>
    <Text style={styles.icon}>ℹ️</Text>
    <Text style={styles.text}>
      Podés cambiar tu rol en cualquier momento desde Configuración
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  icon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  text: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    flex: 1,
    lineHeight: 20,
  },
});

export default RoleSelectionFooter;
