import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { CameraType } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "../../theme/tokens";

interface CameraCaptureProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string) => void;
  /** Cámara inicial. Selfie => "front"; documentos => "back". */
  initialFacing?: CameraType;
}

/**
 * Cámara embebida en la app (expo-camera).
 *
 * A diferencia de `ImagePicker.launchCameraAsync`, que abre la app de cámara del
 * sistema en otra Activity, este componente renderiza el preview dentro del
 * mismo proceso. Así Android nunca destruye la Activity de la app y no se
 * reinicia al volver de la cámara.
 */
export const CameraCapture: React.FC<CameraCaptureProps> = ({
  visible,
  onClose,
  onCapture,
  initialFacing = "back",
}) => {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>(initialFacing);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al abrir, reseteamos el estado a los valores iniciales.
  useEffect(() => {
    if (visible) {
      setFacing(initialFacing);
      setReady(false);
      setCapturing(false);
      setError(null);
    }
  }, [visible, initialFacing]);

  const handleFlip = () => {
    setReady(false);
    setError(null);
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  const handleCapture = async () => {
    if (!cameraRef.current || !ready || capturing) return;
    setCapturing(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        onCapture(photo.uri);
      } else {
        setError("No se pudo capturar la foto.");
      }
    } catch {
      setError("No se pudo capturar la foto. Probá de nuevo.");
    } finally {
      setCapturing(false);
    }
  };

  const permissionGranted = permission?.granted === true;
  const shutterDisabled = !ready || capturing;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        {!permission ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.cardBackground} />
          </View>
        ) : !permissionGranted ? (
          <View style={styles.centered}>
            <Feather
              name="camera-off"
              size={40}
              color={colors.cardBackground}
              accessible={false}
            />
            <Text style={styles.permissionText}>
              Necesitamos permiso para usar la cámara.
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={() => requestPermission()}
              activeOpacity={0.8}
              testID="camera-request-permission"
            >
              <Text style={styles.permissionButtonText}>Permitir cámara</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
            testID="camera-view"
            onCameraReady={() => setReady(true)}
            onMountError={() => setError("No se pudo iniciar la cámara.")}
          />
        )}

        <SafeAreaView
          style={styles.overlay}
          edges={["top", "bottom"]}
          pointerEvents="box-none"
        >
          <View style={styles.topBar} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onClose}
              activeOpacity={0.7}
              testID="camera-close"
            >
              <Feather
                name="x"
                size={26}
                color={colors.cardBackground}
                accessible={false}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.centerArea} pointerEvents="none">
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>

          {permissionGranted ? (
            <View style={styles.bottomBar} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleFlip}
                activeOpacity={0.7}
                testID="camera-flip"
              >
                <Feather
                  name="refresh-ccw"
                  size={24}
                  color={colors.cardBackground}
                  accessible={false}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.shutter,
                  shutterDisabled && styles.shutterDisabled,
                ]}
                onPress={handleCapture}
                disabled={shutterDisabled}
                activeOpacity={0.8}
                testID="camera-shutter"
              >
                {capturing ? (
                  <ActivityIndicator color={colors.textPrimary} />
                ) : (
                  <View style={styles.shutterInner} />
                )}
              </TouchableOpacity>

              <View style={styles.iconButton} />
            </View>
          ) : (
            <View />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const CONTROL_SIZE = 56;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  permissionText: {
    color: colors.cardBackground,
    fontSize: typography.fontSizes.md,
    textAlign: "center",
  },
  permissionButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  permissionButtonText: {
    color: colors.cardBackground,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  centerArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  iconButton: {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: CONTROL_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: colors.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.cardBackground,
  },
  errorBanner: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xl,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    textAlign: "center",
  },
});
