import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MessageComposer } from '../../../src/components/chat/MessageComposer';
import * as ImagePicker from 'expo-image-picker';

const mockLaunchImageLibraryAsync = ImagePicker.launchImageLibraryAsync as jest.Mock;

describe('MessageComposer', () => {
  const onSendMessage = jest.fn();
  const onAttachImage = jest.fn();
  const onRemovePreview = jest.fn();
  const onSendPreviewImage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///mock/photo.jpg' }],
    });
  });

  it('renders input with placeholder and send button', () => {
    const { getByPlaceholderText, getByTestId } = render(
      <MessageComposer
        onSendMessage={onSendMessage}
        onAttachImage={onAttachImage}
        onRemovePreview={onRemovePreview}
        onSendPreviewImage={onSendPreviewImage}
      />
    );
    expect(getByPlaceholderText('Escribe un mensaje...')).toBeTruthy();
    expect(getByTestId('btn-send-message')).toBeTruthy();
    expect(getByTestId('btn-attach-image')).toBeTruthy();
  });

  it('sends message text on send button press', () => {
    const { getByPlaceholderText, getByTestId } = render(
      <MessageComposer
        onSendMessage={onSendMessage}
        onAttachImage={onAttachImage}
        onRemovePreview={onRemovePreview}
        onSendPreviewImage={onSendPreviewImage}
      />
    );
    fireEvent.changeText(getByPlaceholderText('Escribe un mensaje...'), 'Hola mundo');
    fireEvent.press(getByTestId('btn-send-message'));
    expect(onSendMessage).toHaveBeenCalledWith('Hola mundo');
  });

  it('disables send button when input is empty', () => {
    const { getByTestId } = render(
      <MessageComposer
        onSendMessage={onSendMessage}
        onAttachImage={onAttachImage}
        onRemovePreview={onRemovePreview}
        onSendPreviewImage={onSendPreviewImage}
      />
    );
    const sendButton = getByTestId('btn-send-message');
    // disabled prop no se refleja directamente en testID, pero verificamos que no llame onSendMessage
    fireEvent.press(sendButton);
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('opens image picker on attach button press', async () => {
    const { getByTestId } = render(
      <MessageComposer
        onSendMessage={onSendMessage}
        onAttachImage={onAttachImage}
        onRemovePreview={onRemovePreview}
        onSendPreviewImage={onSendPreviewImage}
      />
    );
    fireEvent.press(getByTestId('btn-attach-image'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockLaunchImageLibraryAsync).toHaveBeenCalled();
    expect(onAttachImage).toHaveBeenCalledWith('file:///mock/photo.jpg');
  });

  it('shows image preview when imagePreview is set', () => {
    const { getByTestId } = render(
      <MessageComposer
        onSendMessage={onSendMessage}
        onAttachImage={onAttachImage}
        onRemovePreview={onRemovePreview}
        onSendPreviewImage={onSendPreviewImage}
        imagePreview="file:///mock/preview.jpg"
      />
    );
    expect(getByTestId('btn-remove-preview')).toBeTruthy();
  });

  it('removes preview on x button press', () => {
    const { getByTestId } = render(
      <MessageComposer
        onSendMessage={onSendMessage}
        onAttachImage={onAttachImage}
        onRemovePreview={onRemovePreview}
        onSendPreviewImage={onSendPreviewImage}
        imagePreview="file:///mock/preview.jpg"
      />
    );
    fireEvent.press(getByTestId('btn-remove-preview'));
    expect(onRemovePreview).toHaveBeenCalled();
  });

  it('sends preview image on send button when preview exists', () => {
    const { getByTestId } = render(
      <MessageComposer
        onSendMessage={onSendMessage}
        onAttachImage={onAttachImage}
        onRemovePreview={onRemovePreview}
        onSendPreviewImage={onSendPreviewImage}
        imagePreview="file:///mock/preview.jpg"
      />
    );
    fireEvent.press(getByTestId('btn-send-image'));
    expect(onSendPreviewImage).toHaveBeenCalled();
  });

  it('calls onTyping when text changes', () => {
    const onTyping = jest.fn();
    const { getByPlaceholderText } = render(
      <MessageComposer
        onSendMessage={onSendMessage}
        onAttachImage={onAttachImage}
        onRemovePreview={onRemovePreview}
        onSendPreviewImage={onSendPreviewImage}
        onTyping={onTyping}
      />
    );
    fireEvent.changeText(getByPlaceholderText('Escribe un mensaje...'), 'Escribiendo');
    expect(onTyping).toHaveBeenCalledWith(true);
    fireEvent.changeText(getByPlaceholderText('Escribe un mensaje...'), '');
    expect(onTyping).toHaveBeenCalledWith(false);
  });
});
