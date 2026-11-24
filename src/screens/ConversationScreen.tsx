import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { UserRole } from '../types/role';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  roleAccent,
} from '../theme/tokens';
import { ChatMessage } from '../types/chat';
import { toDisplayUri } from '../services/profileService';
import { chatService } from '../services/chatService';
import { tokenStorage } from '../services/tokenStorage';
import { MessageBubble } from '../components/chat/MessageBubble';
import { MessageInput } from '../components/chat/MessageInput';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { ScrollToBottomButton } from '../components/chat/ScrollToBottomButton';

export interface ConversationScreenProps {
  /** ID del usuario con el que se chatea (el otro participante). */
  userId: string;
  /** ID del chat (opcional, si ya se conoce). */
  chatId?: string;
  onGoBack: () => void;
  role?: UserRole;
}

export const ConversationScreen: React.FC<ConversationScreenProps> = ({
  userId,
  chatId: initialChatId,
  onGoBack,
  role = 'client',
}) => {
  const accentColor = roleAccent(role);
  const [chatId, setChatId] = useState<string | null>(initialChatId ?? null);
  const [otherUser, setOtherUser] = useState<{
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Obtener el user_id autenticado del token JWT
  useEffect(() => {
    const loadMyUserId = async () => {
      const token = await tokenStorage.getAccessToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setMyUserId(payload.user_id);
        } catch {
          // Ignorar errores de parseo
        }
      }
    };
    loadMyUserId();
  }, []);

  // Inicializar el chat cuando tenemos myUserId y userId
  useEffect(() => {
    if (!myUserId || !userId) return;

    const initChat = async () => {
      if (chatId) {
        // Ya tenemos un chatId, solo cargar los mensajes
        setOtherUser({
          user_id: userId,
          full_name: null,
          avatar_url: null,
        });
        await loadMessages(0);
        return;
      }

      // Buscar si ya existe un chat con este usuario
      try {
        const result = await chatService.list({
          limit: 50,
          offset: 0,
        });

        const existingChat = result.chats.find(
          (c) => c.other_user.user_id === userId
        );

        if (existingChat) {
          setChatId(existingChat.chat_id);
          setOtherUser(existingChat.other_user);
          await loadMessages(0);
        } else {
          // Crear un nuevo chat
          const created = await chatService.createChat({
            user_id_2: userId,
          });
          setChatId(created.chat_id);
          setOtherUser({
            user_id: userId,
            full_name: null,
            avatar_url: null,
          });
          await loadMessages(0);
        }
      } catch (err: unknown) {
        console.error('Error initializing chat:', err);
        setError('No se pudo inicializar el chat');
      }
    };

    initChat();
  }, [myUserId, userId, chatService]);

  // Conectar WebSocket cuando tengamos chatId y myUserId
  useEffect(() => {
    if (!chatId || !myUserId) return;

    const connectWS = async () => {
      const token = await tokenStorage.getAccessToken();
      if (!token) return;

      const wsUrl = `${
        process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3000'
      }/ws?token=${encodeURIComponent(token)}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket conectado');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { event: eventType, payload } = data;

          if (eventType === 'message:new' && payload.chat_id === chatId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.message.id)) return prev;
              return [...prev, payload.message];
            });
            scrollToBottom();
          }

          if (eventType === 'user:typing' && payload.chat_id === chatId) {
            const { user_id: raterId, is_typing: isTyping } = payload;
            if (isTyping) {
              setTypingUserIds((prev) => (prev.includes(raterId) ? prev : [...prev, raterId]));
            } else {
              setTypingUserIds((prev) => prev.filter((id) => id !== raterId));
            }
          }
        } catch {
          // Ignorar errores de parseo
        }
      };

      ws.onerror = () => {
        console.error('WebSocket error:', err);
        // No mostrar error al usuario, solo registrar en consola
      };

      ws.onclose = () => {
        console.log('WebSocket desconectado');
      };

      wsRef.current = ws;
    };

    connectWS();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [chatId, myUserId]);

  // Cargar mensajes
  const loadMessages = useCallback(
    async (offset: number = 0, append: boolean = false) => {
      if (!chatId) return;
      setStatus('loading');
      setError(null);
      try {
        const result = await chatService.listMessages(chatId, {
          limit: 50,
          offset,
        });
        setMessages((prev) =>
          append ? [...prev, ...result.messages] : result.messages
        );
        setStatus('success');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al cargar mensajes';
        setError(message);
        setStatus('error');
      }
    },
    [chatId, chatService],
  );

  // Enviar mensaje de texto
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isSending || !chatId) return;
      setIsSending(true);
      try {
        await chatService.sendMessage(chatId, myUserId!, {
          message_type: 'TEXT',
          content: text,
        });
        setInputValue('');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al enviar mensaje';
        setError(message);
      } finally {
        setIsSending(false);
      }
    },
    [chatId, myUserId, isSending, chatService],
  );

  // Enviar imagen (abre el picker y envía)
  const sendImage = useCallback(
    async (imageUri: string) => {
      if (isSending || !chatId) return;
      setIsSending(true);
      try {
        await chatService.sendMessage(chatId, myUserId!, {
          message_type: 'IMAGE',
          content: null,
          imageUri,
        });
        setImagePreview(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al enviar imagen';
        setError(message);
      } finally {
        setIsSending(false);
      }
    },
    [chatId, myUserId, isSending, chatService],
  );

  // Establecer estado de escritura
  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!chatId || !myUserId) return;
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'user:typing',
            chat_id: chatId,
            is_typing: isTyping,
          })
        );
      }
    },
    [chatId, myUserId],
  );

  // Scroll al final
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  };

  // Scroll al final cuando llegan nuevos mensajes
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Abrir selector de imagen
  const openImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        base64: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await sendImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setError('Error al seleccionar imagen');
    }
  };

  const showScrollToBottom = messages.length > 5;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onGoBack}
          style={styles.backButton}
          testID="btn-conversation-back"
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={[styles.backArrow, { color: accentColor }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          {otherUser?.avatar_url ? (
            <Image source={{ uri: toDisplayUri(otherUser.avatar_url) }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Feather name="user" size={28} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.headerTexts}>
            <Text style={styles.headerName}>
              {otherUser?.full_name ?? 'Trabajador'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {messages.length > 0
                ? `${messages.length} mensaje${messages.length !== 1 ? 's' : ''}`
                : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.infoButton}
          accessibilityRole="button"
          accessibilityLabel="Información del trabajador"
        >
          <Feather name="info" size={20} color={colors.textMuted} accessible={false} />
        </TouchableOpacity>
      </View>

      {/* Indicador de escritura */}
      {typingUserIds.length > 0 && (
        <View style={styles.typingContainer}>
          <TypingIndicator
            typingUserIds={typingUserIds}
            typingUserName={
              typingUserIds.length === 1 ? otherUser?.full_name : undefined
            }
          />
        </View>
      )}

      {/* Lista de mensajes */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.messagesContainer}
        keyboardShouldPersistTaps="handled"
      >
        {status === 'loading' && messages.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={accentColor} />
            <Text style={styles.loadingText}>Cargando mensajes...</Text>
          </View>
        )}
        {status === 'error' && messages.length === 0 && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error ?? 'Error al cargar mensajes'}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: accentColor }]}
              onPress={() => loadMessages(0)}
              testID="btn-chat-retry"
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}
        {messages.map((message) => {
          const isOwn = message.sender_id === myUserId;
          return (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={isOwn}
              accentColor={accentColor}
            />
          );
        })}
        {messages.length > 5 && (
          <ScrollToBottomButton
            onPress={scrollToBottom}
            accentColor={accentColor}
          />
        )}
      </ScrollView>

      {/* Input de mensaje */}
      <View style={styles.inputContainer}>
        <TypingIndicator
          typingUserIds={typingUserIds}
          typingUserName={
            typingUserIds.length === 1 ? otherUser?.full_name : undefined
          }
        />
        <MessageInput
          value={inputValue}
          onChangeText={setInputValue}
          onSendMessage={sendMessage}
          onSendImage={openImagePicker}
          isSending={isSending}
        />
      </View>
    </SafeAreaView>
  );
};

export default ConversationScreen;

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
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarFallback: {
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: {
    flex: 1,
    gap: 2,
  },
  headerName: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
  },
  infoButton: {
    padding: spacing.xs,
  },
  typingContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  messagesContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  retryText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
});
