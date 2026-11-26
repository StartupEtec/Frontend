import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme/tokens';

interface StarRatingProps {
  /** Valor actual seleccionado (1-5). */
  value: number;
  /** Callback al seleccionar una estrella. */
  onSelect: (stars: number) => void;
  /** Si el selector está deshabilitado (durante envío). */
  disabled?: boolean;
  /** Tamaño de cada estrella en px (fijo para evitar desplazamiento). */
  size?: number;
  /** testID para pruebas. */
  testID?: string;
}

/**
 * Selector de estrellas interactivas (1-5).
 *
 * Cada estrella tiene un tamaño fijo para que no haya desplazamiento
 * al alternar entre estrella vacía y rellena.
 * Muestra estrellas rellenas hasta el valor seleccionado y vacías el resto.
 */
export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onSelect,
  disabled = false,
  size = 36,
  testID,
}) => {
  const stars = [1, 2, 3, 4, 5];

  const isFilled = (star: number) => star <= value;
  const isActive = (star: number) => !disabled && star <= value;

  const handleSelect = (stars: number) => {
    if (disabled) return;
    onSelect(stars);
  };

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.label}>Calificación</Text>
      <View style={styles.row}>
        {stars.map((star) => (
          <TouchableOpacity
            key={star}
            style={styles.starButton}
            onPress={() => handleSelect(star)}
            disabled={disabled}
            accessibilityLabel={`Estrella ${star}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isFilled(star) }}
          >
            <Feather
              name={
                (isFilled(star) ? 'star' : 'star-outline') as unknown as React.ComponentProps<
                  typeof Feather
                >['name']
              }
              size={size}
              color={isActive(star) ? colors.warning : colors.dotInactive}
              accessible={false}
              style={{ width: size, height: size }}
            />
          </TouchableOpacity>
        ))}
      </View>
      {value > 0 && (
        <Text style={styles.valueText}>
          {value} estrella{value > 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  starButton: {
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    textAlign: 'center',
  },
});
