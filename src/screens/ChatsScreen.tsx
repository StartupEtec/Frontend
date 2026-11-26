import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { UserRole } from '../types/role';
import { colors, spacing, borderRadius, typography, roleAccent } from '../theme/tokens';
import { ChatListItem } from '../components/chat/ChatListItem';
import { chatService } from '../services/chatService';
import { ApiError } from '../services/api';
import type { ChatListItem as ChatListItemType } from '../types/chat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Pantalla de lista de chats (Issue #30).
 *
 * Estilo WhatsApp-like: título "Chats", barra de búsqueda por nombre,
 * lista de conversaciones con avatar, nombre, último mensaje, hora y
 * badge de no leídos. Al tocar un chat navega a la pantalla de
 * conversación (placeholder por ahora).
 *
 * Los datos se cargan con GET /users/me/chats a través de chatService.
 * El token JWT se adjunta automáticamente vía apiClient.
 */
export const ChatsScreen: React.FC<{
  role?: UserRole;
  onGoBack: () => void;
  onNavigateToConversation: (chatId: string) => void;
}> = ({ role = 'client', onGoBack, onNavigateToConversation }) => {
  const accentColor = roleAccent(role);
  const topInset = useSafeAreaInsets().top;
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState<ChatListItemType[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [didLoad, setDidLoad] = useState(false);

  const load = useCallback(async (search: string) => {
    setStatus('loading');
    setError(null);
    try {
      const result = await chatService.listChats({
        limit: 20,
        offset: 0,
        status: 'all',
        search,
      });
      setChats(result.chats);
      setStatus('success');
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cargar los chats.');
      setStatus('error');
    }
  }, []);

  if (!didLoad) {
    setDidLoad(true);
    void load(searchQuery);
  }

  const handleRefresh = useCallback(() => {
    void load(searchQuery);
  }, [searchQuery, load]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    void load(text);
  };

  const filteredChats = searchQuery
    ? chats.filter((c) => c.other_user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : chats;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: topInset }]}>
        <TouchableOpacity
          onPress={onGoBack}
          style={styles.backButton}
          testID="btn-chats-back"
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={[styles.backArrow, { color: accentColor }]}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mensajes</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Feather name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar conversaciones"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearchChange}
            testID="input-chats-search"
            autoCapitalize="none"
          />
        </View>
      </View>

      {status === 'loading' && chats.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={accentColor} />
          <Text style={styles.loadingText}>Cargando conversaciones...</Text>
        </View>
      ) : filteredChats.length === 0 ? (
        <View style={styles.center}>
          {status === 'error' ? (
            <>
              <Text style={styles.errorText} testID="chats-error">
                {error ?? 'No pudimos cargar los chats.'}
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: accentColor }]}
                onPress={handleRefresh}
                testID="btn-chats-retry"
                accessibilityRole="button"
              >
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Feather name="inbox" size={40} color={colors.textMuted} style={styles.emptyIcon} />
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'No se encontraron conversaciones.'
                  : 'Todavía no tienes conversaciones.'}
              </Text>
            </>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {filteredChats.map((chat) => (
            <ChatListItem
              key={chat.chat_id}
              chat={chat}
              onPress={onNavigateToConversation}
              accentColor={accentColor}
            />
          ))}
        </ScrollView>
      )}
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
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  searchIcon: { marginRight: spacing.xs },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'transparent',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.md,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  retryButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  retryText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  emptyIcon: {
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: spacing.xs,
  },
  footer: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerError: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
  },
});

export default ChatsScreen;
