import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme/tokens';

interface BaseModalProps {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  testID?: string;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  visible,
  onRequestClose,
  children,
  testID,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay} testID={testID}>
      <Pressable
        style={styles.backdrop}
        onPress={onRequestClose}
        accessibilityLabel="Cerrar"
        accessibilityRole="button"
      />
      <View style={styles.modal}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlayBackground,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
  },
  modal: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: spacing.lg,
    maxHeight: '90%',
  },
});
