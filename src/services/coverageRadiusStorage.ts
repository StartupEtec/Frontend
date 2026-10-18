import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Persistencia local del "radio de cobertura" (km) de las ubicaciones de un
 * trabajador.
 *
 * El backend todavía no guarda este campo en la tabla `locations`, así que lo
 * mantenemos en el dispositivo y lo superponemos (overlay) sobre la lista que
 * devuelve la API. Cuando el backend soporte `coverage_radius_km`, este
 * almacenamiento local deja de usarse: basta con que el hook priorice el valor
 * que llega de la API (ya lo hace con `??`).
 */
const STORAGE_KEY = "@startup_app/coverage_radii";

type RadiusMap = Record<string, number>;

function parse(raw: string | null): RadiusMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: RadiusMap = {};
    Object.keys(parsed).forEach((key) => {
      const value = parsed[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        result[key] = value;
      }
    });
    return result;
  } catch {
    return {};
  }
}

export const coverageRadiusStorage = {
  async getAll(): Promise<RadiusMap> {
    return parse(await AsyncStorage.getItem(STORAGE_KEY));
  },

  async set(locationId: string, radiusKm: number | null): Promise<void> {
    const all = await this.getAll();
    if (radiusKm == null) {
      delete all[locationId];
    } else {
      all[locationId] = radiusKm;
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },

  async remove(locationId: string): Promise<void> {
    await this.set(locationId, null);
  },
};

export default coverageRadiusStorage;
