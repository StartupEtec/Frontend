import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { RoleCardProps } from "../../types/role";
import { spacing, borderRadius, typography, shadows } from "../../theme/tokens";

export const RoleCard: React.FC<RoleCardProps> = ({
  title,
  description,
  iconName,
  accentColor,
  onSelect,
  role,
  testID,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: accentColor }]}
      activeOpacity={0.7}
      onPress={() => onSelect(role)}
      testID={testID}
      accessibilityLabel={`Seleccionar rol ${title}`}
      accessibilityRole="button"
    >
      <View
        style={[styles.iconCircle, { backgroundColor: accentColor + "20" }]}
      >
        <Text style={styles.iconText}>{iconName}</Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      <View style={[styles.selectButton, { backgroundColor: accentColor }]}>
        <Text style={styles.selectButtonText}>Seleccionar</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    marginHorizontal: spacing.sm,
    minHeight: 220,
    ...shadows.card,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    color: "#F8FAFC",
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  description: {
    color: "#94A3B8",
    fontSize: typography.fontSizes.sm,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.md,
    flexShrink: 1,
  },
  selectButton: {
    width: "100%",
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  selectButtonText: {
    color: "#FFFFFF",
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
});

export default RoleCard;
