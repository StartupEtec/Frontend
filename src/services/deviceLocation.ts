import * as Location from "expo-location";
import { Coordinates } from "../types/location";

/**
 * Estado del permiso/lectura de la ubicación del dispositivo.
 *
 * - idle:        todavía no se pidió.
 * - requesting:  permiso pedido / esperando la posición.
 * - granted:     permiso concedido y coordenadas disponibles.
 * - denied:      el usuario rechazó el permiso (se puede volver a pedir).
 * - unavailable: permiso concedido pero no se pudo obtener la posición
 *                (GPS apagado, servicio deshabilitado, timeout, etc).
 */
export type DeviceLocationStatus =
  "idle" | "requesting" | "granted" | "denied" | "unavailable";

export interface DeviceLocationResult {
  status: DeviceLocationStatus;
  coordinates: Coordinates | null;
}

/** Edad máxima (ms) para aceptar la última posición conocida como vigente. */
const LAST_KNOWN_FRESH_MS = 60_000;
/**
 * Cuánto (ms) se espera un fix nuevo del GPS cuando existe una última
 * posición conocida (aunque sea vieja). Si no llega a tiempo, se usa esa
 * última posición como respaldo en lugar de dejar el mapa sin centro.
 */
const NEW_FIX_TIMEOUT_MS = 4_000;

/** Espera `ms` y devuelve null si la promesa no se cumple a tiempo. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const toCoordinates = (position: Location.LocationObject): Coordinates => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
});

/**
 * Lectura de la ubicación actual del dispositivo (expo-location).
 *
 * Se mantiene separado del `locationService` (que habla con el backend) y del
 * `geocodingService` (direcciones): acá solo se pide el permiso en primer plano
 * y se obtiene la posición puntual que se usa como referencia de cercanía.
 *
 * Para no frenar la pantalla de búsqueda (que espera un centro antes de
 * consultar), se usa la última posición conocida: si es reciente se devuelve
 * al instante; si es vieja se pide un fix nuevo con un tope de tiempo y, si
 * no llega, se respalda con la última posición conocida.
 */
export const deviceLocation = {
  async getCurrent(): Promise<DeviceLocationResult> {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        return { status: "denied", coordinates: null };
      }

      const last = await Location.getLastKnownPositionAsync().catch(
        (): Location.LocationObject | null => null,
      );
      if (last && Date.now() - last.timestamp < LAST_KNOWN_FRESH_MS) {
        // Vigente: se responde sin esperar un fix nuevo (apertura instantánea).
        return { status: "granted", coordinates: toCoordinates(last) };
      }

      let current: Location.LocationObject | null = null;
      try {
        const request = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        current = last
          ? await withTimeout(request, NEW_FIX_TIMEOUT_MS)
          : await request;
      } catch {
        // Permiso concedido pero el servicio no pudo resolver la posición.
        current = null;
      }

      const position = current ?? last;
      if (!position) return { status: "unavailable", coordinates: null };
      return { status: "granted", coordinates: toCoordinates(position) };
    } catch {
      return { status: "unavailable", coordinates: null };
    }
  },
};

export default deviceLocation;
