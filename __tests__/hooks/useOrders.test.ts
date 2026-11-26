import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useOrders } from '../../src/hooks/useOrders';
import { orderService } from '../../src/services/orderService';
import type { Order, OrderStatus } from '../../types/order';

jest.mock('../../src/services/orderService', () => ({
  orderService: {
    listUserOrders: jest.fn(),
    completeOrder: jest.fn(),
  },
  ORDERS_PAGE_SIZE: 20,
}));

const list = orderService.listUserOrders as jest.Mock;
const complete = orderService.completeOrder as jest.Mock;

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'o-1',
  client_id: 'client-1',
  worker_id: 'worker-1',
  category_id: 'cat-1',
  location_id: 'loc-1',
  description: 'Reparación de grifo',
  suggested_budget: 5000,
  scheduled_date: '2026-12-15',
  status: 'ACCEPTED' as OrderStatus,
  created_at: '2026-11-22T10:00:00Z',
  updated_at: '2026-11-22T10:00:00Z',
  client: { user_id: 'client-1', full_name: 'Cliente Uno', avatar_url: null },
  worker: { user_id: 'worker-1', full_name: 'Trabajador Uno', avatar_url: null },
  quotes: [],
  client_confirmed: false,
  worker_confirmed: false,
  ...overrides,
});

const responseFor = (orders: Order[]) => ({
  orders,
  count: orders.length,
  limit: 20,
  offset: 0,
});

describe('useOrders', () => {
  beforeEach(() => {
    list.mockReset();
    complete.mockReset();
  });

  it('carga la primera página al montarse', async () => {
    list.mockResolvedValue(responseFor([makeOrder()]));

    const { result } = renderHook(() => useOrders('pendientes', 'client'));

    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.orders).toHaveLength(1);
    expect(result.current.total).toBe(1);
    expect(list).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
      role: 'MINE_AS_CLIENT',
      search: '',
    });
  });

  it('filtra órdenes por estado de la pestaña pendientes (solo ACCEPTED e IN_PROGRESS)', async () => {
    list.mockResolvedValue(
      responseFor([
        makeOrder({ status: 'ACCEPTED' as OrderStatus }),
        makeOrder({ id: 'o-2', status: 'COMPLETED' as OrderStatus }),
        makeOrder({ id: 'o-3', status: 'IN_PROGRESS' as OrderStatus }),
        makeOrder({ id: 'o-4', status: 'PENDING' as OrderStatus }),
      ]),
    );

    const { result } = renderHook(() => useOrders('pendientes', 'client'));

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.orders).toHaveLength(2);
    expect(result.current.orders.map((o) => o.id)).toEqual(['o-1', 'o-3']);
    expect(list).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
      role: 'MINE_AS_CLIENT',
      search: '',
    });
  });

  it('filtra órdenes por estado de la pestaña realizados', async () => {
    list.mockResolvedValue(
      responseFor([
        makeOrder({ status: 'ACCEPTED' as OrderStatus }),
        makeOrder({ id: 'o-2', status: 'COMPLETED' as OrderStatus }),
        makeOrder({ id: 'o-3', status: 'REJECTED' as OrderStatus }),
        makeOrder({ id: 'o-4', status: 'IN_PROGRESS' as OrderStatus }),
      ]),
    );

    const { result } = renderHook(() => useOrders('realizados', 'worker'));

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.orders).toHaveLength(2);
    expect(result.current.orders.map((o) => o.id)).toEqual(['o-2', 'o-3']);
    expect(list).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
      role: 'MINE_AS_WORKER',
      search: '',
    });
  });

  it('muestra error cuando la lista falla', async () => {
    list.mockRejectedValueOnce(new Error('offline'));

    const { result } = renderHook(() => useOrders('pendientes', 'client'));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBeTruthy();
    expect(result.current.orders).toEqual([]);
  });

  it('setTab cambia de pestaña y recarga desde la primera página', async () => {
    list.mockResolvedValue(responseFor([makeOrder()]));

    const { result } = renderHook(() => useOrders('pendientes', 'client'));

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.tab).toBe('pendientes');

    act(() => {
      result.current.setTab('realizados');
    });

    await waitFor(() => expect(result.current.tab).toBe('realizados'));
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('reload carga la primera página otra vez', async () => {
    list.mockResolvedValue(responseFor([makeOrder()]));

    const { result } = renderHook(() => useOrders('pendientes', 'client'));

    await waitFor(() => expect(result.current.status).toBe('success'));

    list.mockResolvedValueOnce(responseFor([]));

    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.orders).toHaveLength(0));
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('hasMore es true cuando hay más órdenes que las cargadas', async () => {
    list.mockResolvedValue({
      orders: [makeOrder()],
      count: 5,
      limit: 20,
      offset: 0,
    });

    const { result } = renderHook(() => useOrders('pendientes', 'client'));

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.hasMore).toBe(true);
    expect(result.current.orders).toHaveLength(1);
  });

  it('hasMore es false cuando se cargaron todas las órdenes', async () => {
    list.mockResolvedValue(responseFor([makeOrder(), makeOrder({ id: 'o-2' })]));

    const { result } = renderHook(() => useOrders('pendientes', 'client'));

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.hasMore).toBe(false);
    expect(result.current.orders).toHaveLength(2);
  });
});
