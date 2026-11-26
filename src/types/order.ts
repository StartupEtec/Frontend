/**
 * Tipos de órdenes (Issue #45 - Pantalla de Pedidos / Mis Pedidos).
 * Espejo del contrato de GET /users/:id/orders y GET /orders/:id del backend
 * (Backend/src/services/OrderService.js → formatOrder / formatOrderWithRelations).
 */

export type OrderStatus =
  'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

/** Otro participante de la orden (usuario con rol dual: cliente o trabajador). */
export interface OrderUser {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

/** Una cotización asociada a la orden. */
export interface OrderQuote {
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

/** Una orden de servicio. */
export interface Order {
  id: string;
  client_id: string;
  worker_id: string;
  category_id: string;
  category_name: string | null;
  location_id: string;
  description: string | null;
  suggested_budget: number | null;
  scheduled_date: string | null;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  client: OrderUser | null;
  worker: OrderUser | null;
  quotes: OrderQuote[];
  /** Si el cliente confirmó la finalización del servicio. */
  client_confirmed: boolean;
  /** Si el trabajador confirmó la finalización del servicio. */
  worker_confirmed: boolean;
}

/** Respuesta de GET /users/:id/orders. */
export interface OrderListResponse {
  orders: Order[];
  count: number;
  limit: number;
  offset: number;
}

/** Parámetros de consulta para listar órdenes del usuario autenticado. */
export interface OrderListParams {
  limit?: number;
  offset?: number;
  status?: OrderStatus;
  role?: 'MINE_AS_CLIENT' | 'MINE_AS_WORKER';
  date_from?: string;
  date_to?: string;
  search?: string;
}

/** Pestañas de la pantalla de Mis Pedidos. */
export type OrderTab = 'pendientes' | 'realizados';

/** Estados que pertenecen a cada pestaña.
 * Pendientes: solo órdenes ya pagadas (ACCEPTED e IN_PROGRESS).
 * PENDING (sin pagar) no se muestra en ninguna pestaña.
 */
export const TAB_STATUSES: Record<OrderTab, OrderStatus[]> = {
  pendientes: ['ACCEPTED', 'IN_PROGRESS'],
  realizados: ['COMPLETED', 'CANCELLED', 'REJECTED'],
};

/** Parámetros para POST /orders/:id/complete (finalizar servicio). */
export interface CompleteOrderParams {
  confirm?: boolean;
}

/** Respuesta de POST /orders/:id/complete. */
export interface CompleteOrderResponse {
  order: Order;
  bothConfirmed: boolean;
  clientConfirmed: boolean;
  workerConfirmed: boolean;
}
