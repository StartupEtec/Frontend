import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme/tokens';

const FULL_STAR = '★';
const EMPTY_STAR = '☆';

export interface WorkerStarsProps {
  /** Valor de 0 a 5 (puede tener decimales, ej. 4.5). */
  rating: number;
  /** Tamaño de cada estrella en px. */
  size?: number;
  /** Color de las estrellas llenas. */
  activeColor?: string;
  /** Color de las estrellas vacías. */
  inactiveColor?: string;
  /** Si se muestra el valor numérico al lado. */
  showValue?: boolean;
  /** Texto del valor (ej. "4,5"). */
  valueText?: string;
  /** Etiqueta de accesibilidad. */
  accessibilityLabel?: string;
}

/** Una estrella completamente llena. */
const FullStar: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <Text style={[styles.starText, { fontSize: size, color }]}>{FULL_STAR}</Text>
);

/** Una estrella vacía (solo contorno). */
const EmptyStar: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <Text style={[styles.starText, { fontSize: size, color }]}>{EMPTY_STAR}</Text>
);

/** Media estrella: la mitad izquierda rellena, la mitad derecha vacía. */
const HalfStar: React.FC<{
  size: number;
  activeColor: string;
  inactiveColor: string;
}> = ({ size, activeColor, inactiveColor }) => (
  <View style={styles.starSlot}>
    <EmptyStar size={size} color={inactiveColor} />
    <View style={[styles.halfMask, { width: size / 2 }]}>
      <FullStar size={size} color={activeColor} />
    </View>
  </View>
);

/** Relleno visual de calificación con estrellas (vacía / media / llena). */
export const WorkerStars: React.FC<WorkerStarsProps> = ({
  rating = 0,
  size = 16,
  activeColor = colors.primary,
  inactiveColor = colors.border,
  showValue = false,
  valueText,
  accessibilityLabel,
}) => {
  const clamped = Math.min(5, Math.max(0, rating));
  const label = accessibilityLabel ?? `${clamped.toFixed(1)} de 5 estrellas`;

  return (
    <View style={[styles.container, { alignItems: 'center' }]} accessibilityLabel={label}>
      {Array.from({ length: 5 }).map((_, index) => {
        const starRating = clamped - index;
        if (starRating >= 1) {
          return <FullStar key={index} size={size} color={activeColor} />;
        }
        if (starRating > 0) {
          return (
            <HalfStar
              key={index}
              size={size}
              activeColor={activeColor}
              inactiveColor={inactiveColor}
            />
          );
        }
        return <EmptyStar key={index} size={size} color={inactiveColor} />;
      })}
      {showValue && valueText && <Text style={styles.valueText}>{valueText}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row' },
  starSlot: {
    overflow: 'hidden',
    position: 'relative',
  },
  halfMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  starText: {
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  valueText: {
    marginLeft: spacing.xs / 2,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600' as const,
  },
});
