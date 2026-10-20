import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  WORKER_MIN_RATING_OPTIONS,
  WORKER_SORT_LABELS,
  WorkerSortOption,
} from "../../types/worker";
import { colors, spacing, borderRadius, typography } from "../../theme/tokens";

export interface WorkerListFiltersProps {
  /** Texto del input de búsqueda por nombre. */
  nameInput: string;
  onNameChange: (value: string) => void;
  /** Calificación mínima activa (0 = sin filtro). */
  minRating: number;
  onMinRatingChange: (value: number) => void;
  /** Criterio de ordenamiento activo. */
  sortBy: WorkerSortOption;
  onSortChange: (value: WorkerSortOption) => void;
  /** Color de acento del rol (cliente/worker). */
  accentColor: string;
  /** Total de resultados tras aplicar filtros (para el contador del pie). */
  filteredCount: number;
  /** Total de resultados crudos recibidos. */
  totalCount: number;
  /** Limpia búsqueda y rating mínimo. */
  onClearFilters: () => void;
  /** true si hay filtros activos (nombre o rating). */
  hasActiveFilters: boolean;
  testID?: string;
}

/** Formatea la etiqueta de rating: 4.5 → "4,5+", 4 → "4+". */
function ratingLabel(value: number): string {
  if (value <= 0) return "Todas";
  const text = value.toFixed(1).replace(/\.0$/, "").replace(".", ",");
  return `${text}+`;
}

const SORT_OPTIONS: WorkerSortOption[] = ["distance", "rating"];

/**
 * Barra de filtros de la vista de lista (Issue #25): búsqueda por nombre
 * (debounced en el hook), calificación mínima y ordenamiento. El filtro de
 * distancia quedó fuera por diseño (radio fijo de 100 km).
 */
export const WorkerListFilters: React.FC<WorkerListFiltersProps> = ({
  nameInput,
  onNameChange,
  minRating,
  onMinRatingChange,
  sortBy,
  onSortChange,
  accentColor,
  filteredCount,
  totalCount,
  onClearFilters,
  hasActiveFilters,
  testID = "worker-list-filters",
}) => (
  <View style={styles.container} testID={testID}>
    <View style={styles.inputRow}>
      <Feather
        name="search"
        size={18}
        color={colors.textMuted}
        accessible={false}
      />
      <TextInput
        style={styles.input}
        value={nameInput}
        onChangeText={onNameChange}
        placeholder="Buscá por nombre"
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        autoCorrect={false}
        testID="worker-list-search-input"
        accessibilityLabel="Buscar trabajador por nombre"
      />
      {nameInput.length > 0 && (
        <TouchableOpacity
          onPress={() => onNameChange("")}
          testID="btn-worker-list-search-clear"
          accessibilityRole="button"
          accessibilityLabel="Borrar búsqueda"
        >
          <Feather name="x" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>

    <Text style={styles.label}>Calificación mínima</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.pillRow}
    >
      {WORKER_MIN_RATING_OPTIONS.map((option) => {
        const active = option === minRating;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.pill, active && { backgroundColor: accentColor }]}
            onPress={() => onMinRatingChange(option)}
            testID={`filter-rating-${option}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={
              option <= 0
                ? "Sin calificación mínima"
                : `${option} estrellas o más`
            }
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>
              {ratingLabel(option)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>

    <Text style={styles.label}>Ordenar por</Text>
    <View style={styles.sortRow} accessibilityRole="radiogroup">
      {SORT_OPTIONS.map((option) => {
        const active = option === sortBy;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.sortButton, active && { borderColor: accentColor }]}
            onPress={() => onSortChange(option)}
            testID={`sort-${option}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Ordenar por ${WORKER_SORT_LABELS[option]}`}
          >
            {active && (
              <Feather
                name="check"
                size={12}
                color={accentColor}
                accessible={false}
              />
            )}
            <Text
              style={[styles.sortText, active && { color: accentColor }]}
              numberOfLines={1}
            >
              {WORKER_SORT_LABELS[option]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>

    <View style={styles.footerRow}>
      <Text style={styles.footerText} testID="worker-list-filters-count">
        {`${filteredCount} de ${totalCount} trabajadores`}
      </Text>
      {hasActiveFilters && (
        <TouchableOpacity
          onPress={onClearFilters}
          testID="btn-worker-list-clear-filters"
          accessibilityRole="button"
          accessibilityLabel="Limpiar filtros"
        >
          <Text style={[styles.clearText, { color: accentColor }]}>
            Limpiar filtros
          </Text>
        </TouchableOpacity>
      )}
    </View>
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
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    paddingVertical: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    textTransform: "uppercase",
    marginTop: spacing.xs,
  },
  pillRow: {
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
  sortRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  sortButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  sortText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
  },
  clearText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default WorkerListFilters;
