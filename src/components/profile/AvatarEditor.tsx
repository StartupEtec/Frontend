import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { CameraCapture } from "./CameraCapture";
import { colors, spacing, borderRadius, typography } from "../../theme/tokens";

const QUALITY = 0.7;

interface AvatarEditorProps {
  /** URI lista para <Image> o null si todavía no hay foto. */
  uri: string | null;
  /** Se llama con la URI local de la foto elegida/capturada. */
  onChange: (uri: string) => void;
  /** Mientras sube/guarda: deshabilita el botón y muestra un overlay. */
  saving?: boolean;
  accentColor?: string;
  /** Diámetro del avatar en px. */
  size?: number;
  testID?: string;
}

/**
 * Avatar grande con un botón circular de edición superpuesto.
 *
 * Tocar el botón abre una hoja con "Cámara" (cámara embebida con expo-camera,
 * sin reiniciar la app) o "Galería". La foto elegida se devuelve por
 * `onChange`; el guardado lo maneja quien lo use.
 */
export const AvatarEditor: React.FC<AvatarEditorProps> = ({
  uri,
  onChange,
  saving = false,
  accentColor = colors.primary,
  size = 160,
  testID = "avatar-editor",
}) => {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);

  const openSheet = () => {
    if (saving) return;
    setSheetVisible(true);
  };

  const handleCamera = () => {
    setSheetVisible(false);
    setCameraVisible(true);
  };

  const handleCameraCapture = (captured: string) => {
    setCameraVisible(false);
    onChange(captured);
  };

  const handleGallery = async () => {
    setSheetVisible(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: QUALITY,
    });
    if (!result.canceled && result.assets?.[0]) {
      onChange(result.assets[0].uri);
    }
  };

  const radius = size / 2;

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      testID={testID}
    >
      <View
        style={[
          styles.avatarWrap,
          {
            width: size,
            height: size,
            borderRadius: radius,
            borderColor: accentColor,
          },
        ]}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.image}
            testID="edit-profile-avatar"
          />
        ) : (
          <View
            style={styles.placeholder}
            testID="edit-profile-avatar-placeholder"
          >
            <Feather
              name="user"
              size={Math.round(size * 0.4)}
              color={accentColor}
              accessible={false}
            />
          </View>
        )}

        {saving && (
          <View
            style={styles.savingOverlay}
            testID="edit-profile-avatar-saving"
          >
            <ActivityIndicator color={colors.onPrimary} />
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.editButton, { backgroundColor: accentColor }]}
        onPress={openSheet}
        disabled={saving}
        activeOpacity={0.8}
        testID="btn-edit-avatar"
        accessibilityRole="button"
        accessibilityLabel="Cambiar foto de perfil"
      >
        <Feather
          name="camera"
          size={18}
          color={colors.onPrimary}
          accessible={false}
        />
      </TouchableOpacity>

      <Modal visible={sheetVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setSheetVisible(false)}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Foto de perfil</Text>
            <TouchableOpacity
              style={styles.option}
              onPress={handleCamera}
              testID="btn-avatar-camera"
            >
              <Feather
                name="camera"
                size={20}
                color={accentColor}
                accessible={false}
              />
              <Text style={styles.optionText}>Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.option}
              onPress={handleGallery}
              testID="btn-avatar-gallery"
            >
              <Feather
                name="image"
                size={20}
                color={accentColor}
                accessible={false}
              />
              <Text style={styles.optionText}>Galería</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.option, styles.optionCancel]}
              onPress={() => setSheetVisible(false)}
              testID="btn-avatar-cancel"
            >
              <Text style={[styles.optionText, styles.optionCancelText]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <CameraCapture
        visible={cameraVisible}
        initialFacing="front"
        onClose={() => setCameraVisible(false)}
        onCapture={handleCameraCapture}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrap: {
    overflow: "hidden",
    backgroundColor: colors.cardBackground,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  savingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: colors.background,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.surfaceContainerLow,
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
  },
  optionCancel: {
    backgroundColor: "transparent",
    marginTop: spacing.sm,
    justifyContent: "center",
  },
  optionCancelText: {
    color: colors.textSecondary,
    textAlign: "center",
  },
});

export default AvatarEditor;
