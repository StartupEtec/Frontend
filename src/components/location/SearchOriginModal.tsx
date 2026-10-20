import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from "react-native";
import { SavedLocation } from "../../types/location";
import { locationService } from "../../services/locationService";
import { tokenStorage } from "../../services/tokenStorage";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from "../../theme/tokens";

interface SearchOriginModalProps {
  /** true cuando el usuario pidió elegir desde dónde buscar. */
  visible: boolean;
  /** Ubicación actualmente activa (se resalta en la lista). */
  selectedId?: string | null;
  /** Eligió una ubicación: la búsqueda se centra y colorea desde ahí. */
  onSelect: (location: SavedLocation) => void;
  /** Quiere guardar una ubicación nueva (navega al formulario). */
  onAddLocation: () => void;
  onDismiss: () => void;
}

type OriginStatus = "loading" | "ready" | "error";

/**
 * Pop-up de selección de la ubicación de referencia para "Buscar
 * Trabajadores" (mismo patrón visual que el modal de cambio de rol).
 *
 * Al abrirse lista las ubicaciones guardadas del usuario
 * (`GET /users/:id/locations`); elegir una define el punto desde el que se
 * buscan y se tiñen los trabajadores (reemplaza a la ubicación del
 * dispositivo). El botón "Agregar ubicación" se muestra siempre, y es la
 * salida cuando el usuario todavía no guardó ninguna.
 */
export const SearchOriginModal: React.FC<SearchOriginModalProps> = ({
  visible,
  selectedId,
  onSelect,
  onAddLocation,
  onDismiss,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const [status, setStatus] = useState<OriginStatus>("loading");
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  // Bump para reintentar sin reabrir el modal.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  // Lista fresca en cada apertura (así aparecen las ubicaciones agregadas
  // mientras tanto) y ante un reintento.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setStatus("loading");
    setLocations([]);
    (async () => {
      try {
        const userId = await tokenStorage.getUserId();
        if (!userId) throw new Error("Sesión inválida");
        const list = await locationService.list(userId);
        if (cancelled) return;
        // La principal primero; el resto en el orden que devuelve la API.
        setLocations(
          [...list].sort(
            (a, b) =>
              Number(b.is_primary ?? false) - Number(a.is_primary ?? false),
          ),
        );
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, reloadKey]);

  const handleRetry = useCallback(() => setReloadKey((key) => key + 1), []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      testID="search-origin-modal"
    >
      <Animated.View
        style={[styles.overlay, { opacity: opacityAnim }]}
        testID="modal-overlay"
      >
        <Animated.View
          style={[styles.modalContainer, { transform: [{ scale: scaleAnim }] }]}
        >
          <Text style={styles.title}>¿Dónde necesitás el servicio?</Text>
          <Text style={styles.subtitle}>
            Elegí una ubicación para buscar trabajadores cerca de ahí.
          </Text>

          {status === "loading" && (
            <View style={styles.loadingRow} testID="search-origin-loading">
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>
                Cargando tus ubicaciones...
              </Text>
            </View>
          )}

          {status === "error" && (
            <View style={styles.errorBox} testID="search-origin-error">
              <Text style={styles.errorText}>
                No pudimos cargar tus ubicaciones.
              </Text>
              <TouchableOpacity
                onPress={handleRetry}
                testID="btn-search-origin-retry"
                accessibilityRole="button"
              >
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === "ready" && locations.length === 0 && (
            <Text style={styles.emptyText} testID="search-origin-empty">
              Todavía no guardaste ninguna ubicación.
            </Text>
          )}

          {status === "ready" &&
            locations.map((location) => {
              const isActive = location.id === selectedId;
              return (
                <TouchableOpacity
                  key={location.id}
                  style={[styles.option, isActive && styles.optionActive]}
                  onPress={() => onSelect(location)}
                  testID={`origin-option-${location.id}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isActive }}
                >
                  <Text style={styles.optionIcon}>📍</Text>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionAddress} numberOfLines={2}>
                      {location.address}
                    </Text>
                    {location.is_primary && (
                      <Text style={styles.primaryBadge}>Principal</Text>
                    )}
                  </View>
                  {isActive && (
                    <View style={styles.activeIndicator}>
                      <Text style={styles.activeCheck}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

          {/* Siempre visible: permite agregar otra ubicación (o la primera)
              sin tener que ir a Perfil. */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={onAddLocation}
            testID="btn-add-origin"
            accessibilityRole="button"
            accessibilityLabel="Agregar ubicación"
          >
            <Text style={styles.addText}>＋ Agregar ubicación</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onDismiss}
            testID="btn-search-origin-cancel"
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    textAlign: "center",
  },
  retryText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  optionActive: {
    borderColor: colors.workerAccent,
    backgroundColor: "rgba(16,185,129,0.10)",
  },
  optionIcon: {
    fontSize: 22,
  },
  optionInfo: {
    flex: 1,
    gap: 2,
  },
  optionAddress: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  primaryBadge: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  activeIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.workerAccent,
    justifyContent: "center",
    alignItems: "center",
  },
  activeCheck: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  addButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.primary,
  },
  addText: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  cancelButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  cancelText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
});

export default SearchOriginModal;
