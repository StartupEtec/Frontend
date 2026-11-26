import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '../services/api';
import { colors, spacing, borderRadius, typography } from '../theme/tokens';
import { SuccessToast } from '../components/SuccessToast';

export interface PaymentScreenProps {
  /** ID de la orden a pagar. */
  orderId: string;
  /** Monto a pagar. */
  amount: number;
  /** Callback al completar el pago. */
  onPaymentCompleted: () => void;
  /** Callback al volver atrás. */
  onGoBack: () => void;
}

/**
 * Pantalla "Pago" (Issue #36).
 *
 * Muestra el monto a pagar y simula el procesamiento. Tras el pago exitoso
 * notifica al backend que la orden fue aceptada (estado ACCEPTED) para que
 * aparezca en la pantalla de Mis Pedidos, muestra un toast y navega de
 * vuelta a la conversación.
 */
export const PaymentScreen: React.FC<PaymentScreenProps> = ({
  orderId,
  amount,
  onPaymentCompleted,
  onGoBack,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const handlePay = async () => {
    setIsProcessing(true);
    try {
      // Aquí se integraría con la pasarela de pagos real.
      // Por ahora simulamos un pago exitoso.
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Notificar al backend que la orden fue pagada y pasar su estado a ACCEPTED
      // para que aparezca en la pantalla de Mis Pedidos.
      try {
        await apiClient(`/orders/${orderId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'ACCEPTED' }),
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'No se pudo confirmar el pago con el servidor.';
        Alert.alert('Error', message);
        setIsProcessing(false);
        return;
      }

      setIsProcessing(false);
      setToastVisible(true);
    } catch {
      setIsProcessing(false);
      Alert.alert('Error', 'No se pudo procesar el pago');
    }
  };

  const handleToastFinish = () => {
    setToastVisible(false);
    onPaymentCompleted();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Encabezado */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.closeButton}>
          <Feather name="x" size={20} color={colors.textMuted} accessible={false} />
        </TouchableOpacity>
        <Text style={styles.title}>Pago</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Cuerpo */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Monto a pagar</Text>
          <Text style={styles.amountValue}>${Number(amount || 0).toFixed(2)}</Text>
        </View>

        <View style={styles.checkmarkContainer}>
          <Feather name="check-circle" size={96} color={colors.success} accessible={false} />
        </View>

        <Text style={styles.statusText}>
          {isProcessing ? 'Procesando pago...' : 'Pago listo para confirmar'}
        </Text>
      </ScrollView>

      {/* Pie */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
          onPress={handlePay}
          disabled={isProcessing || toastVisible}
        >
          {isProcessing ? (
            <Text style={styles.payButtonText}>Procesando...</Text>
          ) : (
            <Text style={styles.payButtonText}>Continuar</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Toast de confirmación de pago */}
      <SuccessToast
        visible={toastVisible}
        message="Tu pedido ya se confirmó y lo podés ver en la pantalla de mis pedidos."
        onFinish={handleToastFinish}
        testID="toast-payment-confirmed"
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
  },
  headerSpacer: { width: 40 },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  amountLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    marginRight: spacing.xs,
  },
  amountValue: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
  },
  checkmarkContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceContainerLow,
  },
  payButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 160,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  payButtonText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default PaymentScreen;
