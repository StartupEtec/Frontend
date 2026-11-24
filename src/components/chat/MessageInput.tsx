import React, { useCallback, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius, typography } from '../../theme/tokens';

export interface MessageInputProps {
  /** Valor actual del input. */
  value: string;
  /** Cambio de valor del input. */
  onChangeText: (text: string) => void;
  /** Enviar mensaje de texto. */
  onSendMessage: (text: string) => void;
  /** Enviar imagen adjunta. */
  onSendImage?: (imageUri: string) => void;
  /** Si está enviando (deshabilita botón). */
  isSending?: boolean;
}

/** Input de mensaje con botón de adjuntar imagen y botón de enviar. */
export const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChangeText,
  onSendMessage,
  onSendImage,
  isSending = false,
}) => {
  const openImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        base64: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        onSendImage?.(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleSend = () => {
    const text = value.trim();
    if (text && !isSending) {
      onSendMessage(text);
    }
  };

  return (
    <View style={styles.container}>
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
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Escribe un mensaje..."
        placeholderTextColor={colors.textMuted}
        testID="input-message"
        accessibilityRole="text"
        accessibilityLabel="Escribe un mensaje"
        onSubmitEditing={handleSend}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={5000}
        numberOfLines={1}
      />
      <TouchableOpacity
        style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
        onPress={handleSend}
        testID="btn-send-message"
        accessibilityRole="button"
        accessibilityLabel="Enviar mensaje"
        disabled={!value.trim() || isSending}
      >
        <Feather name="send" size={20} color={colors.onPrimary} accessible={false} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.regular,
    lineHeight: typography.fontSizes.sm * typography.lineHeights.normal,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceContainerLow,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  sendButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
});
