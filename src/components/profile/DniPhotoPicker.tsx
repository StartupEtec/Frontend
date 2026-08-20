import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { colors, spacing, borderRadius, typography } from "../../theme/tokens";

interface DniPhotoPickerProps {
  frontUri: string | null;
  backUri: string | null;
  onFrontSelected: (uri: string) => void;
  onBackSelected: (uri: string) => void;
  onFrontRemoved: () => void;
  onBackRemoved: () => void;
  frontError?: string;
  backError?: string;
}

export const DniPhotoPicker: React.FC<DniPhotoPickerProps> = ({
  frontUri,
  backUri,
  onFrontSelected,
  onBackSelected,
  onFrontRemoved,
  onBackRemoved,
  frontError,
  backError,
}) => {
  const [visible, setVisible] = useState(false);
  const [activeTarget, setActiveTarget] = useState<"front" | "back" | null>(
    null,
  );

  const openPicker = (target: "front" | "back") => {
    setActiveTarget(target);
    setVisible(true);
  };

  const resolveUri = (uri: string) => {
    if (activeTarget === "front") onFrontSelected(uri);
    else if (activeTarget === "back") onBackSelected(uri);
    setActiveTarget(null);
  };

  const handleCamera = async () => {
    setVisible(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      resolveUri(result.assets[0].uri);
    }
  };

  const handleGooglePhotos = async () => {
    setVisible(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      resolveUri(result.assets[0].uri);
    }
  };

  const handleGallery = async () => {
    setVisible(false);
    const result = await DocumentPicker.getDocumentAsync({
      type: "image/*",
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      resolveUri(result.assets[0].uri);
    }
  };

  const handleCancel = () => {
    setVisible(false);
    setActiveTarget(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Documento de identidad *</Text>
      <Text style={styles.hint}>
        Foto del frente y dorso del DNI o pasaporte
      </Text>

      <View style={styles.row}>
        {/* Columna Frente */}
        <View style={styles.column}>
          <TouchableOpacity
            style={[styles.slot, frontUri && styles.slotFilled]}
            onPress={() => openPicker("front")}
            activeOpacity={0.7}
          >
            {frontUri ? (
              <Image source={{ uri: frontUri }} style={styles.slotImage} />
            ) : (
              <View style={styles.slotPlaceholder}>
                <Text style={styles.slotIcon}>🪪</Text>
                <Text style={styles.slotText}>Frente</Text>
              </View>
            )}
          </TouchableOpacity>
          {frontUri && (
            <TouchableOpacity onPress={onFrontRemoved} style={styles.removeBtn}>
              <Text style={styles.removeText}>Eliminar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Columna Dorso */}
        <View style={styles.column}>
          <TouchableOpacity
            style={[styles.slot, backUri && styles.slotFilled]}
            onPress={() => openPicker("back")}
            activeOpacity={0.7}
          >
            {backUri ? (
              <Image source={{ uri: backUri }} style={styles.slotImage} />
            ) : (
              <View style={styles.slotPlaceholder}>
                <Text style={styles.slotIcon}>🪪</Text>
                <Text style={styles.slotText}>Dorso</Text>
              </View>
            )}
          </TouchableOpacity>
          {backUri && (
            <TouchableOpacity onPress={onBackRemoved} style={styles.removeBtn}>
              <Text style={styles.removeText}>Eliminar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {frontError && <Text style={styles.errorText}>{frontError}</Text>}
      {backError && <Text style={styles.errorText}>{backError}</Text>}

      <Modal visible={visible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleCancel}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Seleccionar documento</Text>
            <TouchableOpacity style={styles.option} onPress={handleCamera}>
              <Text style={styles.optionIcon}>📷</Text>
              <Text style={styles.optionText}>Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.option}
              onPress={handleGooglePhotos}
            >
              <Text style={styles.optionIcon}>🖼️</Text>
              <Text style={styles.optionText}>Google Fotos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option} onPress={handleGallery}>
              <Text style={styles.optionIcon}>📁</Text>
              <Text style={styles.optionText}>Galería</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.option, styles.optionCancel]}
              onPress={handleCancel}
            >
              <Text style={[styles.optionText, styles.optionCancelText]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  column: {
    flex: 1,
    alignItems: "stretch",
  },
  slot: {
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    backgroundColor: colors.cardBackground,
    overflow: "hidden",
  },
  slotFilled: {
    borderStyle: "solid",
    borderColor: colors.primary,
  },
  slotImage: {
    width: "100%",
    height: "100%",
  },
  slotPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  slotIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  slotText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  removeBtn: {
    paddingVertical: spacing.xs,
    alignItems: "center",
  },
  removeText: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  optionIcon: {
    fontSize: 20,
    marginRight: spacing.md,
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
