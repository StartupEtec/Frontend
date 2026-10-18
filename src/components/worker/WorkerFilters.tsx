import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WORKER_CATEGORIES } from "../../types/worker";
import { colors, spacing, borderRadius, typography } from "../../theme/tokens";

export interface WorkerFiltersProps {
  /** Categoría activa (null = todas). */
  categoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  testID?: string;
}

/**
 * Filtros de la búsqueda: pills de categoría (catálogo fijo del seed, porque
 * el backend no expone /categories). El filtro de distancia fue eliminado:
 * la búsqueda usa un radio fijo.
 */
export const WorkerFilters: React.FC<WorkerFiltersProps> = ({
  categoryId,
  onCategoryChange,
  testID = "worker-filters",
}) => (
  <View style={styles.container} testID={testID}>
    <Text style={styles.label}>Categoría</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryRow}
    >
      <TouchableOpacity
        style={[
          styles.pill,
          categoryId === null && { backgroundColor: colors.primary },
        ]}
        onPress={() => onCategoryChange(null)}
        testID="filter-category-all"
        accessibilityRole="button"
        accessibilityState={{ selected: categoryId === null }}
      >
        <Text
          style={[
            styles.pillText,
            categoryId === null && styles.pillTextActive,
          ]}
        >
          Todas
        </Text>
      </TouchableOpacity>
      {WORKER_CATEGORIES.map((category, index) => {
        const active = category.id === categoryId;
        return (
          <TouchableOpacity
            key={category.id}
            style={[styles.pill, active && { backgroundColor: colors.primary }]}
            onPress={() => onCategoryChange(category.id)}
            testID={`filter-category-${index}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Filtrar por ${category.name}`}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    textTransform: "uppercase",
    marginTop: spacing.xs,
  },
  categoryRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  pill: {
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  pillTextActive: {
    color: colors.onPrimary,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default WorkerFilters;
