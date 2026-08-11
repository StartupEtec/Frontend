import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AuthWelcomeScreen } from '../../src/screens/AuthWelcomeScreen';

describe('AuthWelcomeScreen Component', () => {
  const mockNavigateToRegister = jest.fn();
  const mockNavigateToLogin = jest.fn();
  const mockNavigateToOnboarding = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders welcome screen elements correctly', () => {
    const { getByText, getByTestId } = render(
      <AuthWelcomeScreen
        onNavigateToRegister={mockNavigateToRegister}
        onNavigateToLogin={mockNavigateToLogin}
        onNavigateToOnboarding={mockNavigateToOnboarding}
      />
    );

    expect(getByText('Te Damos la Bienvenida')).toBeTruthy();
    expect(getByTestId('btn-auth-register')).toBeTruthy();
    expect(getByTestId('btn-auth-login')).toBeTruthy();
    expect(getByTestId('btn-replay-onboarding')).toBeTruthy();
  });

  it('triggers navigation on button clicks', () => {
    const { getByTestId } = render(
      <AuthWelcomeScreen
        onNavigateToRegister={mockNavigateToRegister}
        onNavigateToLogin={mockNavigateToLogin}
        onNavigateToOnboarding={mockNavigateToOnboarding}
      />
    );

    fireEvent.press(getByTestId('btn-auth-register'));
    expect(mockNavigateToRegister).toHaveBeenCalled();

    fireEvent.press(getByTestId('btn-auth-login'));
    expect(mockNavigateToLogin).toHaveBeenCalled();

    fireEvent.press(getByTestId('btn-replay-onboarding'));
    expect(mockNavigateToOnboarding).toHaveBeenCalled();
  });
});
