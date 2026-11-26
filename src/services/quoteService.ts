import { apiClient } from './api';
import { QuoteData, QuoteRequestData } from '../types/chat';

/**
 * Servicio de cotizaciones (quotes).
 *
 * Endpoints:
 * - POST /api/v1/quote-requests/:id/quotes - trabajador completa una cotización
 *   a partir de una solicitud recibida.
 * - GET /api/v1/quote-requests/requests/:id - obtener una solicitud específica.
 * - GET /api/v1/orders/:order_id/quotes - listar cotizaciones de una orden.
 *
 * El apiClient adjunta automáticamente el Bearer token y gestiona el refresh de sesión.
 */
export const quoteService = {
  /**
   * Obtiene una solicitud de cotización por ID (cliente o trabajador).
   */
  async getQuoteRequest(quoteRequestId: string): Promise<QuoteRequestData> {
    const res = await apiClient<QuoteRequestData>(`/quote-requests/requests/${quoteRequestId}`, {
      method: 'GET',
    });
    return res;
  },

  /**
   * Crea una cotización para una orden (trabajador).
   * Envía fecha, hora y precio propuestos.
   */
  async createQuote(
    orderId: string,
    data: { proposed_price: number; proposed_date: string; proposed_time: string }
  ): Promise<QuoteData> {
    const res = await apiClient<{ quote: QuoteData }>(`/orders/${orderId}/quotes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.quote;
  },

  /**
   * Crea una cotización a partir de una solicitud de cotización (trabajador).
   * El backend crea la orden si aún no existe y luego crea la cotización.
   */
  async createQuoteFromRequest(
    quoteRequestId: string,
    data: { proposed_price: number; proposed_date: string; proposed_time: string }
  ): Promise<QuoteData> {
    const res = await apiClient<{ quote: QuoteData }>(
      `/quote-requests/requests/${quoteRequestId}/quotes`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return res.quote;
  },

  /**
   * Lista las cotizaciones de una orden.
   */
  async listQuotesByOrder(orderId: string): Promise<QuoteData[]> {
    const res = await apiClient<{ quotes: QuoteData[] }>(`/orders/${orderId}/quotes`, {
      method: 'GET',
    });
    return res.quotes ?? [];
  },

  /**
   * Elimina una solicitud de cotización (cliente, solo si está PENDING).
   */
  async removeQuoteRequest(quoteRequestId: string): Promise<void> {
    await apiClient<{ message: string }>(`/quote-requests/requests/${quoteRequestId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Actualiza el estado de una solicitud de cotización (trabajador).
   * Permite aceptar, rechazar o cancelar.
   */
  async updateQuoteRequestStatus(
    quoteRequestId: string,
    data: { status: string; rejection_reason?: string | null }
  ): Promise<QuoteRequestData> {
    const res = await apiClient<{ quote_request: QuoteRequestData }>(
      `/quote-requests/requests/${quoteRequestId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return res.quote_request;
  },
};

export default quoteService;
