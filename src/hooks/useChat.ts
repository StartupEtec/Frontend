import { useCallback, useEffect, useRef, useState } from 'react';
import { chatService } from '../services/chatService';
import { ChatMessage } from '../types/chat';
import { tokenStorage } from '../services/tokenStorage';

export interface UseChatProps {
  chatId: string;
  userId: string;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  isSending: boolean;
  typingUserIds: string[];
  isTyping: boolean;
  sendMessage: (text: string) => Promise<void>;
  sendImage: (imageUri: string) => Promise<void>;
  loadMore: () => Promise<void>;
  setTyping: (isTyping: boolean) => void;
  disconnect: () => void;
}

/**
 * Hook para gestionar el chat en tiempo real.
 * Carga mensajes vía GET /chats/:chat_id/messages y usa WebSocket
 * para recibir mensajes nuevos y notificaciones de escritura en tiempo real.
 */
export const useChat = ({ chatId, userId }: UseChatProps): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const offsetRef = useRef(0);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsUrlRef = useRef<string>('');

  /**
   * Carga los mensajes del chat.
   */
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
        setMessages((prev) => (append ? [...prev, ...result.messages] : result.messages));
        offsetRef.current = offset + result.messages.length;
        setStatus('success');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al cargar mensajes';
        setError(message);
        setStatus('error');
      }
    },
    [chatId]
  );

  /**
   * Envía un mensaje de texto con optimistic update.
   * El mensaje se muestra inmediatamente en el historial y se reemplaza
   * por el real cuando el servidor responde o llega vía WebSocket.
   */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isSending) return;
      setIsSending(true);
      const tempId = `temp-${Date.now()}`;
      const optimistic: ChatMessage = {
        id: tempId,
        chat_id: chatId,
        sender_id: userId,
        content: text,
        message_type: 'TEXT',
        attachment_url: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      try {
        const real = await chatService.sendMessage(chatId, userId, {
          message_type: 'TEXT',
          content: text,
        });
        setMessages((prev) => prev.map((m) => (m.id === tempId ? real : m)));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al enviar mensaje';
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setError(message);
      } finally {
        setIsSending(false);
      }
    },
    [chatId, userId, isSending]
  );

  /**
   * Envía una imagen como mensaje con optimistic update.
   * La imagen se muestra inmediatamente en el historial usando el URI local
   * mientras el servidor procesa la subida y devuelve la URL definitiva.
   */
  const sendImage = useCallback(
    async (imageUri: string) => {
      if (isSending) return;
      setIsSending(true);
      const tempId = `temp-${Date.now()}`;
      const optimistic: ChatMessage = {
        id: tempId,
        chat_id: chatId,
        sender_id: userId,
        content: null,
        message_type: 'IMAGE',
        attachment_url: imageUri,
        avatar_url: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      try {
        const real = await chatService.sendMessage(chatId, userId, {
          message_type: 'IMAGE',
          content: null,
          imageUri,
        });
        setMessages((prev) => prev.map((m) => (m.id === tempId ? real : m)));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al enviar imagen';
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setError(message);
      } finally {
        setIsSending(false);
      }
    },
    [chatId, userId, isSending]
  );

  /**
   * Conecta al WebSocket para recibir mensajes y eventos de escritura en tiempo real.
   * Incluye lógica de reconexión automática ante fallos de conexión.
   */
  const connectWebSocket = useCallback(async () => {
    if (!chatId) return;

    // Cancelar cualquier reconexión pendiente
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Cerrar WebSocket previo si existe
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const token = await tokenStorage.getAccessToken();
      if (!token) return;

      const url = `${
        process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3000'
      }/ws?token=${encodeURIComponent(token)}`;
      wsUrlRef.current = url;

      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('WebSocket conectado');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { event: eventType, payload } = data;

          if (eventType === 'message:new' && payload.chat_id === chatId) {
            setMessages((prev) => {
              // Evitar duplicados
              if (prev.some((m) => m.id === payload.message.id)) return prev;
              return [...prev, payload.message];
            });
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
        // No logueamos el objeto completo de error porque es muy ruidoso.
        // Se intenta reconectar automáticamente.
        console.warn('WebSocket error de conexión, reintentando...');
        scheduleReconnect();
      };

      ws.onclose = () => {
        console.log('WebSocket desconectado');
        scheduleReconnect();
      };

      wsRef.current = ws;
    } catch {
      scheduleReconnect();
    }
  }, [chatId, userId]);

  /**
   * Programa una reconexión tras 3 segundos.
   */
  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) return;
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      connectWebSocket();
    }, 3000);
  };

  /**
   * Desconecta el WebSocket.
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  /**
   * Establece el estado de escritura y envía el evento al servidor.
   */
  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (isTypingRef.current === isTyping) return;
      isTypingRef.current = isTyping;

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

      // Resetear el temporizador para dejar de escribir después de 3 segundos
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(false);
        }, 3000);
      }
    },
    [chatId]
  );

  // Cargar mensajes al montar (o al cambiar de chat)
  useEffect(() => {
    loadMessages(0);
  }, [chatId, loadMessages]);

  // Resetear el offset de paginación al cambiar de chat
  useEffect(() => {
    offsetRef.current = 0;
  }, [chatId]);

  // Conectar WebSocket al montar
  useEffect(() => {
    connectWebSocket();
    return () => {
      disconnect();
    };
  }, [chatId, connectWebSocket, disconnect]);

  return {
    messages,
    status,
    error,
    isSending,
    typingUserIds,
    isTyping: isTypingRef.current,
    sendMessage,
    sendImage,
    loadMore: () => loadMessages(offsetRef.current, true),
    setTyping,
    disconnect,
  };
};

export default useChat;
