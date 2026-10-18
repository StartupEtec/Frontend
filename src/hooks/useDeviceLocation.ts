import { useCallback, useEffect, useRef, useState } from "react";
import {
  deviceLocation,
  DeviceLocationStatus,
} from "../services/deviceLocation";
import { Coordinates } from "../types/location";

interface UseDeviceLocationOptions {
  /**
   * Pide el permiso automáticamente al montar. En pantallas que se abren
   * siempre conviene true; en modales que se ocultan, false (se pide al
   * presionar un botón).
   */
  autoRequest?: boolean;
}

/**
 * Expone la ubicación del dispositivo como referencia para ordenar/filtrar
 * las ubicaciones guardadas por cercanía, además del estado del permiso.
 */
export const useDeviceLocation = ({
  autoRequest = true,
}: UseDeviceLocationOptions = {}) => {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<DeviceLocationStatus>("idle");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const request = useCallback(async (): Promise<Coordinates | null> => {
    setStatus("requesting");
    const result = await deviceLocation.getCurrent();
    if (!mountedRef.current) return result.coordinates;

    setCoordinates(result.coordinates);
    setStatus(result.status);
    return result.coordinates;
  }, []);

  useEffect(() => {
    if (autoRequest) void request();
  }, [autoRequest, request]);

  return {
    /** Coordenadas actuales del dispositivo o null si no están disponibles. */
    coordinates,
    status,
    /** true mientras se espera el permiso / la posición. */
    loading: status === "requesting",
    /** El usuario rechazó el permiso. */
    denied: status === "denied",
    /** Permiso concedido pero sin posición (GPS apagado, timeout, etc). */
    unavailable: status === "unavailable",
    /** Vuelve a pedir el permiso y la posición. */
    request,
  };
};

export default useDeviceLocation;
