import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { RoleCard } from "../components/role/RoleCard";
import { RoleSelectionFooter } from "../components/role/RoleSelectionFooter";
import { useRoleSelection } from "../hooks/useRoleSelection";
import { RoleSelectionScreenProps } from "../types/role";
import { colors, spacing, typography } from "../theme/tokens";

const CLIENT_ROLE = {
  role: "client" as const,
  title: "Cliente",
  description: "Encontrá profesionales verificados para todo lo que necesités.",
  iconName: "🔍",
  accentColor: colors.clientAccent,
};

const WORKER_ROLE = {
  role: "worker" as const,
  title: "Trabajador",
  description:
    "Publicá tus servicios, elegí tus horarios y cobrá con seguridad.",
  iconName: "🛠️",
  accentColor: colors.workerAccent,
};

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({
  onRoleSelected,
}) => {
  const { isSaving, error, handleSelectRole, confirmSelection } =
    useRoleSelection(onRoleSelected);

  const handleCardSelect = (role: "client" | "worker") => {
    if (isSaving) return;
    handleSelectRole(role);
    confirmSelection();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Elegí tu Rol</Text>
          <Text style={styles.subtitle}>
            Seleccioná cómo querés usar la plataforma. Podés alternar entre
            ambos en cualquier momento.
          </Text>
        </View>

        {error && (
          <View style={styles.errorBox} testID="role-error-banner">
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.cardsRow}>
          <RoleCard
            {...CLIENT_ROLE}
            onSelect={handleCardSelect}
            testID="card-client"
          />
          <RoleCard
            {...WORKER_ROLE}
            onSelect={handleCardSelect}
            testID="card-worker"
          />
        </View>

        {isSaving && (
          <View style={styles.savingOverlay} testID="saving-overlay">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        <RoleSelectionFooter testID="role-footer" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    padding: spacing.md,
    justifyContent: "center",
  },
  header: { marginBottom: spacing.xl },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: spacing.sm,
  },
  cardsRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: colors.error,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    textAlign: "center",
  },
  savingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    marginTop: spacing.xl,
  },
});

export default RoleSelectionScreen;
