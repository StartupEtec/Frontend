import { useCallback, useEffect, useRef, useState } from 'react';
import { orderService, ORDERS_PAGE_SIZE } from '../services/orderService';
import type { Order, OrderTab, OrderListParams } from '../types/order';
import { TAB_STATUSES } from '../types/order';
import { ApiError } from '../services/api';

type OrdersStatus = 'idle' | 'loading' | 'success' | 'error';

function ordersErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.message) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return 'No pudimos cargar los pedidos. Reintentá.';
}

/**
 * Hook para listar las órdenes del usuario autenticado con infinite scroll.
 *
 * Expone: orders, total, status, error, loadingMore, loadMoreError, hasMore,
 * reload, loadMore, setSearch, setTab, tab.
 *
 * El filtrado por pestaña (Pendientes / Realizados) se hace en el cliente sobre
 * los estados de cada orden, ya que el backend acepta un solo `status` por
 * consulta y cada pestaña agrupa tres estados. La búsqueda por nombre de
 * usuario se envía al backend (parámetro `search`) y reinicia a la primera
 * página.
 *
 * @param initialTab - Pestaña inicial ('pendientes' | 'realizados').
 * @param userRole - Rol activo del usuario ('client' | 'worker').
 */
export const useOrders = (
  initialTab: OrderTab = 'pendientes',
  userRole: 'client' | 'worker' = 'client'
) => {
  const [tab, setTab] = useState<OrderTab>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [status, setStatus] = useState<OrdersStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [search, setSearchState] = useState<string>('');
  const [offset, setOffset] = useState<number>(0);

  const ordersRef = useRef<Order[]>(orders);
  ordersRef.current = orders;

  const roleParam: OrderListParams['role'] =
    userRole === 'client' ? 'MINE_AS_CLIENT' : 'MINE_AS_WORKER';

  /**
   * Carga la primera página de órdenes y reemplaza la lista actual.
   * Se dispara al montar y cada vez que cambian tab, role o search.
   */
  const loadFirstPage = useCallback(async () => {
    setStatus('loading');
    setError(null);
    setLoadMoreError(null);
    try {
      const result = await orderService.listUserOrders({
        limit: ORDERS_PAGE_SIZE,
        offset: 0,
        role: roleParam,
        search,
      });
      const allowed = TAB_STATUSES[tab];
      const allOrders = Array.isArray(result.orders) ? result.orders : [];
      const filtered = allOrders.filter((o) => allowed.includes(o.status as OrderStatus));
      setOrders(filtered);
      setOffset(0);
      setTotal(result.count);
      setStatus('success');
    } catch (err: unknown) {
      setOrders([]);
      setTotal(0);
      setError(ordersErrorMessage(err));
      setStatus('error');
    }
  }, [tab, roleParam, search]);

  /**
   * Carga la página siguiente y la concatena a la lista actual (infinite scroll).
   */
  const loadMore = useCallback(async () => {
    if (loadingMore) return;

    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const result = await orderService.listUserOrders({
        limit: ORDERS_PAGE_SIZE,
        offset: offset + ORDERS_PAGE_SIZE,
        role: roleParam,
        search,
      });
      const allowed = TAB_STATUSES[tab];
      const allOrders = Array.isArray(result.orders) ? result.orders : [];
      const filtered = allOrders.filter((o) => allowed.includes(o.status as OrderStatus));

      const existingIds = new Set(ordersRef.current.map((o) => o.id));
      const newOrders = filtered.filter((o) => !existingIds.has(o.id));
      setOrders((current) => [...current, ...newOrders]);
      setTotal(result.count);
      setOffset(offset + ORDERS_PAGE_SIZE);
    } catch (err: unknown) {
      setLoadMoreError(ordersErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, offset, roleParam, search, tab]);

  // Carga al montar y cada vez que cambian tab, role o search.
  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  /**
   * Ejecuta una búsqueda por nombre de usuario (cambia el filtro `search`).
   */
  const setSearch = useCallback((searchText: string) => {
    setSearchState(searchText);
  }, []);

  /**
   * Cambia de pestaña y dispara una nueva carga desde la primera página.
   */
  const changeTab = useCallback((newTab: OrderTab) => {
    setTab(newTab);
  }, []);

  /**
   * Recarga la primera página desde el principio.
   */
  const reload = useCallback(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const hasMore = total != null && orders.length < total;

  return {
    orders,
    total,
    status,
    error,
    loadingMore,
    loadMoreError,
    hasMore,
    reload,
    loadMore,
    setSearch,
    setTab: changeTab,
    tab,
  };
};

export default useOrders;
