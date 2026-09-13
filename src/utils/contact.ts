const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{8,15}$/;

export interface ContactIdentifier {
  /** Email cuando el contacto es un correo */
  email?: string;
  /** Phone cuando el contacto es un teléfono */
  phone?: string;
}

/**
 * Convierte el identificador de contacto (email o teléfono) al payload que
 * consume el backend (`{ email }` o `{ phone }` según el formato).
 * Reusa la misma lógica de useForgotPassword (`contactPayload`).
 * Devuelve `{}` si el contacto no matchea ninguno de los dos formatos.
 */
export function toContactIdentifier(contact: string): ContactIdentifier {
  const value = contact.trim();
  if (EMAIL_REGEX.test(value)) {
    return { email: value };
  }
  const phone = value.replace(/\s+/g, "");
  if (PHONE_REGEX.test(phone)) {
    return { phone };
  }
  return {};
}