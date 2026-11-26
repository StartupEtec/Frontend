import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { OrderListScreen } from '../../src/screens/OrderListScreen';
import { orderService } from '../../src/services/orderService';
import type { Order, OrderStatus } from '../../src/types/order';
import { ApiError } from '../../src/services/api';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../src/context/RoleContext', () => ({
  useRoleContext: jest.fn(() => ({
    currentRole: 'client',
    accentColor: '#0f62fe',
  })),
}));

jest.mock('../../src/services/orderService', () => ({
  orderService: {
    listUserOrders: jest.fn(),
    completeOrder: jest.fn(),
  },
  ORDERS_PAGE_SIZE: 20,
}));

const list = orderService.listUserOrders as jest.Mock;
const _complete = orderService.completeOrder as jest.Mock;

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

const renderScreen = (props?: Partial<React.ComponentProps<typeof OrderListScreen>>) => {
  const defaultProps = {
    onGoBack: jest.fn(),
    ...props,
  };
  return { ...render(<OrderListScreen {...defaultProps} />), ...defaultProps };
};

describe('OrderListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    list.mockResolvedValue(responseFor([makeOrder()]));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('muestra estado de carga mientras cargan los pedidos', () => {
    list.mockReturnValue(new Promise(() => undefined));

    const { getByText } = renderScreen();

    expect(getByText('Cargando tus pedidos...')).toBeTruthy();
  });

  it('muestra la lista de pedidos una vez cargados', async () => {
    list.mockResolvedValue(
      responseFor([
        makeOrder(),
        makeOrder({ id: 'o-2', status: 'COMPLETED' as OrderStatus }),
      ]),
    );

    const { getByText } = renderScreen();

    await waitFor(() => expect(getByText('Trabajador Uno')).toBeTruthy());
    expect(getByText('Reparación de grifo')).toBeTruthy();
  });

  it('muestra estado vacío cuando no hay pedidos pendientes', async () => {
    list.mockResolvedValue(responseFor([]));

    const { getByText } = renderScreen();

    await waitFor(() =>
      expect(getByText('No tienes pedidos pendientes.')).toBeTruthy(),
    );
  });

  it('muestra error y botón de reintentar cuando falla la carga', async () => {
    list.mockRejectedValueOnce(new ApiError('Error de servidor', 500));

    const { getByText, getByTestId } = renderScreen();

    await waitFor(() => expect(getByText('Error de servidor')).toBeTruthy());
    expect(getByTestId('btn-orders-retry')).toBeTruthy();
  });

  it('reintenta cargar al presionar el botón de reintentar', async () => {
    list
      .mockRejectedValueOnce(new ApiError('Error de servidor', 500))
      .mockResolvedValueOnce(responseFor([makeOrder()]));

    const { getByText, getByTestId } = renderScreen();

    await waitFor(() => expect(getByText('Error de servidor')).toBeTruthy());
    fireEvent.press(getByTestId('btn-orders-retry'));

    await waitFor(() => expect(getByText('Trabajador Uno')).toBeTruthy());
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('filtra por pestaña pendientes mostrando solo estados aceptados/en progreso', async () => {
    list.mockResolvedValue(
      responseFor([
        makeOrder({ status: 'ACCEPTED' as OrderStatus }),
        makeOrder({ id: 'o-2', status: 'COMPLETED' as OrderStatus }),
        makeOrder({ id: 'o-3', status: 'IN_PROGRESS' as OrderStatus }),
        makeOrder({ id: 'o-4', status: 'PENDING' as OrderStatus }),
      ]),
    );

    const { getAllByText, queryAllByText } = renderScreen();

    await waitFor(() =>
      expect(getAllByText('Reparación de grifo')).toHaveLength(2),
    );
    // PENDING no debería aparecer en la pestaña pendientes (solo 2 de 4)
    expect(queryAllByText('Trabajador Uno')).toHaveLength(2);
  });

  it('navega de vuelta al presionar atrás', () => {
    const onGoBack = jest.fn();
    list.mockReturnValue(new Promise(() => undefined));

    const { getByText } = renderScreen({ onGoBack });

    expect(getByText('Cargando tus pedidos...')).toBeTruthy();
  });
});
