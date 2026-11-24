import { apiClient } from './api';
import {
  ChatListParams,
  ChatListResponse,
  ChatMessage,
  ChatMessagesParams,
  ChatMessagesResponse,
  CreateChatParams,
  CreateChatResponse,
} from '../types/chat';

/** Tamaño de página por defecto para la lista de mensajes. */
export const MESSAGES_PAGE_SIZE = 50;

/**
 * Servicio de chats y mensajes (Issue #31).
 *
 * Endpoints:
 * - GET /users/me/chats - lista los chats del usuario autenticado
 * - GET /chats/:chatId/messages - lista los mensajes de un chat
 * - POST /chats/:chatId/messages - envía un mensaje (texto o imagen)
 * - POST /users/me/chats - crea un chat con otro usuario
 *
 * El apiClient adjunta automáticamente el Bearer token y gestiona el refresh de sesión.
 */
export const chatService = {
  /**
   * Lista los chats del usuario autenticado.
   */
  async listChats(params: ChatListParams = {}): Promise<ChatListResponse> {
    const limit = params.limit ?? MESSAGES_PAGE_SIZE;
    const offset = params.offset ?? 0;
    const status = params.status ?? 'all';
    const search = params.search ?? '';

    const queryParams = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      status: status,
    });
    if (search) {
      queryParams.append('search', search);
    }

    const res = await apiClient<ChatListResponse>(`/users/me/chats?${queryParams.toString()}`, {
      method: 'GET',
    });

    const chats = Array.isArray(res.chats) ? res.chats : [];
    return {
      chats,
      count: typeof res.count === 'number' ? res.count : chats.length,
      limit: typeof res.limit === 'number' ? res.limit : limit,
      offset: typeof res.offset === 'number' ? res.offset : offset,
    };
  },

  /**
   * Lista los mensajes de un chat específico.
   */
  async listMessages(
    chatId: string,
    params: ChatMessagesParams = {}
  ): Promise<ChatMessagesResponse> {
    const limit = params.limit ?? MESSAGES_PAGE_SIZE;
    const offset = params.offset ?? 0;

    const res = await apiClient<ChatMessagesResponse>(
      `/chats/${chatId}/messages?limit=${limit}&offset=${offset}`,
      { method: 'GET' }
    );

    const messages = Array.isArray(res.messages) ? res.messages : [];
    return {
      messages,
      count: typeof res.count === 'number' ? res.count : messages.length,
      limit: typeof res.limit === 'number' ? res.limit : limit,
      offset: typeof res.offset === 'number' ? res.offset : offset,
    };
  },

  /**
   * Envía un mensaje de texto o imagen.
   * Devuelve el mensaje creado (incluye id, attachment_url, etc.).
   */
  async sendMessage(
    chatId: string,
    userId: string,
    params: { message_type: 'TEXT' | 'IMAGE'; content?: string | null; imageUri?: string }
  ): Promise<ChatMessage> {
    if (params.message_type === 'IMAGE' && params.imageUri) {
      // Para imágenes, usamos form-data
      const formData = new FormData();
      formData.append('message_type', 'IMAGE');
      formData.append('content', params.content || '');
      // @ts-ignore - expo-image-picker URI
      formData.append('file', {
        uri: params.imageUri,
        type: 'image/jpeg',
        name: 'image.jpg',
      } as any);

      const res = await apiClient<{ message: ChatMessage }>(`/chats/${chatId}/messages`, {
        method: 'POST',
        body: formData,
      });
      return res.message;
    } else {
      const res = await apiClient<{ message: ChatMessage }>(`/chats/${chatId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          message_type: params.message_type,
          content: params.content,
        }),
      });
      return res.message;
    }
  },

  /**
   * Crea un chat con otro usuario.
   */
  async createChat(params: CreateChatParams): Promise<CreateChatResponse> {
    const res = await apiClient<CreateChatResponse>('/users/me/chats', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res;
  },
};

export default chatService;
