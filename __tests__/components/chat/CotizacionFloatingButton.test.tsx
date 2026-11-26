import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { CotizacionFloatingButton } from '../../../src/components/chat/CotizacionFloatingButton';

const alertSpy = jest.spyOn(Alert, 'alert');

describe('CotizacionFloatingButton', () => {
  const onPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockClear();
  });

  afterAll(() => {
    alertSpy.mockRestore();
  });

  it('renders floating button with icon and label', () => {
    const { getByTestId, getByText } = render(
      <CotizacionFloatingButton accentColor="#004ccd" onPress={onPress} />
    );
    expect(getByTestId('btn-cotizacion-flotante')).toBeTruthy();
    expect(getByText('Cotización')).toBeTruthy();
  });

  it('shows alert when pressed (deshabilitado / próximamente)', () => {
    const { getByTestId } = render(
      <CotizacionFloatingButton accentColor="#004ccd" onPress={onPress} />
    );
    fireEvent.press(getByTestId('btn-cotizacion-flotante'));
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith('Próximamente', expect.any(String), expect.any(Array));
    expect(onPress).toHaveBeenCalled();
  });
});
