import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from "react-native";
import { UserRole } from "../types/role";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from "../theme/tokens";

interface RoleSwitchModalProps {
  visible: boolean;
  currentRole: UserRole;
  isSubmitting: boolean;
  error: string | null;
  onSelectRole: (role: UserRole) => void;
  onDismiss: () => void;
}

export const RoleSwitchModal: React.FC<RoleSwitchModalProps> = ({
  visible,
  currentRole,
  isSubmitting,
  error,
  onSelectRole,
  onDismiss,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  const isClient = currentRole === "client";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      testID="role-switch-modal"
    >
      <Animated.View
        style={[styles.overlay, { opacity: opacityAnim }]}
        testID="modal-overlay"
      >
        <Animated.View
          style={[styles.modalContainer, { transform: [{ scale: scaleAnim }] }]}
        >
          <Text style={styles.title}>Cambiar Rol</Text>
          <Text style={styles.subtitle}>
            Seleccioná el modo en el que querés usar la app
          </Text>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.roleOption,
                isClient && styles.roleOptionActive,
                { borderColor: colors.clientAccent },
                isClient && { backgroundColor: "rgba(59,130,246,0.15)" },
              ]}
              onPress={() => onSelectRole("client")}
              disabled={isSubmitting}
              testID="role-option-client"
              accessibilityRole="radio"
              accessibilityState={{ checked: isClient }}
            >
              <Text style={styles.roleIcon}>🔍</Text>
              <View style={styles.roleInfo}>
                <Text
                  style={[
                    styles.roleTitle,
                    { color: colors.clientAccent },
                  ]}
                >
                  Cliente
                </Text>
                <Text style={styles.roleDescription}>
                  Encontrá trabajadores para lo que necesités
                </Text>
              </View>
              {isClient && (
                <View style={styles.activeIndicator}>
                  <Text style={styles.activeCheck}>✓</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleOption,
                !isClient && styles.roleOptionActive,
                { borderColor: colors.workerAccent },
                !isClient && {
                  backgroundColor: "rgba(16,185,129,0.15)",
                },
              ]}
              onPress={() => onSelectRole("worker")}
              disabled={isSubmitting}
              testID="role-option-worker"
              accessibilityRole="radio"
              accessibilityState={{ checked: !isClient }}
            >
              <Text style={styles.roleIcon}>🛠️</Text>
              <View style={styles.roleInfo}>
                <Text
                  style={[
                    styles.roleTitle,
                    { color: colors.workerAccent },
                  ]}
                >
                  Trabajador
                </Text>
                <Text style={styles.roleDescription}>
                  Ofrecé tus servicios y ganá dinero
                </Text>
              </View>
              {!isClient && (
                <View
                  style={[
                    styles.activeIndicator,
                    { backgroundColor: colors.workerAccent },
                  ]}
                >
                  <Text style={styles.activeCheck}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBox} testID="role-switch-error">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {isSubmitting && (
            <View style={styles.loadingRow} testID="role-switch-loading">
              <ActivityIndicator color={colors.primaryLight} size="small" />
              <Text style={styles.loadingText}>Cambiando rol...</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onDismiss}
            disabled={isSubmitting}
            testID="btn-role-switch-cancel"
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: spacing.md,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  roleOptionActive: {
    borderWidth: 2,
  },
  roleIcon: {
    fontSize: 28,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    marginBottom: 2,
  },
  roleDescription: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
  },
  activeIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.clientAccent,
    justifyContent: "center",
    alignItems: "center",
  },
  activeCheck: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    textAlign: "center",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  cancelButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  cancelText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
});

export default RoleSwitchModal;
