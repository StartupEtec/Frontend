import React, { useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, shadows, spacing, borderRadius, typography } from '../theme/tokens';
import type { Order } from '../types/order';

interface OrderDetailModalProps {
  /** Si el modal está visible. */
  visible: boolean;
  /** Orden a mostrar. */
  order: Order | null;
  /** Rol activo del usuario (para mostrar el nombre de la otra parte). */
  userRole: 'client' | 'worker';
  /** Callback al cerrar el modal. */
  onClose: () => void;
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
 * Modal de detalles de una orden (Issue #45).
 *
 * Se abre al tocar el botón de los tres puntitos en una tarjeta de orden.
 * Muestra: nombre de la otra parte (Cliente/Trabajador), servicio, fecha,
 * precio y estado. Es de solo lectura.
 */
export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  visible,
  order,
  userRole,
  onClose,
}) => {
  if (!order) return null;

  const isClient = userRole === 'client';
  const otherParty = isClient ? order.worker : order.client;
  const otherPartyLabel = isClient ? 'Trabajador' : 'Cliente';
  const otherPartyName = otherParty?.full_name || 'Usuario';

  // Tomar precio y fecha de la cotización si existe.
  const quote = order.quotes?.[0];
  const price = quote?.proposed_price != null ? `$${quote.proposed_price.toFixed(2)}` : '—';
  const date = formatDate(quote?.proposed_date || order.scheduled_date);
  const service = order.category_name || order.description || 'Servicio sin descripción';

  const statusLabel: Record<string, string> = {
    PENDING: 'Pendiente',
    ACCEPTED: 'Aceptado',
    IN_PROGRESS: 'En progreso',
    COMPLETED: 'Completado',
    REJECTED: 'Rechazado',
    CANCELLED: 'Cancelado',
  };

  const statusColor: Record<string, string> = {
    PENDING: colors.warning,
    ACCEPTED: colors.primary,
    IN_PROGRESS: colors.primary,
    COMPLETED: colors.success,
    REJECTED: colors.error,
    CANCELLED: colors.textMuted,
  };

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent onRequestClose={handleClose} animationType="fade">
      <Pressable
        style={styles.overlay}
        onPress={handleClose}
        accessibilityLabel="Cerrar detalles del pedido"
      />
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>Detalles del pedido</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              accessibilityLabel="Cerrar"
            >
              <Feather name="x" size={20} color={colors.textMuted} accessible={false} />
            </TouchableOpacity>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{otherPartyLabel}</Text>
            <Text style={styles.detailValue}>{otherPartyName}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Servicio</Text>
            <Text style={styles.detailValue}>{service}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fecha</Text>
            <Text style={styles.detailValue}>{date}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Precio</Text>
            <Text style={styles.detailValue}>{price}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estado</Text>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: statusColor[order.status] }]} />
              <Text style={styles.statusText}>{statusLabel[order.status]}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 320,
    shadowColor: shadows.card.shadowColor,
    shadowOffset: shadows.card.shadowOffset,
    shadowOpacity: shadows.card.shadowOpacity,
    shadowRadius: shadows.card.shadowRadius,
    elevation: shadows.card.elevation,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  closeButton: {
    padding: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  detailValue: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default OrderDetailModal;
