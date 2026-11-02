/**
 * Punto de entrada histórico para el almacenamiento de sesión.
 *
 * Los tokens ahora se guardan de forma segura (Keychain/Keystore) mediante
 * `secureTokenStorage`. Se mantiene este módulo para no romper los imports
 * existentes; ambos exponen la misma interfaz.
 */
export { secureTokenStorage as tokenStorage, secureTokenStorage } from './secureTokenStorage';
