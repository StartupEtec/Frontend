import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRoleContext } from '../context/RoleContext';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/tokens';
import { SuccessToast } from '../components/SuccessToast';
import { StarRating } from '../components/StarRating';
import { useRating } from '../hooks/useRating';
import type { RateeInfo } from '../types/rating';

interface RateServiceScreenProps {
  /** ID de la orden completada. */
  orderId: string;
  /** Información del usuario a calificar (obtenida del detalle de la orden). */
  ratee: RateeInfo;
  /** Callback al enviar la calificación con éxito: navega a Main. */
  onRatingSubmitted: () => void;
}

/**
 * Pantalla "Calificar Servicio" (Issue #48).
 *
 * Se muestra tras finalizar un servicio (ambas partes confirmaron en Mis Pedidos).
 * Permite calificar al otro participante con estrellas (1-5, obligatorio) y
 * opcionalmente escribir una reseña de hasta 500 caracteres.
 *
 * La calificación es obligatoria: no hay botón de saltear ni de volver atrás.
 * Al enviar con éxito se vuelve a la pantalla principal (Main).
 */
export const RateServiceScreen: React.FC<RateServiceScreenProps> = ({
  orderId,
  ratee,
  onRatingSubmitted,
}) => {
  const { currentRole } = useRoleContext();
  const isClient = currentRole === 'client';
  const [reviewText, setReviewText] = useState('');
  const { status, error, submitRating, reset } = useRating();
  const [toastVisible, setToastVisible] = useState(false);

  const maxReviewLength = 500;
  const remainingChars = maxReviewLength - reviewText.length;

  const rateeLabel = isClient ? 'Trabajador' : 'Cliente';

  // Valor de las estrellas gestionado localmente (1-5).
  const [stars, setStars] = useState<number>(0);

  const handleSend = async () => {
    if (stars < 1) {
      Alert.alert('Calificación requerida', 'Seleccioná al menos una estrella antes de enviar.');
      return;
    }
    const success = await submitRating({
      order_id: orderId,
      rating_stars: stars,
      review_text: reviewText.trim() || null,
    });
    if (success) {
      setToastVisible(true);
    }
  };

  const handleToastFinish = () => {
    setToastVisible(false);
    reset();
    onRatingSubmitted();
  };

  const handleRetry = () => {
    reset();
  };

  const isSubmitting = status === 'submitting';
  const isError = status === 'error';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar />

      {/* Encabezado sin botón de volver (calificación obligatoria) */}
      <View style={styles.header}>
        <Text style={styles.title}>Calificar servicio</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Info del usuario a calificar */}
        <View style={styles.infoCard}>
          <View style={styles.avatarWrapper}>
            {ratee.avatar_url ? (
              <Image
                source={{ uri: ratee.avatar_url }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarFallback}>{ratee.full_name?.charAt(0) || 'U'}</Text>
              </View>
            )}
          </View>
          <View style={styles.infoText}>
            <Text style={styles.rateeName}>{ratee.full_name || 'Usuario'}</Text>
            <Text style={styles.rateeRole}>{rateeLabel}</Text>
            <Text style={styles.rateeService}>{ratee.service}</Text>
          </View>
        </View>

        {/* Selector de estrellas */}
        <View style={styles.section}>
          <StarRating
            value={stars}
            onSelect={setStars}
            disabled={isSubmitting}
            testID="star-rating"
          />
        </View>

        {/* Reseña opcional */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Reseña (opcional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Escribí tu experiencia... (máx. 500 caracteres)"
            maxLength={maxReviewLength}
            value={reviewText}
            onChangeText={setReviewText}
            multiline
            numberOfLines={4}
            accessibilityLabel="Reseña opcional"
          />
          <Text style={styles.counterText}>
            {remainingChars} de {maxReviewLength} caracteres
          </Text>
        </View>

        {/* Botón único de enviar (calificación obligatoria) */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            isSubmitting && styles.buttonDisabled,
            stars < 1 && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={isSubmitting || stars < 1}
          accessibilityLabel="Enviar calificación"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={styles.sendButtonText}>Enviar calificación</Text>
          )}
        </TouchableOpacity>

        {/* Mensaje de error */}
        {isError && error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              accessibilityLabel="Reintentar envío"
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Toast de éxito */}
      <SuccessToast
        visible={toastVisible}
        message="Gracias por tu reseña"
        onFinish={handleToastFinish}
        testID="toast-rating-submitted"
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
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    gap: spacing.lg,
  },
  infoCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: shadows.card.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarFallback: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
  },
  rateeName: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  rateeRole: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.xs,
  },
  rateeService: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.xs / 2,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  textInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  counterText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  sendButton: {
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    width: '100%',
  },
  sendButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  errorContainer: {
    backgroundColor: colors.errorContainer,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.error,
    borderRadius: borderRadius.sm,
  },
  retryText: {
    color: colors.onError,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
});
