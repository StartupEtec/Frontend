import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { WorkerProfileScreen } from '../../src/screens/WorkerProfileScreen';
import { userService } from '../../src/services/userService';
import { ratingService } from '../../src/services/ratingService';
import { ApiError } from '../../src/services/api';
import { SavedLocation } from '../../src/types/location';
import { NearbyWorker } from '../../src/types/worker';
import { WorkerReviewsResponse } from '../../src/types/rating';

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
  category_names: ['Electricidad'],
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

const renderScreen = (
  worker: NearbyWorker = makeWorker(),
  origin: SavedLocation | null = null,
  reviews: WorkerReviewsResponse | (() => Promise<WorkerReviewsResponse>) = {
    ratings: [],
    count: 0,
    limit: 20,
    offset: 0,
  }
) => {
  if (typeof reviews === 'function') {
    mockListByUser.mockImplementation(reviews);
  } else {
    mockListByUser.mockResolvedValue(reviews);
  }
  const props = {
    worker,
    origin,
    role: 'client' as const,
    onGoBack: jest.fn(),
  };
  return { ...render(<WorkerProfileScreen {...props} />), props };
};

// Esperar a que los datos del perfil se carguen y sean visibles.
const waitForProfileLoaded = async (getByText: (text: string | RegExp) => void) => {
  await waitFor(() => expect(getByText('Ana Pérez')).toBeTruthy());
};

describe('WorkerProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows a loading state while the public profile loads', () => {
    mockGetPublicProfile.mockReturnValue(new Promise(() => undefined));

    const { getByText } = renderScreen();

    // El nombre y categoría ya vienen de la búsqueda; el bio se carga.
    expect(getByText('Ana Pérez')).toBeTruthy();
    expect(getByText('Electricidad')).toBeTruthy();
    expect(mockGetPublicProfile).toHaveBeenCalledWith('user-456');

    // La sección empieza expandida, así que el loading del bio se ve directamente.
    expect(getByText('Cargando perfil...')).toBeTruthy();
  });

  it('shows the search data and the public bio once loaded', async () => {
    mockGetPublicProfile.mockResolvedValue(publicProfile);

    const { getByText, getByTestId } = renderScreen(makeWorker(), null, reviewsPage);

    await waitForProfileLoaded(getByText);

    expect(getByText('Electricidad')).toBeTruthy();
    expect(getByText(/★ 4,8/)).toBeTruthy();
    expect(getByText(/1 reseña/)).toBeTruthy();
    expect(getByText('Disponible')).toBeTruthy();
    expect(getByText('Certificado')).toBeTruthy();

    // La sección empieza expandida, así que la biografía se ve directamente.
    await waitFor(() => expect(getByTestId('profile-bio')).toBeTruthy());
    expect(getByText(/Electricista matriculada/)).toBeTruthy();
  });

  it('shows distance calculated from the chosen origin', async () => {
    mockGetPublicProfile.mockResolvedValue(publicProfile);

    const { getByText } = renderScreen(makeWorker(), originLocation);

    await waitForProfileLoaded(getByText);

    // ~1.04 km haversine entre Mendoza (origen) y el trabajador.
    expect(getByText(/1,0 km/)).toBeTruthy();
  });

  it('falls back to search distance when no origin is provided', async () => {
    mockGetPublicProfile.mockResolvedValue(publicProfile);

    const { getByText } = renderScreen();

    await waitForProfileLoaded(getByText);

    expect(getByText(/1,2 km/)).toBeTruthy();
  });

  it('falls back to the search rating while the profile loads', () => {
    mockGetPublicProfile.mockReturnValue(new Promise(() => undefined));

    const { getByText } = renderScreen();

    expect(getByText(/★ 4,5/)).toBeTruthy();
  });

  it('shows a placeholder when the worker has no bio', async () => {
    mockGetPublicProfile.mockResolvedValue({ ...publicProfile, bio: null });

    const { getByText } = renderScreen();

    await waitForProfileLoaded(getByText);

    // La sección empieza expandida, así que el placeholder se ve directamente.
    await waitFor(() =>
      expect(getByText('Este trabajador aún no agregó una biografía.')).toBeTruthy()
    );
  });

  it('shows a placeholder for previous works when there is no portfolio', async () => {
    mockGetPublicProfile.mockResolvedValue(publicProfile);

    const { getByText } = renderScreen();

    await waitForProfileLoaded(getByText);

    // La sección empieza expandida, así que el placeholder se ve directamente.
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

    await waitForProfileLoaded(getByText);
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
    await waitForProfileLoaded(getByText);

    fireEvent.press(getByTestId('btn-profile-request'));

    expect(Alert.alert).toHaveBeenCalledWith('Próximamente', expect.stringContaining('cotización'));
  });

  it("has a single 'Solicitar Servicio' button and no 'Iniciar Chat'", async () => {
    mockGetPublicProfile.mockResolvedValue(publicProfile);

    const { getByTestId, queryByText, getByText } = renderScreen();
    await waitForProfileLoaded(getByText);

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

    await waitForProfileLoaded(getByText);

    expect(queryByText(/área de cobertura/i)).toBeNull();
    expect(queryByText(/Fuera de su/i)).toBeNull();
  });

  describe('secciones colapsables', () => {
    it('muestra las tres secciones: Acerca de, Galería y Reseñas', async () => {
      mockGetPublicProfile.mockResolvedValue(publicProfile);

      const { getByTestId, getByText } = renderScreen(makeWorker(), null, reviewsPage);

      await waitForProfileLoaded(getByText);

      // Los títulos de sección deben estar presentes.
      expect(getByTestId('section-about-header')).toBeTruthy();
      expect(getByTestId('section-gallery-header')).toBeTruthy();
      expect(getByTestId('section-reviews-header')).toBeTruthy();
    });

    it('expande y colapsa la sección Acerca de', async () => {
      mockGetPublicProfile.mockResolvedValue(publicProfile);

      const { getByTestId, queryByTestId, getByText } = renderScreen();

      await waitForProfileLoaded(getByText);

      // La sección empieza expandida, así que la biografía se ve directamente.
      await waitFor(() => expect(getByTestId('profile-bio')).toBeTruthy());

      // Colapsar.
      fireEvent.press(getByTestId('section-about-header'));
      expect(queryByTestId('profile-bio')).toBeNull();

      // Expandir de nuevo.
      fireEvent.press(getByTestId('section-about-header'));
      await waitFor(() => expect(getByTestId('profile-bio')).toBeTruthy());
    });

    it('expande la sección Galería y muestra el placeholder', async () => {
      mockGetPublicProfile.mockResolvedValue(publicProfile);

      const { getByTestId, queryByTestId, getByText } = renderScreen();

      await waitForProfileLoaded(getByText);

      // La sección empieza expandida, así que el placeholder se ve directamente.
      await waitFor(() => expect(getByText(/todavía no publicó trabajos anteriores/)).toBeTruthy());

      // Colapsar y volver a expandir.
      fireEvent.press(getByTestId('section-gallery-header'));
      expect(queryByTestId(/todavía no publicó/)).toBeNull();
      fireEvent.press(getByTestId('section-gallery-header'));
      await waitFor(() => expect(getByText(/todavía no publicó trabajos anteriores/)).toBeTruthy());
    });

    it('expande la sección Reseñas y muestra la reseña con autor y texto', async () => {
      mockGetPublicProfile.mockResolvedValue(publicProfile);

      const { getByText } = renderScreen(makeWorker(), null, reviewsPage);

      await waitForProfileLoaded(getByText);

      // La sección empieza expandida, así que las reseñas se ven directamente.
      await waitFor(() => expect(getByText('Luis Gómez')).toBeTruthy());
      expect(getByText('Muy buena profesional.')).toBeTruthy();
    });

    it.skip('muestra error de reseñas con botón Reintentar al expandir', async () => {
      mockGetPublicProfile.mockResolvedValue(publicProfile);
      mockListByUser.mockImplementation(async () => {
        throw new ApiError('No pudimos cargar las reseñas.', 500);
      });

      const props = {
        worker: makeWorker(),
        origin: null as SavedLocation | null,
        role: 'client' as const,
        onGoBack: jest.fn(),
      };
      const { getByTestId, getByText } = render(<WorkerProfileScreen {...props} />);

      await waitForProfileLoaded(getByText);

      // La sección empieza expandida, así que el error de reseñas se ve directamente.
      await waitFor(() => expect(getByText('No pudimos cargar las reseñas.')).toBeTruthy());
      expect(getByTestId('btn-profile-reviews-retry')).toBeTruthy();
    });

    it('muestra estado vacío de reseñas al expandir', async () => {
      mockGetPublicProfile.mockResolvedValue(publicProfile);

      const { getByText } = renderScreen(makeWorker(), null, {
        ratings: [],
        count: 0,
        limit: 20,
        offset: 0,
      });

      await waitForProfileLoaded(getByText);

      // La sección empieza expandida, así que el estado vacío se ve directamente.
      await waitFor(() => expect(getByText('Este trabajador aún no tiene reseñas.')).toBeTruthy());
    });
  });
});
