/**
 * Tipos de chats (Issue #30).
 * Espejo del contrato de GET /users/me/chats (Backend/src/services/ChatService.js → formatChatListItem).
 */

/** Otro participante del chat (usuarios con rol dual: cliente o trabajador). */
export interface ChatOtherUser {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

/** Último mensaje de un chat. */
export interface ChatLastMessage {
  message_id: string;
  text: string;
  sender_id: string;
  created_at: string;
  read: boolean;
}

/** Ítem de la lista de chats devuelto por GET /users/me/chats. */
export interface ChatListItem {
  chat_id: string;
  order_id: string | null;
  last_message_at: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  last_message: ChatLastMessage | null;
  other_user: ChatOtherUser;
  unread_count: number;
}

/** Respuesta de GET /users/me/chats. */
export interface ChatListResponse {
  chats: ChatListItem[];
  count: number;
  limit: number;
  offset: number;
}

/** Parámetros de consulta para listar chats. */
export interface ChatListParams {
  limit?: number;
  offset?: number;
  status?: 'all' | 'favorites' | 'archived';
  search?: string;
}
