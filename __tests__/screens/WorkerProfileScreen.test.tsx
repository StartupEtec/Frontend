import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { WorkerProfileScreen } from '../../src/screens/WorkerProfileScreen';
import { userService } from '../../src/services/userService';
import { ratingService } from '../../src/services/ratingService';
import { ApiError } from '../../src/services/api';
import { SavedLocation } from '../../src/types/location';
import { NearbyWorker } from '../../src/types/worker';

jest.mock('../../src/services/userService', () => ({
  userService: { getPublicProfile: jest.fn() },
}));

jest.mock('../../src/services/ratingService', () => ({
  ratingService: { listByUser: jest.fn() },
}));

const mockGetPublicProfile = userService.getPublicProfile as jest.Mock;
const mockListByUser = ratingService.listByUser as jest.Mock;

// Ubicación guardada desde la que se buscó: referencia para calcular la distancia.
const originLocation: SavedLocation = {
  id: 'loc-1',
  user_id: 'user-123',
  address: 'Av. Olascoaga 1700, Mendoza',
  latitude: -34.6037,
  longitude: -58.3816,
  is_primary: true,
};

const makeWorker = (overrides: Partial<NearbyWorker> = {}): NearbyWorker => ({
  worker_id: 'worker-1',
  user_id: 'user-456',
  full_name: 'Ana Pérez',
  avatar_url: null,
  category_id: 'd9b936d5-a3d5-45d6-b4d6-a4c3f5d6f003',
  category_name: 'Electricidad',
  availability_status: 'AVAILABLE',
  certification_status: 'APPROVED',
  average_rating: '4.5',
  distance_km: 1.2,
  coverage_radius_km: 10,
  latitude: -34.61,
  longitude: -58.39,
  ...overrides,
});

const publicProfile = {
  id: 'user-456',
  full_name: 'Ana Pérez',
  avatar_url: null,
  bio: 'Electricista matriculada con 8 años de experiencia.',
  average_rating: '4.8',
  role: 'worker' as const,
};

const reviewsPage = {
  ratings: [
    {
      id: 'r-1',
      order_id: 'o-1',
      rater_id: 'user-100',
      ratee_id: 'user-456',
      rating_stars: 5,
      review_text: 'Muy buena profesional.',
      created_at: '2026-11-20T10:00:00Z',
      rater: { user_id: 'user-100', full_name: 'Luis Gómez', avatar_url: null },
    },
  ],
  count: 1,
  limit: 20,
  offset: 0,
};

const renderScreen = (worker: NearbyWorker = makeWorker(), origin: SavedLocation | null = null) => {
  const props = {
    worker,
    origin,
    role: 'client' as const,
    onGoBack: jest.fn(),
  };
  return { ...render(<WorkerProfileScreen {...props} />), props };
};

describe('WorkerProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockListByUser.mockResolvedValue({ ratings: [], count: 0, limit: 20, offset: 0 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows a loading state while the public profile loads', () => {
    mockGetPublicProfile.mockReturnValue(new Promise(() => undefined));

    const { getByText } = renderScreen();

    expect(getByText('Cargando perfil...')).toBeTruthy();
    expect(mockGetPublicProfile).toHaveBeenCalledWith('user-456');
  });

  it('shows the search data and the public bio once loaded', async () => {
    mockGetPublicProfile.mockResolvedValue(publicProfile);
    mockListByUser.mockResolvedValue(reviewsPage);

    const { getByText, getByTestId } = renderScreen();

    await waitFor(() => expect(getByText(/Electricista matriculada/)).toBeTruthy());

    expect(getByText('Ana Pérez')).toBeTruthy();
    expect(getByText('Electricidad')).toBeTruthy();
    expect(getByText('★ 4,8')).toBeTruthy();
    expect(getByText(/1 reseña/)).toBeTruthy();
    expect(getByText('Disponible')).toBeTruthy();
    expect(getByText('Certificado')).toBeTruthy();
    expect(getByTestId('profile-bio')).toBeTruthy();
  });

  it('shows distance calculated from the chosen origin', async () => {
    mockGetPublicProfile.mockResolvedValue(publicProfile);

    const { getByText } = renderScreen(makeWorker(), originLocation);

    await waitFor(() => expect(getByText(/Electricista matriculada/)).toBeTruthy());

    // ~1.04 km haversine entre Mendoza (origen) y el trabajador.
    expect(getByText(/1,0 km/)).toBeTruthy();
  });

  it('falls back to search distance when no origin is provided', async () => {
    mockGetPublicProfile.mockResolvedValue(publicProfile);

    const { getByText } = renderScreen();

    await waitFor(() => expect(getByText(/Electricista matriculada/)).toBeTruthy());

    expect(getByText(/1,2 km/)).toBeTruthy();
  });

  it('falls back to the search rating while the profile loads', () => {
    mockGetPublicProfile.mockReturnValue(new Promise(() => undefined));

    const { getByText } = renderScreen();

    expect(getByText('★ 4,5')).toBeTruthy();
  });

  it('shows a placeholder when the worker has no bio', async () => {
    mockGetPublicProfile.mockResolvedValue({ ...publicProfile, bio: null });

    const { getByText } = renderScreen();

    await waitFor(() =>
      expect(getByText('Este trabajador aún no agregó una biografía.')).toBeTruthy()
    );
  });

  it('shows a placeholder for previous works when there is no portfolio', async () => {
    mockGetPublicProfile.mockResolvedValue(publicProfile);

    const { getByText } = renderScreen();

    await waitFor(() => expect(getByText(/todavía no publicó trabajos anteriores/)).toBeTruthy());
  });

  it('shows an error state and retries the public profile request', async () => {
    mockGetPublicProfile
      .mockRejectedValueOnce(new ApiError('Trabajador no encontrado', 404))
      .mockResolvedValueOnce(publicProfile);

    const { getByTestId, getByText } = renderScreen();

    await waitFor(() => expect(getByTestId('profile-error')).toBeTruthy());
    expect(getByText('Trabajador no encontrado.')).toBeTruthy();

    fireEvent.press(getByTestId('btn-profile-retry'));

    await waitFor(() => expect(getByText(/Electricista matriculada/)).toBeTruthy());
    expect(mockGetPublicProfile).toHaveBeenCalledTimes(2);
  });

  it('falls back to a generic message for unknown errors', async () => {
    mockGetPublicProfile.mockRejectedValueOnce(new Error(''));

    const { getByTestId } = renderScreen();

    await waitFor(() => expect(getByTestId('profile-error')).toBeTruthy());
    expect(getByTestId('profile-error').props.children).toBe(
      'No pudimos cargar el perfil. Reintentá.'
    );
  });

  it("shows 'Próximamente' when requesting the service", async () => {
    mockGetPublicProfile.mockResolvedValue(publicProfile);

    const { getByTestId, getByText } = renderScreen();
    await waitFor(() => expect(getByText(/Electricista matriculada/)).toBeTruthy());

    fireEvent.press(getByTestId('btn-profile-request'));

    expect(Alert.alert).toHaveBeenCalledWith('Próximamente', expect.stringContaining('cotización'));
  });

  it("has a single 'Solicitar Servicio' button and no 'Iniciar Chat'", async () => {
    mockGetPublicProfile.mockResolvedValue(publicProfile);

    const { getByTestId, queryByText, getByText } = renderScreen();
    await waitFor(() => expect(getByText(/Electricista matriculada/)).toBeTruthy());

    expect(getByTestId('btn-profile-request')).toBeTruthy();
    expect(queryByText(/Iniciar Chat/i)).toBeNull();
  });

  it('navigates back', () => {
    mockGetPublicProfile.mockReturnValue(new Promise(() => undefined));

    const { getByTestId, props } = renderScreen();

    fireEvent.press(getByTestId('btn-profile-back'));

    expect(props.onGoBack).toHaveBeenCalled();
  });

  it('does not show the coverage area hint', async () => {
    mockGetPublicProfile.mockResolvedValue(publicProfile);

    const { queryByText, getByText } = renderScreen();

    await waitFor(() => expect(getByText(/Electricista matriculada/)).toBeTruthy());

    expect(queryByText(/área de cobertura/i)).toBeNull();
    expect(queryByText(/Fuera de su/i)).toBeNull();
  });

  describe('reviews tab', () => {
    it('shows the review with author, stars and text', async () => {
      mockGetPublicProfile.mockResolvedValue(publicProfile);
      mockListByUser.mockResolvedValue(reviewsPage);

      const { getByText, getByTestId } = renderScreen();

      await waitFor(() => expect(getByText(/Electricista matriculada/)).toBeTruthy());

      // Cambiar a la pestaña de reseñas.
      fireEvent.press(getByTestId('tab-reviews'));

      await waitFor(() => expect(getByText('Luis Gómez')).toBeTruthy());
      expect(getByText('Muy buena profesional.')).toBeTruthy();
    });

    it('shows empty state when there are no reviews', async () => {
      mockGetPublicProfile.mockResolvedValue(publicProfile);
      mockListByUser.mockResolvedValueOnce({
        ratings: [],
        count: 0,
        limit: 20,
        offset: 0,
      });

      const { getByText, getByTestId } = renderScreen();

      await waitFor(() => expect(getByText(/Electricista matriculada/)).toBeTruthy());
      fireEvent.press(getByTestId('tab-reviews'));

      await waitFor(() => expect(getByText('Este trabajador aún no tiene reseñas.')).toBeTruthy());
    });

    it('shows reviews error and retry button', async () => {
      mockGetPublicProfile.mockResolvedValue(publicProfile);
      mockListByUser.mockRejectedValue(new ApiError('No pudimos cargar las reseñas.', 500));

      const { getByTestId, getByText } = renderScreen();

      await waitFor(() => expect(getByText(/Electricista matriculada/)).toBeTruthy());
      fireEvent.press(getByTestId('tab-reviews'));

      await waitFor(() => expect(getByText('No pudimos cargar las reseñas.')).toBeTruthy());
      expect(getByTestId('btn-profile-reviews-retry')).toBeTruthy();

      mockListByUser.mockResolvedValue({ ratings: [], count: 0, limit: 20, offset: 0 });
    });
  });
});
