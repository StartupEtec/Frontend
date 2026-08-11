import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { RegisterScreen } from '../../src/screens/RegisterScreen';
import { authService } from '../../src/services/authService';

jest.mock('../../src/services/authService', () => ({
  authService: {
    register: jest.fn(),
  },
}));

describe('RegisterScreen Component', () => {
  const mockNavigateToOtp = jest.fn();
  const mockNavigateToLogin = jest.fn();
  const mockNavigateBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title, inputs, password requirements, and disabled submit button initially', () => {
    const { getByText, getByTestId } = render(
      <RegisterScreen
        onNavigateToOtp={mockNavigateToOtp}
        onNavigateToLogin={mockNavigateToLogin}
        onNavigateBack={mockNavigateBack}
      />
    );

    expect(getByText('Crear Cuenta')).toBeTruthy();
    expect(getByTestId('btn-register-back')).toBeTruthy();
    expect(getByTestId('input-first-name')).toBeTruthy();
    expect(getByTestId('input-last-name')).toBeTruthy();
    expect(getByTestId('input-email')).toBeTruthy();
    expect(getByTestId('input-phone')).toBeTruthy();
    expect(getByTestId('input-password')).toBeTruthy();
    expect(getByTestId('input-confirm-password')).toBeTruthy();
    expect(getByTestId('password-requirements')).toBeTruthy();

    const submitBtn = getByTestId('btn-register-submit');
    expect(submitBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('navigates back when back arrow button next to title is pressed', () => {
    const { getByTestId } = render(
      <RegisterScreen
        onNavigateToOtp={mockNavigateToOtp}
        onNavigateToLogin={mockNavigateToLogin}
        onNavigateBack={mockNavigateBack}
      />
    );

    fireEvent.press(getByTestId('btn-register-back'));
    expect(mockNavigateBack).toHaveBeenCalled();
  });

  it('enables submit button when form is valid and submits successfully', async () => {
    (authService.register as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'OK',
    });

    const { getByTestId } = render(
      <RegisterScreen
        onNavigateToOtp={mockNavigateToOtp}
        onNavigateToLogin={mockNavigateToLogin}
        onNavigateBack={mockNavigateBack}
      />
    );

    fireEvent.changeText(getByTestId('input-first-name'), 'Maria');
    fireEvent.changeText(getByTestId('input-last-name'), 'Gomez');
    fireEvent.changeText(getByTestId('input-email'), 'maria@example.com');
    fireEvent.changeText(getByTestId('input-phone'), '+5491199887766');
    fireEvent.changeText(getByTestId('input-password'), 'Password123!');
    fireEvent.changeText(getByTestId('input-confirm-password'), 'Password123!');
    fireEvent.press(getByTestId('checkbox-terms'));

    const submitBtn = getByTestId('btn-register-submit');
    expect(submitBtn.props.accessibilityState?.disabled).toBe(false);

    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(authService.register).toHaveBeenCalled();
      expect(mockNavigateToOtp).toHaveBeenCalled();
    });
  });

  it('navigates to Login when "¿Ya tenés cuenta?" link is pressed', () => {
    const { getByTestId } = render(
      <RegisterScreen
        onNavigateToOtp={mockNavigateToOtp}
        onNavigateToLogin={mockNavigateToLogin}
        onNavigateBack={mockNavigateBack}
      />
    );

    fireEvent.press(getByTestId('btn-go-to-login'));
    expect(mockNavigateToLogin).toHaveBeenCalled();
  });

  it('opens and accepts Terms and Conditions modal', () => {
    const { getByTestId, queryByTestId } = render(
      <RegisterScreen
        onNavigateToOtp={mockNavigateToOtp}
        onNavigateToLogin={mockNavigateToLogin}
        onNavigateBack={mockNavigateBack}
      />
    );

    fireEvent.press(getByTestId('btn-open-terms'));
    expect(getByTestId('terms-modal')).toBeTruthy();

    fireEvent.press(getByTestId('terms-accept-btn'));
    expect(queryByTestId('terms-modal')).toBeNull();
  });
});
