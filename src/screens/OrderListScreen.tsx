import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useRoleContext } from '../context/RoleContext';
import { colors, spacing, borderRadius, typography, roleAccent } from '../theme/tokens';
import { PrimaryButton, ErrorBanner } from '../components/base';
import { orderService, ORDERS_PAGE_SIZE } from '../services/orderService';
import type { Order, OrderTab, OrderStatus } from '../types/order';
import { TAB_STATUSES } from '../types/order';
import { OrderCard } from '../components/order/OrderCard';
import { OrderDetailModal } from './OrderDetailModal';
import { SuccessToast } from '../components/SuccessToast';
import { ApiError } from '../services/api';
import type { RateeInfo } from '../types/rating';

interface OrderListScreenProps {
  onGoBack: () => void;
  /** Navega a la pantalla de calificación tras completar una orden con ambas confirmaciones. */
  onNavigateToRate?: (orderId: string, ratee: RateeInfo) => void;
  /** IDs de órdenes ya calificadas por el usuario actual (para mostrar botón gris). */
  ratedOrderIds?: Set<string>;
}

/**
 * Pantalla "Mis Pedidos" (Issue #45).
 *
 * Dos pestañas: "Pendientes" (ACCEPTED e IN_PROGRESS —órdenes ya pagadas—) y
 * "Realizados" (COMPLETED, CANCELLED, REJECTED). Cada tarjeta muestra el
 * servicio, la fecha y el nombre de la otra parte. Los demás datos se ven
 * en el modal de los tres puntitos. Incluye botón "Finalizar servicio"
 * solo para órdenes pagadas. Soporta infinite scroll y estados de carga /
 * vacío / error.
 */
export const OrderListScreen: React.FC<OrderListScreenProps> = ({
  onGoBack,
  onNavigateToRate,
  ratedOrderIds = new Set<string>(),
}) => {
  const { currentRole } = useRoleContext();
  const userRole = currentRole ?? 'client';
  const accentColor = roleAccent(currentRole);

  const [tab, setTab] = useState<OrderTab>('pendientes');
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const [toastVisible, setToastVisible] = useState<boolean>(false);

  const ordersRef = useRef<Order[]>(orders);
  ordersRef.current = orders;

  const allowedStatuses: OrderStatus[] = TAB_STATUSES[tab];
  const roleParam = userRole === 'client' ? 'MINE_AS_CLIENT' : 'MINE_AS_WORKER';

  // Filtrado por pestaña siempre en el cliente.
  const filteredOrders = orders.filter((o) => allowedStatuses.includes(o.status));

  /**
   * Carga una página de órdenes desde el backend. No filtra por status aquí;
   * el filtrado por pestaña se hace en filteredOrders.
   * Devuelve las órdenes cargadas para poder verificar estados tras completar.
   */
  const loadOrders = useCallback(
    async (nextOffset: number, replace: boolean): Promise<Order[]> => {
      setStatus('loading');
      setError(null);
      try {
        const res = await orderService.listUserOrders({
          limit: ORDERS_PAGE_SIZE,
          offset: nextOffset,
          role: roleParam,
        });
        const allOrders = Array.isArray(res.orders) ? res.orders : [];

        if (replace) {
          setOrders(allOrders);
          setOffset(nextOffset);
        } else {
          const existingIds = new Set(ordersRef.current.map((o) => o.id));
          const newOrders = allOrders.filter((o) => !existingIds.has(o.id));
          setOrders((current) => [...current, ...newOrders]);
        }
        setTotal(res.count);
        setStatus('success');
        return allOrders;
      } catch (err: unknown) {
        if (replace) {
          setOrders([]);
          setError(err instanceof ApiError ? err.message : 'No pudimos cargar los pedidos.');
        }
        setStatus('error');
        return [];
      }
    },
    [roleParam]
  );

  // Carga inicial y recarga al cambiar pestaña o rol.
  useEffect(() => {
    void loadOrders(0, true);
  }, [loadOrders, tab]);

  const loadMore = useCallback(async () => {
    if (loadingMore || filteredOrders.length >= total) return;

    setLoadingMore(true);
    try {
      const res = await orderService.listUserOrders({
        limit: ORDERS_PAGE_SIZE,
        offset: offset + ORDERS_PAGE_SIZE,
        role: roleParam,
      });
      const allOrders = Array.isArray(res.orders) ? res.orders : [];
      const existingIds = new Set(ordersRef.current.map((o) => o.id));
      const newOrders = allOrders.filter((o) => !existingIds.has(o.id));
      setOrders((current) => [...current, ...newOrders]);
      setTotal(res.count);
      setOffset(offset + ORDERS_PAGE_SIZE);
    } catch {
      // Error de carga silencioso en loadMore; el usuario puede volver a intentar
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, offset, roleParam]);

  const handleTabChange = (newTab: OrderTab) => {
    setTab(newTab);
    setOffset(0);
    void loadOrders(0, true);
  };

  const handleRetry = () => {
    void loadOrders(0, true);
  };

  const handleCompleteOrder = async (orderId: string) => {
    try {
      const res = await orderService.completeOrder(orderId, { confirm: true });

      // Si ambas partes confirmaron, la orden pasó a COMPLETED: ir a calificar.
      // Esto ocurre para quien confirma segundo (bothConfirmed = true).
      if (res.bothConfirmed && onNavigateToRate) {
        const order = ordersRef.current.find((o) => o.id === orderId);
        if (order) {
          const isClient = userRole === 'client';
          const ratee = isClient ? order.worker : order.client;
          onNavigateToRate(orderId, {
            user_id: ratee?.user_id ?? '',
            full_name: ratee?.full_name ?? null,
            avatar_url: ratee?.avatar_url ?? null,
            service: order.category_name || order.description || 'Servicio sin descripción',
          });
        }
        return;
      }

      // Primer confirmador: la orden aún no está COMPLETED.
      // Refrescar la lista y verificar si ya pasó a COMPLETED (porque la otra
      // parte confirmó entre tanto). Si sí, navegar a calificar también.
      const updatedOrders = await loadOrders(0, true);
      const orderAfter = updatedOrders.find((o) => o.id === orderId);

      if (orderAfter?.status === 'COMPLETED' && onNavigateToRate) {
        const isClient = userRole === 'client';
        const ratee = isClient ? orderAfter.worker : orderAfter.client;
        onNavigateToRate(orderId, {
          user_id: ratee?.user_id ?? '',
          full_name: ratee?.full_name ?? null,
          avatar_url: ratee?.avatar_url ?? null,
          service: orderAfter.category_name || orderAfter.description || 'Servicio sin descripción',
        });
        return;
      }

      setToastVisible(true);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : 'No se pudo finalizar el servicio.';
      Alert.alert('Error', message);
    }
  };

  const handleNavigateToRate = (orderId: string, ratee: RateeInfo) => {
    if (onNavigateToRate) {
      onNavigateToRate(orderId, ratee);
    }
  };

  const handleOpenDetail = (order: Order) => {
    setDetailOrder(order);
    setDetailVisible(true);
  };

  const handleCloseDetail = () => {
    setDetailVisible(false);
    setDetailOrder(null);
  };

  const handleToastFinish = () => {
    setToastVisible(false);
  };

  const hasMore = total > 0 && filteredOrders.length < total;
  const isLoading = status === 'loading' && orders.length === 0;
  const isError = status === 'error' && orders.length === 0;

  const renderItem = ({ item }: { item: Order }) => (
    <OrderCard
      order={item}
      userRole={userRole}
      onComplete={handleCompleteOrder}
      onOpenDetail={handleOpenDetail}
      onRate={(orderId, ratee) => handleNavigateToRate(orderId, ratee)}
      ratedOrderIds={ratedOrderIds}
    />
  );

  const keyExtractor = (item: Order) => item.id;

  const isEmpty = filteredOrders.length === 0;
  const emptyMessage = isError
    ? error
    : isLoading
      ? 'Cargando tus pedidos...'
      : tab === 'pendientes'
        ? 'No tienes pedidos pendientes.'
        : 'No tienes pedidos realizados.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Encabezado */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton} accessibilityLabel="Volver">
          <Feather name="arrow-left" size={20} color={colors.textPrimary} accessible={false} />
        </TouchableOpacity>
        <Text style={styles.title}>Mis Pedidos</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Pestañas */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            tab === 'pendientes' && styles.tabActive,
            tab === 'pendientes' && { borderBottomColor: accentColor },
          ]}
          onPress={() => handleTabChange('pendientes')}
          accessibilityLabel="Pendientes"
          accessibilityRole="tab"
        >
          <Text style={[styles.tabText, tab === 'pendientes' && styles.tabTextActive, { color: tab === 'pendientes' ? accentColor : colors.textMuted }]}>
            Pendientes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            tab === 'realizados' && styles.tabActive,
            tab === 'realizados' && { borderBottomColor: accentColor },
          ]}
          onPress={() => handleTabChange('realizados')}
          accessibilityLabel="Realizados"
          accessibilityRole="tab"
        >
          <Text style={[styles.tabText, tab === 'realizados' && styles.tabTextActive, { color: tab === 'realizados' ? accentColor : colors.textMuted }]}>
            Realizados
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de órdenes */}
      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={styles.loadingText}>Cargando tus pedidos...</Text>
          </View>
        ) : isEmpty ? (
          <View style={styles.emptyContainer}>
            {isError ? (
              <>
                <ErrorBanner message={error ?? 'No se pudieron cargar los pedidos'} testID="orders-error" />
                <PrimaryButton
                  title="Reintentar"
                  onPress={handleRetry}
                  accentColor={accentColor}
                  testID="btn-orders-retry"
                />
              </>
            ) : (
              <>
                <Feather
                  name={tab === 'pendientes' ? 'package' : 'archive'}
                  size={48}
                  color={colors.textMuted}
                  accessible={false}
                />
                <Text style={styles.emptyText}>{emptyMessage}</Text>
              </>
            )}
          </View>
        ) : (
          <>
            <FlatList
              data={filteredOrders}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={null}
              extraData={filteredOrders}
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              testID="flatlist-orders"
            />
            {loadingMore && (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingMoreText}>Cargando más pedidos...</Text>
              </View>
            )}
            {hasMore && !loadingMore && (
              <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
                <Text style={styles.loadMoreText}>Cargar más pedidos</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Modal de detalles del pedido */}
      <OrderDetailModal
        visible={detailVisible}
        order={detailOrder}
        userRole={userRole}
        onClose={handleCloseDetail}
      />

      {/* Toast de confirmación de finalización */}
      <SuccessToast
        visible={toastVisible}
        message="Servicio finalizado. El pedido se movió a realizados."
        onFinish={handleToastFinish}
        testID="toast-service-completed"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
  },

  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    marginLeft: spacing.sm,
  },
  headerSpacer: { width: 40 },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  loadingMoreText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginLeft: spacing.sm,
  },
  loadMoreButton: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  loadMoreText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
});

export default OrderListScreen;
