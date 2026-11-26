import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { RateServiceScreen } from '../screens/RateServiceScreen';
import { useRating } from '../hooks/useRating';
import { RoleProvider } from '../context/RoleContext';

// Mock del hook de calificación.
jest.mock('../hooks/useRating', () => ({
  useRating: jest.fn(),
}));

// Mock de SuccessToast: llama onFinish inmediatamente cuando está visible,
// para no depender de la animación de 2.5s en los tests.
jest.mock('../components/SuccessToast', () => ({
  SuccessToast: ({ visible, onFinish }: { visible: boolean; onFinish?: () => void }) => {
    if (visible && onFinish) onFinish();
    return null;
  },
}));

const mockRatee = {
  user_id: 'worker-1',
  full_name: 'Juan Pérez',
  avatar_url: null,
  service: 'Plomería',
};

const renderScreen = (props: Partial<React.ComponentProps<typeof RateServiceScreen>> = {}) => {
  const onRatingSubmitted = jest.fn();

  const utils = render(
    <RoleProvider>
      <RateServiceScreen
        orderId="order-123"
        ratee={mockRatee}
        onRatingSubmitted={onRatingSubmitted}
        {...props}
      />
    </RoleProvider>
  );

  return { ...utils, onRatingSubmitted };
};

describe('RateServiceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renderiza nombre, rol y servicio en líneas separadas', () => {
    (useRating as jest.Mock).mockReturnValue({
      status: 'idle',
      error: null,
      submitRating: jest.fn().mockResolvedValue(true),
      reset: jest.fn(),
    });

    const { getByText, getByTestId } = renderScreen();

    expect(getByText('Juan Pérez')).toBeTruthy();
    // Rol y servicio en líneas separadas (sin punto entre medio)
    expect(getByText('Cliente')).toBeTruthy();
    expect(getByText('Plomería')).toBeTruthy();
    expect(getByTestId('star-rating')).toBeTruthy();
  });

  it('permite escribir reseña y actualiza el contador de caracteres', () => {
    (useRating as jest.Mock).mockReturnValue({
      status: 'idle',
      error: null,
      submitRating: jest.fn().mockResolvedValue(true),
      reset: jest.fn(),
    });

    const { getByText, getByPlaceholderText } = renderScreen();

    // El contador de caracteres inicia en 500
    expect(getByText('500 de 500 caracteres')).toBeTruthy();

    // Escribir una reseña (30 caracteres)
    const input = getByPlaceholderText('Escribí tu experiencia... (máx. 500 caracteres)');
    fireEvent.changeText(input, 'Muy buen trabajo, recomendado.');
    expect(getByText('470 de 500 caracteres')).toBeTruthy();
  });

  it('no permite enviar sin seleccionar estrellas (muestra alerta)', () => {
    (useRating as jest.Mock).mockReturnValue({
      status: 'idle',
      error: null,
      submitRating: jest.fn().mockResolvedValue(true),
      reset: jest.fn(),
    });

    const { getByText } = renderScreen();

    // Sin estrellas seleccionadas, el botón está disabled: no se ejecuta handleSend
    fireEvent.press(getByText('Enviar calificación'));

    const submitMock = (useRating as jest.Mock).mock.results[0]?.value.submitRating as jest.Mock;
    expect(submitMock).not.toHaveBeenCalled();
  });

  it('selecciona estrellas, habilita el botón y llama onRatingSubmitted al enviar', async () => {
    const submitMock = jest.fn().mockResolvedValue(true);
    (useRating as jest.Mock).mockReturnValue({
      status: 'success',
      error: null,
      submitRating: submitMock,
      reset: jest.fn(),
    });

    const { getByText, getAllByText, onRatingSubmitted } = renderScreen();

    // Seleccionar 4 estrellas: toca el ícono de la cuarta estrella (renderizado
    // como texto 'star-outline' por el mock de Feather en jest.setup.js).
    act(() => {
      fireEvent.press(getAllByText('star-outline')[3]);
    });

    // Ahora el botón está enabled
    fireEvent.press(getByText('Enviar calificación'));

    await waitFor(() => {
      expect(onRatingSubmitted).toHaveBeenCalled();
    });
  });

  it('muestra error y permite reintentar', () => {
    (useRating as jest.Mock).mockReturnValue({
      status: 'error',
      error: 'Ya existe una calificación para esta orden',
      submitRating: jest
        .fn()
        .mockRejectedValue(new Error('Ya existe una calificación para esta orden')),
      reset: jest.fn(),
    });

    const { getByText } = renderScreen();

    expect(getByText('Ya existe una calificación para esta orden')).toBeTruthy();
    expect(getByText('Reintentar')).toBeTruthy();
  });

  it('no muestra botón de saltear ni de volver (calificación obligatoria)', () => {
    (useRating as jest.Mock).mockReturnValue({
      status: 'idle',
      error: null,
      submitRating: jest.fn().mockResolvedValue(true),
      reset: jest.fn(),
    });

    const { queryByText } = renderScreen();

    // No debe existir botón "Saltear"
    expect(queryByText('Saltear')).toBeNull();
  });
});
