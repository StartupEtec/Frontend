import React from 'react';
import { render } from '@testing-library/react-native';
import { QuotePill } from '../../../src/components/chat/QuotePill';

describe('QuotePill', () => {
  it('renders the pill with default text', () => {
    const { getByText } = render(<QuotePill />);
    expect(getByText('Cotización solicitada')).toBeTruthy();
  });

  it('renders the pill with custom text', () => {
    const { getByText } = render(<QuotePill text="Cotización enviada" />);
    expect(getByText('Cotización enviada')).toBeTruthy();
  });
});
