import { renderHook, act } from '@testing-library/react-native';
import { useRating } from '../hooks/useRating';
import { ratingService } from '../services/ratingService';
import { ApiError } from '../services/api';

// Mock del servicio de calificaciones.
jest.mock('../services/ratingService', () => ({
  ratingService: {
    createRating: jest.fn(),
  },
}));

const mockPayload = {
  order_id: 'order-123',
  rating_stars: 5,
  review_text: 'Excelente servicio',
};

describe('useRating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inicia en estado idle sin error', () => {
    const { result } = renderHook(() => useRating());
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('envía la calificación con éxito y pasa a success', async () => {
    (ratingService.createRating as jest.Mock).mockResolvedValue({
      message: 'Calificación creada correctamente',
      rating: { id: 'rating-1', order_id: 'order-123', rating_stars: 5 },
    });

    const { result } = renderHook(() => useRating());

    let success = false;
    await act(async () => {
      success = await result.current.submitRating(mockPayload);
    });

    expect(success).toBe(true);
    expect(result.current.status).toBe('success');
    expect(result.current.error).toBeNull();
    expect(ratingService.createRating).toHaveBeenCalledWith(mockPayload);
  });

  it('pasa a error y devuelve false cuando el backend falla', async () => {
    (ratingService.createRating as jest.Mock).mockRejectedValue(
      new ApiError('Ya existe una calificación para esta orden', 409, 'ALREADY_RATED')
    );

    const { result } = renderHook(() => useRating());

    let success = false;
    await act(async () => {
      success = await result.current.submitRating(mockPayload);
    });

    expect(success).toBe(false);
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Ya existe una calificación para esta orden');
  });

  it('reset limpia el estado a idle después de un error', async () => {
    (ratingService.createRating as jest.Mock).mockRejectedValue(new Error('Error de red'));

    const { result } = renderHook(() => useRating());

    await act(async () => {
      await result.current.submitRating(mockPayload);
    });
    expect(result.current.status).toBe('error');

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });
});
