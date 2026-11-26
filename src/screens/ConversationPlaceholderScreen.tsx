import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing, typography } from '../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ConversationPlaceholderScreenProps {
  chatId?: string;
  onGoBack: () => void;
}

/**
 * Pantalla de conversación (placeholder, Issue #30).
 *
 * Pantalla muy básica para poder navegar desde la lista de chats:
 * título, flecha para volver y el ID del chat si se conoce.
 * La conversación completa se implementa en un issue futuro.
 */
export const ConversationPlaceholderScreen: React.FC<ConversationPlaceholderScreenProps> = ({
  chatId,
  onGoBack,
}) => {
  const topInset = useSafeAreaInsets().top;
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: topInset }]}>
        <TouchableOpacity
          onPress={onGoBack}
          style={styles.backButton}
          testID="btn-conversation-back"
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Chat</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.center}>
        <Text style={styles.chatIdText}>{chatId ? `Chat: ${chatId}` : 'Sin ID de chat'}</Text>
        <Text style={styles.hint}>Pantalla de conversación en desarrollo.</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  backArrow: { fontSize: 24, fontWeight: 'bold' },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: { width: 40 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  chatIdText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  hint: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
  },
});

export default ConversationPlaceholderScreen;
