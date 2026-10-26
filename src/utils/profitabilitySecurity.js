/**
 * OpenArena - Seguridad de Acceso a Vista Rentabilidad
 * 
 * Por seguridad, la contraseña NUNCA se almacena en texto plano en el código.
 * Se utiliza una función de dispersión criptográfica unidireccional (SHA-256)
 * combinada con un salt único y secreto.
 * 
 * Esto garantiza que:
 * 1. Nadie que abra las herramientas de desarrollador o inspeccione el código compilado
 *    podrá encontrar la contraseña buscando el texto plano.
 * 2. La función SHA-256 es irreversible (resistencia a preimagen).
 * 3. El salt mitiga ataques de fuerza bruta basados en tablas arcoíris (rainbow tables).
 */

const SECURITY_SALT = 'OpenArena_Rentabilidad_Secure_Salt_v1_2026';
const EXPECTED_HASH = 'f7fdbd1908f690eb785b2ac784c66507575ce30a55e6d9ce99dbd8cc0ed483fd';

/**
 * Verifica de forma asíncrona mediante la Web Crypto API nativa si el PIN introducido
 * coincide con la clave de seguridad configurada.
 * 
 * @param {string} inputPin - PIN o contraseña introducida por el usuario
 * @returns {Promise<boolean>} - true si es correcta, false si es incorrecta
 */
export async function verifyProfitabilityPin(inputPin) {
  try {
    if (!inputPin || typeof inputPin !== 'string') {
      return false;
    }

    const cleanInput = inputPin.trim();
    if (!cleanInput) {
      return false;
    }

    // Usar la Web Crypto API del navegador
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(`${SECURITY_SALT}:${cleanInput}`);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      return hashHex === EXPECTED_HASH;
    }

    // Fallback de contingencia (en entornos sin SubtleCrypto)
    return false;
  } catch (error) {
    console.error('Error al verificar clave de seguridad:', error);
    return false;
  }
}
