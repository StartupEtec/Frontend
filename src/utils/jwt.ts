import { UserRole } from "../types/role";

/**
 * Decodificación de JWT en el cliente (solo lectura de claims, SIN verificar
 * la firma). El backend valida el token en cada request; acá únicamente se usa
 * el `current_role` para que la UI refleje el rol real persistido y no quede
 * desincronizada con un valor local viejo (AsyncStorage).
 */

export interface JwtPayload {
  user_id?: string;
  email?: string;
  current_role?: string;
  iat?: number;
  exp?: number;
}

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Decodifica base64/base64url a un string binario. Null si es inválido. */
function base64Decode(input: string): string | null {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const clean = normalized.replace(/=+$/, "");
  let output = "";
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE64_ALPHABET.indexOf(clean[i]);
    if (idx === -1) return null;
    buffer = (buffer << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
}

/** Convierte un string binario (bytes) a UTF-8, tolerante a fallos. */
function utf8Decode(binary: string): string {
  try {
    return decodeURIComponent(
      binary
        .split("")
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
  } catch {
    return binary;
  }
}

/** Devuelve el payload del JWT, o null si el token no es parseable. */
export function decodeJwtPayload(
  token: string | null | undefined,
): JwtPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const binary = base64Decode(parts[1]);
    if (!binary) return null;
    const payload = JSON.parse(utf8Decode(binary)) as JwtPayload;
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

/** Rol activo según el JWT (`current_role`), o null si no es válido/ conocido. */
export function getCurrentRoleFromJwt(
  token: string | null | undefined,
): UserRole | null {
  const role = decodeJwtPayload(token)?.current_role;
  return role === "client" || role === "worker" ? role : null;
}
