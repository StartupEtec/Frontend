import { useCallback, useEffect, useRef, useState } from 'react';
import { chatService } from '../services/chatService';
import { tokenStorage } from '../services/tokenStorage';
import { ChatMessage } from '../types/chat';
import { useChat } from './useChat';

export interface UseConversationProps {
  /** ID del usuario con el que se chatea (el otro participante). */
  userId: string;
  /** ID del chat (opcional, si ya se conoce). */
  initialChatId?: string;
  /** Rol activo del usuario autenticado. */
  role?: 'client' | 'worker';
}

export interface UseConversationReturn {
  chatId: string | null;
  myUserId: string | null;
  otherUser: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  /** Estado de inicialización del chat. */
  initStatus: 'idle' | 'loading' | 'success' | 'error';
  initError: string | null;
  /** Estado del chat (mensajes, envío, escritura, etc.). */
  messages: ChatMessage[];
  chatStatus: 'idle' | 'loading' | 'success' | 'error';
  chatError: string | null;
  isSending: boolean;
  typingUserIds: string[];
  imagePreview: string | null;
  /** Enviar mensaje de texto. */
  sendMessage: (text: string) => Promise<void>;
  /** Enviar imagen (guarda en previsualización, no envía aún). */
  setImagePreview: (uri: string | null) => void;
  /** Enviar imagen en previsualización. */
  sendPreviewImage: () => Promise<void>;
  /** Quitar previsualización de imagen. */
  removeImagePreview: () => void;
  /** Establecer estado de escritura. */
  setTyping: (isTyping: boolean) => void;
  /** Cargar mensajes anteriores. */
  loadMore: () => Promise<void>;
  /** Desconectar WebSocket. */
  disconnect: () => void;
}

/**
 * Hook de conversación.
 *
 * Gestiona:
 * 1. Resolución del user_id autenticado desde el JWT.
 * 2. Inicialización del chat (buscar existente o crear uno nuevo).
 * 3. Previsualización de imagen antes del envío.
 * 4. Delegación al hook useChat para mensajes, WebSocket y envío.
 */
export const useConversation = ({
  userId,
  initialChatId,
}: UseConversationProps): UseConversationReturn => {
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(initialChatId ?? null);
  const [otherUser, setOtherUser] = useState<{
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [initStatus, setInitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [initError, setInitError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const initializedRef = useRef(false);

  // --- 1. Resolver user_id autenticado desde el JWT ---
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

  // --- 2. Inicializar el chat cuando tenemos myUserId y userId ---
  useEffect(() => {
    if (!myUserId || !userId || initializedRef.current) return;

    const initChat = async () => {
      setInitStatus('loading');
      setInitError(null);

      try {
        if (initialChatId) {
          // Ya tenemos un chatId, solo cargar info del otro usuario
          setChatId(initialChatId);
          setOtherUser({
            user_id: userId,
            full_name: null,
            avatar_url: null,
          });
          setInitStatus('success');
          initializedRef.current = true;
          return;
        }

        // Buscar si ya existe un chat con este usuario
        const result = await chatService.listChats({
          limit: 50,
          offset: 0,
        });

        const existingChat = result.chats.find((c) => c.other_user.user_id === userId);

        if (existingChat) {
          setChatId(existingChat.chat_id);
          setOtherUser(existingChat.other_user);
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
        }

        setInitStatus('success');
      } catch (err: unknown) {
        console.error('Error initializing chat:', err);
        setInitError('No se pudo inicializar el chat');
        setInitStatus('error');
      }

      initializedRef.current = true;
    };

    initChat();
  }, [myUserId, userId, initialChatId]);

  // --- 3. Delegar a useChat una vez que tenemos chatId y myUserId ---
  const {
    messages,
    status: chatStatus,
    error: chatError,
    isSending,
    typingUserIds,
    sendMessage: useChatSendMessage,
    sendImage,
    loadMore,
    setTyping,
    disconnect,
  } = useChat({
    chatId: chatId ?? '',
    userId: myUserId ?? '',
  });

  // --- 4. Enviar mensaje de texto ---
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isSending || !chatId || !myUserId) return;
      try {
        await useChatSendMessage(text);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al enviar mensaje';
        // El error ya se gestiona internamente en useChat, pero lo re-lanzamos
        // por si el llamante quiere reaccionar.
        throw new Error(message);
      }
    },
    [chatId, myUserId, isSending, useChatSendMessage]
  );

  // --- 5. Enviar imagen en previsualización ---
  const sendPreviewImage = useCallback(async () => {
    if (!imagePreview || isSending || !chatId || !myUserId) return;
    try {
      await sendImage(imagePreview);
      setImagePreview(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al enviar imagen';
      throw new Error(message);
    }
  }, [imagePreview, isSending, chatId, myUserId, sendImage]);

  return {
    chatId,
    myUserId,
    otherUser,
    initStatus,
    initError,
    messages,
    chatStatus,
    chatError,
    isSending,
    typingUserIds,
    imagePreview,
    sendMessage,
    setImagePreview,
    sendPreviewImage,
    removeImagePreview: () => setImagePreview(null),
    setTyping,
    loadMore,
    disconnect,
  };
};

export default useConversation;
