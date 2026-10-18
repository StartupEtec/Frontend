import { useCallback, useRef, useState } from "react";
import { geocodingService, GeocodeResult } from "../services/geocodingService";
import {
  Coordinates,
  CreateLocationPayload,
  SavedLocation,
} from "../types/location";

export interface LocationFormErrors {
  address?: string;
  coordinates?: string;
  coverageRadiusKm?: string;
}

/** Igual que el backend: la dirección exige al menos 3 caracteres. */
export const MIN_ADDRESS_LENGTH = 3;

/**
 * Estado del formulario de alta/edición de una ubicación.
 *
 * Además de address / coordinates / is_primary, maneja la búsqueda de
 * direcciones (con protección contra respuestas fuera de orden) y el
 * reverse-geocoding al mover el pin en el mapa.
 */
export const useLocationForm = (initial?: SavedLocation | null) => {
  const [address, setAddress] = useState(initial?.address ?? "");
  const [coordinates, setCoordinatesState] = useState<Coordinates | null>(
    initial
      ? { latitude: initial.latitude, longitude: initial.longitude }
      : null,
  );
  const [isPrimary, setIsPrimary] = useState<boolean>(
    initial?.is_primary ?? false,
  );
  const [coverageRadiusKm, setCoverageRadiusKm] = useState<string>(
    initial?.coverage_radius_km == null
      ? ""
      : initial.coverage_radius_km.toString(),
  );
  const [errors, setErrors] = useState<LocationFormErrors>({});

  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  // true mientras la dirección fue escrita a mano (no se pisa con el mapa).
  const manualAddressRef = useRef(false);
  const searchTokenRef = useRef(0);

  const reset = useCallback((next?: SavedLocation | null) => {
    setAddress(next?.address ?? "");
    setCoordinatesState(
      next ? { latitude: next.latitude, longitude: next.longitude } : null,
    );
    setIsPrimary(next?.is_primary ?? false);
    setCoverageRadiusKm(
      next?.coverage_radius_km == null
        ? ""
        : next.coverage_radius_km.toString(),
    );
    setErrors({});
    setResults([]);
    setSearchError(null);
    manualAddressRef.current = false;
  }, []);

  const changeAddress = useCallback((value: string) => {
    setAddress(value);
    manualAddressRef.current = true;
    setErrors((prev) => ({ ...prev, address: undefined }));
  }, []);

  const setCoordinates = useCallback((coords: Coordinates | null) => {
    setCoordinatesState(coords);
    setErrors((prev) => ({ ...prev, coordinates: undefined }));
  }, []);

  const toggleIsPrimary = useCallback(() => setIsPrimary((v) => !v), []);

  const changeCoverageRadiusKm = useCallback((value: string) => {
    setCoverageRadiusKm(value);
    setErrors((prev) => ({ ...prev, coverageRadiusKm: undefined }));
  }, []);

  /** Busca direcciones; ignora respuestas de búsquedas anteriores. */
  const searchAddress = useCallback(async (query: string) => {
    const token = ++searchTokenRef.current;
    const trimmed = query.trim();

    if (trimmed.length < MIN_ADDRESS_LENGTH) {
      setResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    setSearchError(null);
    try {
      const found = await geocodingService.search(trimmed);
      if (token !== searchTokenRef.current) return;
      setResults(found);
    } catch (err: unknown) {
      if (token !== searchTokenRef.current) return;
      setSearchError(
        err instanceof Error && err.message
          ? err.message
          : "No pudimos buscar direcciones.",
      );
      setResults([]);
    } finally {
      if (token === searchTokenRef.current) setSearching(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    searchTokenRef.current += 1;
    setResults([]);
    setSearching(false);
  }, []);

  /** Aplica una búsqueda elegida: dirección + coordenadas, sin dejar residuos. */
  const selectResult = useCallback((result: GeocodeResult) => {
    setAddress(result.label);
    setCoordinatesState({
      latitude: result.latitude,
      longitude: result.longitude,
    });
    setErrors({});
    setResults([]);
    setSearchError(null);
    manualAddressRef.current = false;
  }, []);

  /**
   * Mueve el pin/centro del mapa. Si la dirección no se escribió a mano, se
   * rellena con reverse-geocoding (soft-fail: si falla se conserva lo actual).
   * Con `options.force`, se actualiza la dirección aunque se haya escrito a
   * mano (p. ej. al presionar "usar mi ubicación actual").
   */
  const moveToCoordinates = useCallback(
    async (coords: Coordinates, options?: { force?: boolean }) => {
      setCoordinates(coords);
      if (manualAddressRef.current && !options?.force) return;
      if (options?.force) manualAddressRef.current = false;

      setResolving(true);
      try {
        const label = await geocodingService.reverse(
          coords.latitude,
          coords.longitude,
        );
        if (label) setAddress(label);
      } catch {
        // se conserva la dirección actual
      } finally {
        setResolving(false);
      }
    },
    [setCoordinates],
  );

  const validate = useCallback((): boolean => {
    const next: LocationFormErrors = {};
    if (address.trim().length < MIN_ADDRESS_LENGTH) {
      next.address = "Ingresá una dirección válida (mínimo 3 caracteres).";
    }
    if (!coordinates) {
      next.coordinates = "Seleccioná la ubicación en el mapa.";
    }
    if (coverageRadiusKm.trim()) {
      const normalized = coverageRadiusKm.replace(",", ".");
      const value = Number(normalized);
      if (!Number.isFinite(value) || value < 0) {
        next.coverageRadiusKm = "Ingresá un radio válido (ej. 5 o 2,5).";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [address, coordinates, coverageRadiusKm]);

  /** Payload listo para POST/PATCH del backend. */
  const buildPayload = useCallback((): CreateLocationPayload => {
    let radius: number | null | undefined;
    if (coverageRadiusKm.trim()) {
      const normalized = coverageRadiusKm.replace(",", ".");
      const value = Number(normalized);
      if (Number.isFinite(value) && value >= 0) {
        radius = Number(value.toFixed(3));
      }
    }
    return {
      address: address.trim(),
      latitude: coordinates?.latitude ?? 0,
      longitude: coordinates?.longitude ?? 0,
      is_primary: isPrimary,
      coverage_radius_km: radius ?? null,
    };
  }, [address, coordinates, isPrimary, coverageRadiusKm]);

  return {
    address,
    coordinates,
    isPrimary,
    coverageRadiusKm,
    errors,
    results,
    searching,
    searchError,
    resolving,
    reset,
    changeAddress,
    setCoordinates,
    toggleIsPrimary,
    changeCoverageRadiusKm,
    searchAddress,
    clearResults,
    selectResult,
    moveToCoordinates,
    validate,
    buildPayload,
  };
};
