import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNavigator } from '../../src/navigation/AppNavigator';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('AppNavigator Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts at OnboardingScreen if onboarding is not completed, then moves to AuthWelcome on completion', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { getByText, getByTestId } = render(<AppNavigator />);

    // Wait for initial route check
    await waitFor(() => {
      expect(getByText('Conecta con Servicios al Instante')).toBeTruthy();
    });

    // Verify Onboarding carousel is active with "Omitir" button
    expect(getByText('Omitir')).toBeTruthy();

    // Click "Omitir" or complete onboarding
    fireEvent.press(getByText('Omitir'));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@startup_app/onboarding_completed', 'true');
      expect(getByText('Te Damos la Bienvenida')).toBeTruthy();
    });

    // AuthWelcome screen should have Registrarse, Iniciar Sesión, and small button to go back to carousel
    expect(getByTestId('btn-auth-register')).toBeTruthy();
    expect(getByTestId('btn-auth-login')).toBeTruthy();
    expect(getByTestId('btn-replay-onboarding')).toBeTruthy();
  });

  it('starts directly at AuthWelcomeScreen if onboarding was previously completed', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

    const { getByText, getByTestId } = render(<AppNavigator />);

    await waitFor(() => {
      expect(getByText('Te Damos la Bienvenida')).toBeTruthy();
    });

    expect(getByTestId('btn-auth-register')).toBeTruthy();
    expect(getByTestId('btn-auth-login')).toBeTruthy();
  });

  it('navigates to RegisterScreen from AuthWelcomeScreen and back using the arrow button next to title', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

    const { getByText, getByTestId } = render(<AppNavigator />);

    await waitFor(() => {
      expect(getByText('Te Damos la Bienvenida')).toBeTruthy();
    });

    // Press Registrarse
    fireEvent.press(getByTestId('btn-auth-register'));

    await waitFor(() => {
      expect(getByText('Crear Cuenta')).toBeTruthy();
    });

    // Back arrow button next to title
    const backBtn = getByTestId('btn-register-back');
    expect(backBtn).toBeTruthy();

    // Press back button to return to AuthWelcomeScreen
    fireEvent.press(backBtn);

    await waitFor(() => {
      expect(getByText('Te Damos la Bienvenida')).toBeTruthy();
    });
  });

  it('navigates back to Onboarding carousel when clicking small button on AuthWelcomeScreen', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

    const { getByText, getByTestId } = render(<AppNavigator />);

    await waitFor(() => {
      expect(getByText('Te Damos la Bienvenida')).toBeTruthy();
    });

    // Click small replay onboarding button
    fireEvent.press(getByTestId('btn-replay-onboarding'));

    await waitFor(() => {
      expect(getByText('Conecta con Servicios al Instante')).toBeTruthy();
    });
  });
});
