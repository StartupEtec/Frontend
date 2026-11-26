import { apiClient } from './api';
import { tokenStorage } from './tokenStorage';
import type {
  Order,
  OrderListResponse,
  OrderListParams,
  CompleteOrderParams,
  CompleteOrderResponse,
} from '../types/order';

/** Tamaño de página por defecto para la lista de órdenes. */
export const ORDERS_PAGE_SIZE = 20;

/**
 * Servicio de órdenes (Issue #45).
 *
 * Endpoints:
 * - GET /users/:id/orders - lista las órdenes del usuario autenticado
 * - GET /orders/:id - detalle de una orden específica
 * - POST /orders/:id/complete - confirma la finalización del servicio
 *
 * El apiClient adjunta automáticamente el Bearer token y gestiona el refresh
 * de sesión. El user_id se obtiene del token almacenado para cumplir con el
 * requisito del backend de que el id de la URL coincida con el usuario autenticado.
 */
export const orderService = {
  /**
   * Lista las órdenes del usuario autenticado.
   * Se filtra por el rol activo (cliente ve órdenes como cliente, trabajador como trabajador).
   */
  async listUserOrders(params: OrderListParams = {}): Promise<OrderListResponse> {
    const userId = await tokenStorage.getUserId();
    if (!userId) {
      throw new Error('No se pudo identificar el usuario autenticado.');
    }

    const limit = params.limit ?? ORDERS_PAGE_SIZE;
    const offset = params.offset ?? 0;

    const queryParams = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (params.role) queryParams.append('role', params.role);
    if (params.status) queryParams.append('status', params.status);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);
    if (params.search) queryParams.append('search', params.search);

    const res = await apiClient<OrderListResponse>(
      `/orders/users/${userId}/orders?${queryParams.toString()}`,
      { method: 'GET' }
    );

    return {
      orders: Array.isArray(res.orders) ? res.orders : [],
      count: typeof res.count === 'number' ? res.count : res.orders.length,
      limit: typeof res.limit === 'number' ? res.limit : limit,
      offset: typeof res.offset === 'number' ? res.offset : offset,
    };
  },

  /**
   * Obtiene el detalle completo de una orden por su ID.
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    const res = await apiClient<{ order: Order }>(`/orders/${orderId}`, {
      method: 'GET',
    });
    return res.order ?? null;
  },

  /**
   * Confirma la finalización del servicio para una orden.
   * Requiere que la orden esté en estado IN_PROGRESS.
   * Cuando cliente y trabajador confirman, la orden pasa a COMPLETED y se libera el escrow.
   */
  async completeOrder(
    orderId: string,
    params: CompleteOrderParams = {}
  ): Promise<CompleteOrderResponse> {
    const res = await apiClient<CompleteOrderResponse>(`/orders/${orderId}/complete`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res;
  },
};

export default orderService;
