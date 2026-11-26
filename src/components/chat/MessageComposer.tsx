import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius, typography } from '../../theme/tokens';

export interface MessageComposerProps {
  /** Callback al enviar un mensaje de texto. */
  onSendMessage: (text: string) => void;
  /** Callback al adjuntar una imagen (recibe el URI seleccionado). */
  onAttachImage: (uri: string) => void;
  /** Callback para quitar la previsualización de imagen. */
  onRemovePreview: () => void;
  /** Callback para enviar la imagen en previsualización. */
  onSendPreviewImage: () => void;
  /** Callback cuando el usuario empieza/deja de escribir. */
  onTyping?: (isTyping: boolean) => void;
  /** URI de la imagen en previsualización (opcional). */
  imagePreview?: string | null;
  /** Si está enviando (deshabilita botones). */
  isSending?: boolean;
}

/**
 * Composer de mensaje autónomo.
 *
 * Estructura:
 * - Si hay previsualización de imagen: fila con miniatura (ancho completo) + botón quitar.
 * - Fila de input: botón adjuntar (izq) | input de texto (centro, crece) | botón enviar (der).
 *
 * Los botones adjuntar y enviar tienen el mismo tamaño (círculo 40×40) con el icono centrado.
 * El botón enviar es gris cuando está vacío y azul (color de la app) cuando hay contenido.
 * El input usa la tecla Enter del teclado del sistema (no el tick) para escribir mensajes
 * estructurados de varias líneas; el envío se hace con el botón enviar.
 */
export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onAttachImage,
  onRemovePreview,
  onSendPreviewImage,
  onTyping,
  imagePreview = null,
  isSending = false,
}) => {
  const [textValue, setTextValue] = useState('');

  const openImagePicker = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        base64: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        onAttachImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  }, [onAttachImage]);

  const handleSend = () => {
    const text = textValue.trim();
    if (text && !isSending) {
      onSendMessage(text);
      setTextValue('');
      onTyping?.(false);
    }
  };

  const handleSendPreview = () => {
    onSendPreviewImage();
    setTextValue('');
    onTyping?.(false);
  };

  const handleTextChange = (text: string) => {
    setTextValue(text);
    onTyping?.(Boolean(text.trim()));
  };

  const hasPreview = Boolean(imagePreview);
  const isEmpty = !textValue.trim() && !hasPreview;
  const buttonDisabled = isEmpty || isSending;

  // El input crece en altura según el contenido, hasta 4 líneas.
  const numberOfLines = Math.min(Math.max(1, Math.ceil(textValue.length / 22)), 4);

  return (
    <View style={styles.container}>
      {/* Previsualización de imagen arriba del contenido (ancho completo) */}
      {hasPreview && imagePreview && (
        <View style={styles.previewRow}>
          <Image source={{ uri: imagePreview }} style={styles.previewImage} />
          <TouchableOpacity
            style={styles.previewRemove}
            onPress={onRemovePreview}
            testID="btn-remove-preview"
            accessibilityRole="button"
            accessibilityLabel="Quitar previsualización de imagen"
          >
            <Feather name="x" size={16} color={colors.onError} accessible={false} />
          </TouchableOpacity>
        </View>
      )}

      {/* Fila de input: adjuntar | texto | enviar */}
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={openImagePicker}
          testID="btn-attach-image"
          accessibilityRole="button"
          accessibilityLabel="Adjuntar imagen"
          disabled={isSending}
        >
          <Feather name="paperclip" size={20} color={colors.textMuted} accessible={false} />
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { height: numberOfLines * 20 + 16, maxHeight: 120 }]}
          value={textValue}
          onChangeText={handleTextChange}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={colors.textMuted}
          testID="input-message"
          accessibilityRole="text"
          accessibilityLabel="Escribe un mensaje"
          onSubmitEditing={handleSend}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={5000}
          multiline={true}
          returnKeyType="done"
          blurOnSubmit={false}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            buttonDisabled && styles.sendButtonDisabled,
            hasPreview && styles.sendButtonPreview,
          ]}
          onPress={hasPreview ? handleSendPreview : handleSend}
          testID={hasPreview ? 'btn-send-image' : 'btn-send-message'}
          accessibilityRole="button"
          accessibilityLabel={hasPreview ? 'Enviar imagen' : 'Enviar mensaje'}
          disabled={buttonDisabled}
        >
          <Feather name="send" size={20} color={colors.onPrimary} accessible={false} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  previewRow: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLow,
    marginBottom: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.regular,
    lineHeight: typography.fontSizes.sm * typography.lineHeights.normal,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceContainerLow,
    textAlignVertical: 'center',
    marginBottom: 2,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  sendButtonPreview: {
    backgroundColor: colors.primary,
  },
});
