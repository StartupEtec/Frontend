import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, typography } from "../../theme/tokens";

interface ProfileInfoRowProps {
  label: string;
  value: string;
  /** Última fila: se omite el separador inferior. */
  last?: boolean;
  testID?: string;
  /** Si se pasa, muestra un botón de edición al lado de la etiqueta. */
  onEdit?: () => void;
  /** testID del botón de edición. */
  editTestID?: string;
  /** Deshabilita el botón mientras se guarda. */
  editDisabled?: boolean;
  editAccessibilityLabel?: string;
  accentColor?: string;
}

/** Fila label + valor para "Editar Perfil", con edición opcional. */
export const ProfileInfoRow: React.FC<ProfileInfoRowProps> = ({
  label,
  value,
  last = false,
  testID,
  onEdit,
  editTestID,
  editDisabled = false,
  editAccessibilityLabel,
  accentColor = colors.primary,
}) => (
  <View style={[styles.row, !last && styles.rowDivider]}>
    <View style={styles.topRow}>
      <Text style={styles.label}>{label}</Text>
      {onEdit && (
        <TouchableOpacity
          onPress={onEdit}
          disabled={editDisabled}
          style={styles.editButton}
          testID={editTestID}
          accessibilityRole="button"
          accessibilityLabel={editAccessibilityLabel ?? `Editar ${label}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather
            name="edit-2"
            size={16}
            color={accentColor}
            accessible={false}
          />
        </TouchableOpacity>
      )}
    </View>
    <Text
      style={[styles.value, !value && styles.valueEmpty]}
      testID={testID}
      accessibilityLabel={label}
    >
      {value || "No definido"}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  editButton: {
    padding: spacing.xs,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
  },
  valueEmpty: {
    color: colors.textMuted,
    fontStyle: "italic",
  },
});

export default ProfileInfoRow;
