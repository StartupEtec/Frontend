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

/** Tipo de mensaje. */
export type MessageType = 'TEXT' | 'IMAGE' | 'QUOTE';

/** Un mensaje individual. */
export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string | null;
  message_type: MessageType;
  attachment_url: string | null;
  avatar_url: string | null;
  created_at: string;
}

/** Respuesta de GET /chats/:chat_id/messages. */
export interface ChatMessagesResponse {
  messages: ChatMessage[];
  count: number;
  limit: number;
  offset: number;
}

/** Parámetros para crear un mensaje. */
export interface SendMessageParams {
  message_type?: MessageType;
  content?: string | null;
}

/** Parámetros para listar mensajes. */
export interface ChatMessagesParams {
  limit?: number;
  offset?: number;
}

/** Parámetros para crear un chat. */
export interface CreateChatParams {
  user_id_2: string;
  order_id?: string | null;
}

/** Respuesta de POST /chats. */
export interface CreateChatResponse {
  chat_id: string;
  created: boolean;
  message: string;
}

/** Datos de una cotización para mostrar en pantalla de detalle. */
export interface QuoteData {
  id: string;
  order_id: string;
  proposed_price: number;
  proposed_date: string;
  proposed_time: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

/** Datos de una solicitud de cotización (quote_request). */
export interface QuoteRequestData {
  id: string;
  client_id: string;
  worker_id: string;
  category: string;
  location: string;
  description: string | null;
  status: string;
  order_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Parámetros para la pantalla de vista de cotización (QuoteViewScreen). */
export interface QuoteViewScreenParams {
  quoteRequestId: string;
  quoteData: QuoteData | null;
  role: 'client' | 'worker';
  onClose: () => void;
}

/** Parámetros para la pantalla de completar cotización (CompleteQuoteScreen). */
export interface CompleteQuoteScreenParams {
  quoteRequestId: string;
  orderId: string | null;
  role: 'worker';
  chatId: string;
  myUserId: string;
  onComplete: (quote: QuoteData) => void;
  onCancel: () => void;
  onRejected: (fields: string[]) => void;
}

/** Datos para actualizar el estado de una solicitud de cotización. */
export interface UpdateQuoteRequestStatusData {
  status: 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  rejection_reason?: string | null;
}
