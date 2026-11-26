import { apiClient } from './api';
import { CategoriesResponse } from '../types/category';

interface CacheEntry {
  categories: CategoriesResponse['categories'];
  timestamp: number;
}

/** Las categorías cambian poco; se cachean 5 minutos en memoria. */
const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: CacheEntry | null = null;

export const categoryService = {
  /**
   * Lista de categorías activas (GET /api/v1/categories, público).
   * Cachea el resultado en memoria para no repetir la consulta cada vez que
   * se abre "Editar Perfil".
   */
  async listCategories(): Promise<CategoriesResponse['categories']> {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
      return cache.categories;
    }

    const response = await apiClient<CategoriesResponse>('/categories', {
      method: 'GET',
    });
    const categories = response.categories ?? [];
    cache = { categories, timestamp: Date.now() };
    return categories;
  },

  /** Invalida la caché (por ejemplo al cambiar de rol o tras un seed nuevo). */
  resetCache(): void {
    cache = null;
  },
};
