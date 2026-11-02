import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Almacenamiento seguro de tokens (JWT / refresh token / user id).
 *
 * - En iOS/Android usa `expo-secure-store` (Keychain / Keystore).
 * - En web (o si SecureStore no está disponible) cae a AsyncStorage, ya que
 *   SecureStore no existe en el navegador.
 * - Migra automáticamente los tokens que quedaron en AsyncStorage de versiones
 *   anteriores y borra las claves viejas.
 *
 * Se mantiene la misma interfaz que el histórico `tokenStorage` para que el
 * resto de la app no dependa del backend de almacenamiento.
 */

const ACCESS_TOKEN_KEY = '@startup_app/access_token';
const REFRESH_TOKEN_KEY = '@startup_app/refresh_token';
const USER_ID_KEY = '@startup_app/user_id';

const LEGACY_KEYS = [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_ID_KEY];

/**
 * SecureStore tiene un límite de tamaño por valor (≈2 KB). Los JWT suelen
 * quedar por debajo, pero por las dudas los valores grandes se guardan en
 * chunks independientes.
 */
const SECURE_VALUE_LIMIT = 2000;
const CHUNK_SIZE = 1800;
const CHUNK_COUNT_SUFFIX = '__chunks';
const CHUNK_SUFFIX = '__chunk_';

/** SecureStore solo admite letras, números, ".", "-" y "_" en las claves. */
function normalizeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

let secureStoreAvailable: boolean | null = null;

async function isSecureStoreAvailable(): Promise<boolean> {
  if (secureStoreAvailable !== null) return secureStoreAvailable;

  // SecureStore no está implementado en web: usar AsyncStorage.
  if (Platform.OS === 'web') {
    secureStoreAvailable = false;
    return false;
  }

  try {
    secureStoreAvailable = await SecureStore.isAvailableAsync();
  } catch {
    secureStoreAvailable = false;
  }
  return secureStoreAvailable;
}

function chunkCountKey(key: string): string {
  return normalizeKey(key) + CHUNK_COUNT_SUFFIX;
}

function chunkKey(key: string, index: number): string {
  return `${normalizeKey(key)}${CHUNK_SUFFIX}${index}`;
}

async function secureGetItem(key: string): Promise<string | null> {
  const countRaw = await SecureStore.getItemAsync(chunkCountKey(key));
  if (countRaw) {
    const count = Number.parseInt(countRaw, 10);
    if (Number.isFinite(count) && count > 0) {
      const chunks: string[] = [];
      for (let i = 0; i < count; i++) {
        const chunk = await SecureStore.getItemAsync(chunkKey(key, i));
        if (chunk === null) return null;
        chunks.push(chunk);
      }
      return chunks.join('');
    }
  }
  return SecureStore.getItemAsync(normalizeKey(key));
}

async function secureDeleteItem(key: string): Promise<void> {
  const countRaw = await SecureStore.getItemAsync(chunkCountKey(key));
  if (countRaw) {
    const count = Number.parseInt(countRaw, 10);
    if (Number.isFinite(count) && count > 0) {
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(chunkKey(key, i));
      }
    }
    await SecureStore.deleteItemAsync(chunkCountKey(key));
  }
  await SecureStore.deleteItemAsync(normalizeKey(key));
}

async function secureSetItem(key: string, value: string): Promise<void> {
  // Limpiar cualquier representación previa (single o chunks).
  await secureDeleteItem(key);

  if (value.length <= SECURE_VALUE_LIMIT) {
    await SecureStore.setItemAsync(normalizeKey(key), value);
    return;
  }

  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  for (let i = 0; i < chunks.length; i++) {
    await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]);
  }
  await SecureStore.setItemAsync(chunkCountKey(key), String(chunks.length));
}

async function getItem(key: string): Promise<string | null> {
  if (await isSecureStoreAvailable()) {
    try {
      return await secureGetItem(key);
    } catch {
      // Si SecureStore falla (p. ej. Keystore corrupto) no perdemos la sesión:
      // seguimos con el respaldo en AsyncStorage.
    }
  }
  return AsyncStorage.getItem(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (await isSecureStoreAvailable()) {
    try {
      await secureSetItem(key, value);
      // Evitar duplicados en el almacenamiento inseguro.
      await AsyncStorage.removeItem(key);
      return;
    } catch {
      // Fallback a AsyncStorage si el valor no entra o el Keystore falla.
    }
  }
  await AsyncStorage.setItem(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (await isSecureStoreAvailable()) {
    try {
      await secureDeleteItem(key);
    } catch {
      // Continuar: igual borramos el respaldo de AsyncStorage.
    }
  }
  await AsyncStorage.removeItem(key);
}

export const secureTokenStorage = {
  /**
   * Migra los tokens guardados en AsyncStorage (versiones anteriores) a
   * SecureStore y elimina las claves viejas. Idempotente: si no hay nada que
   * migrar no hace nada. Si SecureStore no está disponible (web) conserva el
   * almacenamiento actual.
   */
  async migrateLegacyTokens(): Promise<void> {
    if (!(await isSecureStoreAvailable())) return;

    try {
      const entries = await AsyncStorage.multiGet(LEGACY_KEYS);
      const present = entries.filter(([, value]) => value !== null);
      if (present.length === 0) return;

      for (const [key, value] of present) {
        if (value !== null) {
          await secureSetItem(key, value);
        }
      }
      await AsyncStorage.multiRemove([...LEGACY_KEYS]);
    } catch {
      // No bloquear el arranque por una migración fallida: se reintentará en
      // el próximo inicio.
    }
  },

  async getAccessToken(): Promise<string | null> {
    return getItem(ACCESS_TOKEN_KEY);
  },

  async setAccessToken(token: string): Promise<void> {
    await setItem(ACCESS_TOKEN_KEY, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return getItem(REFRESH_TOKEN_KEY);
  },

  async setRefreshToken(token: string): Promise<void> {
    await setItem(REFRESH_TOKEN_KEY, token);
  },

  async getUserId(): Promise<string | null> {
    return getItem(USER_ID_KEY);
  },

  async setUserId(id: string): Promise<void> {
    await setItem(USER_ID_KEY, id);
  },

  async saveAuth(data: {
    accessToken: string;
    refreshToken: string;
    userId: string;
  }): Promise<void> {
    await Promise.all([
      setItem(ACCESS_TOKEN_KEY, data.accessToken),
      setItem(REFRESH_TOKEN_KEY, data.refreshToken),
      setItem(USER_ID_KEY, data.userId),
    ]);
  },

  async clear(): Promise<void> {
    if (await isSecureStoreAvailable()) {
      await Promise.all(LEGACY_KEYS.map((key) => deleteItem(key)));
      return;
    }
    // Sin SecureStore (web/tests) los tokens viven en AsyncStorage.
    await AsyncStorage.multiRemove([...LEGACY_KEYS]);
  },
};

export const tokenStorage = secureTokenStorage;
