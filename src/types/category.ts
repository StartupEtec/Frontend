/** Categoría de servicio tal como la devuelve GET /api/v1/categories. */
export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
}

export interface CategoriesResponse {
  categories: Category[];
}
