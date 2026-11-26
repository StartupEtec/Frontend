import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, shadows, spacing, borderRadius, typography } from '../../theme/tokens';
import type { Order } from '../../types/order';

interface OrderCardProps {
  order: Order;
  userRole: 'client' | 'worker';
  onComplete: (orderId: string) => void;
  onOpenDetail: (order: Order) => void;
}

/**
 * Formatea una fecha ISO (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss.sssZ) a formato
 * legible: "26 nov, 2026".
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Sin fecha programada';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Sin fecha programada';
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Sin fecha programada';
  }
}

/**
 * Tarjeta individual de una orden en la lista de Mis Pedidos (Issue #45).
 *
 * Muestra únicamente: nombre del servicio, fecha y nombre de la otra parte
 * (Cliente si es trabajador, Trabajador si es cliente).
 * Los demás datos (precio, estado detallado) se ven en el modal de los tres puntitos.
 * Incluye el botón "Finalizar servicio" cuando la orden está en PENDING,
 * ACCEPTED o IN_PROGRESS. Si el usuario ya confirmó, el botón se pone en gris
 * y dice "Esperando a [otra parte]".
 */
export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  userRole,
  onComplete,
  onOpenDetail,
}) => {
  const isClient = userRole === 'client';
  const otherParty = isClient ? order.worker : order.client;
  const otherPartyLabel = isClient ? 'Trabajador' : 'Cliente';
  const otherPartyName = otherParty?.full_name || 'Usuario';

  const quote = order.quotes?.[0];
  const serviceTitle = order.category_name || order.description || 'Servicio sin descripción';
  const date = formatDate(quote?.proposed_date || order.scheduled_date);

  // ¿Ya confirmó este usuario la finalización?
  const alreadyConfirmed = isClient ? order.client_confirmed : order.worker_confirmed;

  // El backend permite confirmar finalización cuando la orden está en PENDING,
  // ACCEPTED o IN_PROGRESS.
  const canComplete =
    order.status === 'PENDING' || order.status === 'ACCEPTED' || order.status === 'IN_PROGRESS';

  const isWaiting = alreadyConfirmed && canComplete;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.info}>
          <Text style={styles.serviceText}>{serviceTitle}</Text>
          <Text style={styles.dateText}>{date}</Text>
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => onOpenDetail(order)}
          accessibilityLabel="Ver detalles del pedido"
        >
          <Feather name="more-vertical" size={20} color={colors.textMuted} accessible={false} />
        </TouchableOpacity>
      </View>

      <View style={styles.partyRow}>
        <Text style={styles.partyLabel}>{otherPartyLabel}:</Text>
        <Text style={styles.partyValue}>{otherPartyName}</Text>
      </View>

      {canComplete && (
        <TouchableOpacity
          style={[styles.completeButton, isWaiting && styles.completeButtonWaiting]}
          onPress={isWaiting ? undefined : () => onComplete(order.id)}
          accessibilityLabel={isWaiting ? 'Esperando a la otra parte' : 'Finalizar servicio'}
        >
          <Text style={styles.completeButtonText}>
            {isWaiting ? `Esperando a ${otherPartyName}` : 'Finalizar servicio'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    shadowColor: shadows.card.shadowColor,
    shadowOffset: shadows.card.shadowOffset,
    shadowOpacity: shadows.card.shadowOpacity,
    shadowRadius: shadows.card.shadowRadius,
    elevation: shadows.card.elevation,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  info: {
    flex: 1,
    marginRight: spacing.sm,
  },
  serviceText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  dateText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.xs,
  },
  moreButton: {
    padding: spacing.xs,
  },
  partyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerLow,
  },
  partyLabel: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  partyValue: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  completeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  completeButtonWaiting: {
    backgroundColor: colors.textMuted,
  },
  completeButtonText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
});
