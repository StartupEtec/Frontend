import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { ApiError } from '../services/api';

/**
 * Compresión de imágenes antes de subirlas al backend.
 *
 * El backend rechaza archivos de más de 5 MB (`src/middlewares/upload.js`),
 * así que acá:
 *  1. Se limita el lado mayor de la imagen (por defecto 1600 px).
 *  2. Se recomprime a JPEG con calidad 0.7.
 *  3. Si el archivo resultante supera los 5 MB, se reintenta con menos calidad.
 *
 * Nunca se agranda una imagen chica (no se hace upscaling).
 */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 1600;

export interface CompressImageOptions {
  maxSizeBytes?: number;
  maxDimension?: number;
  quality?: number;
}

/** Tamaño del archivo en bytes, o null si no se puede determinar. */
async function getFileSize(uri: string): Promise<number | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && typeof info.size === 'number') return info.size;
    return null;
  } catch {
    return null;
  }
}

/** Acción de resize que respeta la relación de aspecto sin agrandar. */
function resizeAction(width: number, height: number, maxDimension: number) {
  const longest = Math.max(width, height);
  if (longest <= maxDimension) return null;
  if (width >= height) return { resize: { width: maxDimension } };
  return { resize: { height: maxDimension } };
}

/**
 * Recompresión base. Devuelve la URI del archivo comprimido junto con sus
 * dimensiones reales (necesarias para decidir el resize).
 */
async function recompress(uri: string, quality: number) {
  return manipulateAsync(uri, [], {
    compress: quality,
    format: SaveFormat.JPEG,
  });
}

/**
 * Comprime una imagen local (file:// / content://) y devuelve la URI del
 * archivo JPEG resultante.
 *
 * Si la plataforma no soporta manipulación (por ejemplo un mock o web sin
 * soporte), devuelve la URI original para no bloquear la subida.
 *
 * @throws ApiError `IMAGE_TOO_LARGE` si aun con la calidad mínima supera el
 * límite permitido.
 */
export async function compressImage(
  uri: string,
  options: CompressImageOptions = {}
): Promise<string> {
  const {
    maxSizeBytes = MAX_IMAGE_SIZE_BYTES,
    maxDimension = MAX_IMAGE_DIMENSION,
    quality = 0.7,
  } = options;

  let base;
  try {
    base = await recompress(uri, quality);
  } catch {
    // Sin soporte de manipulación: se sube el original (el backend valida).
    return uri;
  }

  const action = resizeAction(base.width, base.height, maxDimension);

  let result = base;
  if (action) {
    try {
      result = await manipulateAsync(uri, [action], {
        compress: quality,
        format: SaveFormat.JPEG,
      });
    } catch {
      result = base;
    }
  }

  let size = await getFileSize(result.uri);
  if (size === null || size <= maxSizeBytes) {
    return result.uri;
  }

  // Bajar la calidad progresivamente hasta entrar en el límite.
  for (const nextQuality of [0.5, 0.35, 0.25]) {
    try {
      const retry = await manipulateAsync(uri, action ? [action] : [], {
        compress: nextQuality,
        format: SaveFormat.JPEG,
      });
      size = await getFileSize(retry.uri);
      if (size === null || size <= maxSizeBytes) {
        return retry.uri;
      }
    } catch {
      // Seguir intentando con la próxima calidad.
    }
  }

  throw new ApiError(
    `La imagen supera el máximo de ${Math.round(maxSizeBytes / (1024 * 1024))} MB. Elegí una foto más liviana.`,
    0,
    'IMAGE_TOO_LARGE'
  );
}

/** Mensaje listo para mostrar cuando `compressImage` falla por tamaño. */
export function isImageTooLargeError(err: unknown): err is ApiError {
  return err instanceof ApiError && err.errorCode === 'IMAGE_TOO_LARGE';
}
