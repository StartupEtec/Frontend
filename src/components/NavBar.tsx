import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { UserRole } from '../types/role';
import { colors, spacing, typography } from '../theme/tokens';

interface NavBarProps {
  currentRole: UserRole;
  onNavigateToOrders: () => void;
  onNavigateToChats: () => void;
  onNavigateToProfile: () => void;
}

export const NavBar: React.FC<NavBarProps> = ({
  currentRole,
  onNavigateToOrders,
  onNavigateToChats,
  onNavigateToProfile,
}) => {
  const isClient = currentRole === 'client';
  const accentColor = isClient ? colors.clientAccent : colors.workerAccent;

  return (
    <View style={styles.bar}>
      <View style={styles.titleGroup}>
        <Text style={styles.title}>Labor-In</Text>
        <Text style={[styles.modeText, { color: accentColor }]}>
          {isClient ? 'Modo Cliente' : 'Modo Trabajador'}
        </Text>
      </View>

      <View style={styles.actionsGroup}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onNavigateToOrders}
          testID="btn-orders"
          accessibilityRole="button"
          accessibilityLabel="Mis pedidos"
        >
          <Feather name="list" size={20} color={colors.textPrimary} accessible={false} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onNavigateToChats}
          testID="btn-chats"
          accessibilityRole="button"
          accessibilityLabel="Chats"
        >
          <Feather name="message-circle" size={20} color={colors.textPrimary} accessible={false} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.accountButton}
          onPress={onNavigateToProfile}
          testID="btn-account"
          accessibilityRole="button"
          accessibilityLabel="Mi perfil"
        >
          <Feather name="user" size={20} color={colors.textPrimary} accessible={false} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleGroup: {
    flexDirection: 'column',
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
  actionsGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  accountButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
});

export default NavBar;
