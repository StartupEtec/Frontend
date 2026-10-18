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

/**
 * Lectura de la ubicación actual del dispositivo (expo-location).
 *
 * Se mantiene separado del `locationService` (que habla con el backend) y del
 * `geocodingService` (direcciones): acá solo se pide el permiso en primer plano
 * y se obtiene la posición puntual que se usa como referencia de cercanía.
 */
export const deviceLocation = {
  async getCurrent(): Promise<DeviceLocationResult> {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        return { status: "denied", coordinates: null };
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        status: "granted",
        coordinates: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
      };
    } catch {
      // Permiso concedido pero el servicio no pudo resolver la posición.
      return { status: "unavailable", coordinates: null };
    }
  },
};

export default deviceLocation;
