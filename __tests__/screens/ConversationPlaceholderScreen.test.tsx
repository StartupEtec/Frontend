import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ConversationPlaceholderScreen } from '../../src/screens/ConversationPlaceholderScreen';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('ConversationPlaceholderScreen', () => {
  it('renders title and back button', () => {
    const onGoBack = jest.fn();
    const { getByText, getByTestId } = render(
      <ConversationPlaceholderScreen chatId="c-1" onGoBack={onGoBack} />
    );

    expect(getByText('Chat')).toBeTruthy();
    expect(getByText('Chat: c-1')).toBeTruthy();
    expect(getByTestId('btn-conversation-back')).toBeTruthy();
  });

  it('calls onGoBack when back is pressed', () => {
    const onGoBack = jest.fn();
    const { getByTestId } = render(<ConversationPlaceholderScreen onGoBack={onGoBack} />);

    fireEvent.press(getByTestId('btn-conversation-back'));

    expect(onGoBack).toHaveBeenCalled();
  });

  it('shows placeholder when no chatId is provided', () => {
    const { getByText } = render(<ConversationPlaceholderScreen onGoBack={jest.fn()} />);

    expect(getByText('Sin ID de chat')).toBeTruthy();
  });
});
