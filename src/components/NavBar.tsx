import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { UserRole } from "../types/role";
import { colors, spacing, typography } from "../theme/tokens";

interface NavBarProps {
  currentRole: UserRole;
  onNavigateToProfile: () => void;
}

export const NavBar: React.FC<NavBarProps> = ({
  currentRole,
  onNavigateToProfile,
}) => {
  const isClient = currentRole === "client";
  const accentColor = isClient ? colors.clientAccent : colors.workerAccent;

  return (
    <View style={styles.bar}>
      <View style={styles.titleGroup}>
        <Text style={styles.title}>StartupApp</Text>
        <Text style={[styles.modeText, { color: accentColor }]}>
          {isClient ? "Modo Cliente" : "Modo Trabajador"}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.accountButton}
        onPress={onNavigateToProfile}
        testID="btn-account"
        accessibilityRole="button"
        accessibilityLabel="Mi perfil"
      >
        <Feather
          name="user"
          size={20}
          color={colors.textPrimary}
          accessible={false}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleGroup: {
    flexDirection: "column",
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  modeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    marginTop: 1,
  },
  accountButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
});

export default NavBar;
