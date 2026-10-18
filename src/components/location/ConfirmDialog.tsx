import React from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from "../../theme/tokens";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Diálogo de confirmación reutilizable (por defecto, para acciones destructivas). */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = true,
  busy = false,
  onConfirm,
  onCancel,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onCancel}
  >
    <View style={styles.overlay}>
      <View style={styles.card} testID="confirm-dialog">
        <Text style={styles.title} testID="confirm-dialog-title">
          {title}
        </Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancel}
            onPress={onCancel}
            disabled={busy}
            testID="confirm-dialog-cancel"
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirm, destructive && styles.confirmDanger]}
            onPress={onConfirm}
            disabled={busy}
            testID="confirm-dialog-confirm"
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing.sm,
  },
  message: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    lineHeight: typography.lineHeights.normal * typography.fontSizes.sm,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancel: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
  },
  confirm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    minWidth: 96,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  confirmDanger: {
    backgroundColor: colors.error,
  },
  confirmText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default ConfirmDialog;
