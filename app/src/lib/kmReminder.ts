const STORAGE_PREFIX = 'carlog:conexiones:'
const CADA_N_CONEXIONES = 4

/**
 * Cuenta una conexión (sesión ya existente al abrir la app, o login recién
 * completado) para este email, y dice si toca mostrar el aviso de revisar
 * el kilometraje — cada CADA_N_CONEXIONES veces. El contador vive en
 * localStorage: es un recordatorio de baja fricción, no necesita
 * persistirse en el servidor.
 */
export function registrarConexionYComprobarAvisoKm(email: string): boolean {
  try {
    const key = STORAGE_PREFIX + email
    const actual = Number(localStorage.getItem(key) ?? '0') + 1
    localStorage.setItem(key, String(actual))
    return actual % CADA_N_CONEXIONES === 0
  } catch {
    // localStorage puede no estar disponible (modo privado, cuotas, etc.):
    // no es crítico, simplemente no se muestra el aviso esa vez.
    return false
  }
}
