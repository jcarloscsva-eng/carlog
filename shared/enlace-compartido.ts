/**
 * Enlaces públicos de solo lectura para compartir el pasaporte de un
 * vehículo (p. ej. al venderlo).
 *
 * El enlace es un testigo firmado con HMAC-SHA256, el mismo mecanismo que
 * la cookie de sesión: no se guarda nada en la base de datos. A cambio de
 * esa simplicidad, un enlace no se puede revocar antes de tiempo — caduca
 * solo. Por eso la caducidad la elige quien comparte, y por eso el
 * contenido que se expone es únicamente el historial del vehículo, nunca
 * el email del propietario ni sus otros vehículos.
 */

interface PayloadCompartir {
  /** Id de registro del vehículo en Airtable. */
  v: string
  /** Caducidad, en segundos unix. */
  exp: number
}

function base64UrlEncode(bytes: ArrayBuffer | string): string {
  const bin = typeof bytes === 'string' ? bytes : String.fromCharCode(...new Uint8Array(bytes))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(value: string): string {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(value.length + ((4 - (value.length % 4)) % 4), '=')
  return atob(padded)
}

function base64UrlDecodeToBuffer(value: string): Uint8Array {
  return Uint8Array.from(base64UrlDecode(value), (c) => c.charCodeAt(0))
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

/**
 * El secreto se deriva del de sesión con un sufijo propio: así un testigo
 * de compartir nunca puede colarse como cookie de sesión ni al revés.
 */
function secretoCompartir(sessionSecret: string): string {
  return `${sessionSecret}::compartir`
}

export async function crearTokenCompartir(
  vehiculoId: string,
  sessionSecret: string,
  ttlSegundos: number,
): Promise<string> {
  const payload: PayloadCompartir = {
    v: vehiculoId,
    exp: Math.floor(Date.now() / 1000) + ttlSegundos,
  }
  const payloadB64 = base64UrlEncode(JSON.stringify(payload))
  const key = await importKey(secretoCompartir(sessionSecret))
  const firma = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64))
  return `${payloadB64}.${base64UrlEncode(firma)}`
}

/** Devuelve el id de vehículo si el enlace es válido y no ha caducado. */
export async function verificarTokenCompartir(
  token: string,
  sessionSecret: string,
): Promise<string | null> {
  const [payloadB64, firmaB64] = token.split('.')
  if (!payloadB64 || !firmaB64) return null

  let valido: boolean
  try {
    const key = await importKey(secretoCompartir(sessionSecret))
    valido = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlDecodeToBuffer(firmaB64),
      new TextEncoder().encode(payloadB64),
    )
  } catch {
    return null
  }
  if (!valido) return null

  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as PayloadCompartir
    if (!payload.v || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload.v
  } catch {
    return null
  }
}
