import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QuoteRequestButton } from '../../../src/components/chat/QuoteRequestButton';

describe('QuoteRequestButton', () => {
  const onPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    onPress.mockClear();
  });

  it('renders the button with text and icon', () => {
    const { getByTestId, getByText } = render(<QuoteRequestButton onPress={onPress} />);
    expect(getByTestId('btn-request-quote')).toBeTruthy();
    expect(getByText('Solicitar Cotización')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const { getByTestId } = render(<QuoteRequestButton onPress={onPress} />);
    fireEvent.press(getByTestId('btn-request-quote'));
    expect(onPress).toHaveBeenCalled();
  });

  it('does not call onPress when disabled', () => {
    const { getByTestId } = render(<QuoteRequestButton onPress={onPress} disabled />);
    fireEvent.press(getByTestId('btn-request-quote'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
