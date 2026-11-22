import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/tokens';

export interface WorkerStarsProps {
  /** Cantidad de estrellas llenas (0-5). */
  stars: number;
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

/** Relleno visual de calificación con estrellas. */
export const WorkerStars: React.FC<WorkerStarsProps> = ({
  stars = 0,
  size = 16,
  activeColor = colors.primary,
  inactiveColor = colors.border,
  showValue = false,
  valueText,
  accessibilityLabel,
}) => {
  const fullStars = Math.min(5, Math.max(0, stars));
  const label = accessibilityLabel ?? `${fullStars} de 5 estrellas`;

  return (
    <View style={[styles.container, { alignItems: 'center' }]} accessibilityLabel={label}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Feather
          key={index}
          name={index < fullStars ? 'star' : 'star-outline'}
          size={size}
          color={index < fullStars ? activeColor : inactiveColor}
          style={{ marginRight: spacing.xs / 2 }}
          accessible={false}
        />
      ))}
      {showValue && valueText && <Text style={styles.valueText}>{valueText}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row' },
  valueText: {
    marginLeft: spacing.xs / 2,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600' as const,
  },
});
