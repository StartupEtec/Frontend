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

const QUALITY = 0.7;

interface PhotoPickerProps {
  uri: string | null;
  onPhotoSelected: (uri: string) => void;
  onPhotoRemoved: () => void;
  error?: string;
}

export const PhotoPicker: React.FC<PhotoPickerProps> = ({
  uri,
  onPhotoSelected,
  onPhotoRemoved,
  error,
}) => {
  const [visible, setVisible] = useState(false);

  const handleCamera = async () => {
    setVisible(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: QUALITY,
    });
    if (!result.canceled && result.assets?.[0]) {
      onPhotoSelected(result.assets[0].uri);
    }
  };

  const handleGooglePhotos = async () => {
    setVisible(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: QUALITY,
    });
    if (!result.canceled && result.assets?.[0]) {
      onPhotoSelected(result.assets[0].uri);
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
      onPhotoSelected(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.avatar} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>📷</Text>
            <Text style={styles.placeholderText}>Agregar foto</Text>
          </View>
        )}
      </TouchableOpacity>
      {uri && (
        <TouchableOpacity onPress={onPhotoRemoved} style={styles.removeButton}>
          <Text style={styles.removeText}>Eliminar</Text>
        </TouchableOpacity>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={visible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Foto de perfil</Text>
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
              onPress={() => setVisible(false)}
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
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  pickerButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  placeholderText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    textAlign: "center",
  },
  removeButton: {
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  removeText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
    textAlign: "center",
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
