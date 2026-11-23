import { apiClient } from './api';
import { ChatListResponse, ChatListParams } from '../types/chat';

/** Tamaño de página por defecto para la lista de chats. */
export const CHATS_PAGE_SIZE = 20;

/**
 * Servicio de chats (Issue #30).
 *
 * GET /users/me/chats devuelve la lista de conversaciones del usuario
 * autenticado con el último mensaje, contador de no leídos y datos del
 * otro participante. El `apiClient` adjunta automáticamente el Bearer token
 * y gestiona el refresh de sesión.
 */
export const chatService = {
  async list(params: ChatListParams = {}): Promise<ChatListResponse> {
    const limit = params.limit ?? CHATS_PAGE_SIZE;
    const offset = params.offset ?? 0;
    const status = params.status ?? 'all';
    const search = params.search ?? '';

    const query = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      status,
    });
    if (search) {
      query.set('search', search);
    }

    const res = await apiClient<ChatListResponse>(`/users/me/chats?${query.toString()}`, {
      method: 'GET',
    });

    // Respuesta defensiva: ante un cuerpo inesperado se trata como lista vacía.
    const chats = Array.isArray(res.chats) ? res.chats : [];
    return {
      chats,
      count: typeof res.count === 'number' ? res.count : chats.length,
      limit: typeof res.limit === 'number' ? res.limit : limit,
      offset: typeof res.offset === 'number' ? res.offset : offset,
    };
  },

  /** Parámetros por defecto para listar chats activos (sin archivar). */
  defaultParams(): ChatListParams {
    return {
      limit: CHATS_PAGE_SIZE,
      offset: 0,
      status: 'all',
      search: '',
    };
  },
};

export default chatService;
