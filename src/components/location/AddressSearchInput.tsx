import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { GeocodeResult } from "../../services/geocodingService";
import { colors, spacing, borderRadius, typography } from "../../theme/tokens";

interface AddressSearchInputProps {
  value: string;
  onChangeText: (value: string) => void;
  /** Se llama (con debounce) cuando el usuario escribe. */
  onSearch: (query: string) => void;
  onSelect: (result: GeocodeResult) => void;
  results: GeocodeResult[];
  searching: boolean;
  error?: string | null;
  accentColor?: string;
}

const DEBOUNCE_MS = 400;

/**
 * Campo de dirección con búsqueda incremental (debounced) y lista de
 * sugerencias.
 *
 * El debounce vive acá y solo se dispara con la escritura del usuario: los
 * cambios programáticos del `value` (al elegir una sugerencia o al hacer
 * reverse-geocoding del mapa) NO vuelven a buscar, evitando reabrir la lista
 * de resultados.
 */
export const AddressSearchInput: React.FC<AddressSearchInputProps> = ({
  value,
  onChangeText,
  onSearch,
  onSelect,
  results,
  searching,
  error,
  accentColor = colors.primary,
}) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Cancela una búsqueda pendiente al desmontar.
  useEffect(() => () => clearTimer(), []);

  const handleChange = (text: string) => {
    onChangeText(text);
    clearTimer();
    timerRef.current = setTimeout(() => onSearch(text), DEBOUNCE_MS);
  };

  const handleSelect = (result: GeocodeResult) => {
    clearTimer();
    onSelect(result);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Dirección</Text>
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <Feather
          name="search"
          size={18}
          color={colors.textMuted}
          accessible={false}
        />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChange}
          placeholder="Buscá una dirección"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          testID="address-search-input"
          accessibilityLabel="Dirección"
        />
        {searching && <ActivityIndicator size="small" color={accentColor} />}
      </View>

      {error && (
        <Text style={styles.error} testID="address-search-error">
          {error}
        </Text>
      )}

      {results.length > 0 && (
        <View style={styles.results} testID="address-search-results">
          {results.map((result, index) => (
            <TouchableOpacity
              key={`${result.latitude}-${result.longitude}-${index}`}
              style={styles.resultRow}
              onPress={() => handleSelect(result)}
              testID={`address-result-${index}`}
              accessibilityRole="button"
            >
              <Feather
                name="map-pin"
                size={16}
                color={accentColor}
                accessible={false}
              />
              <Text style={styles.resultText} numberOfLines={2}>
                {result.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.cardBackground,
  },
  inputRowError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
  },
  error: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
  },
  results: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardBackground,
    overflow: "hidden",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resultText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
  },
});

export default AddressSearchInput;
