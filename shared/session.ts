const COOKIE_NAME = 'carlog_session'

interface SessionPayload {
  email: string
  exp: number // unix seconds
}

function base64UrlEncode(bytes: ArrayBuffer | string): string {
  const bin =
    typeof bytes === 'string' ? bytes : String.fromCharCode(...new Uint8Array(bytes))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    '=',
  )
  return atob(padded)
}

function base64UrlDecodeToBuffer(value: string): Uint8Array {
  const bin = base64UrlDecode(value)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
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

export async function createSessionToken(
  email: string,
  secret: string,
  ttlSeconds: number,
): Promise<string> {
  const payload: SessionPayload = {
    email,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  }
  const payloadB64 = base64UrlEncode(JSON.stringify(payload))
  const key = await importKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64))
  return `${payloadB64}.${base64UrlEncode(signature)}`
}

export async function verifySessionToken(token: string, secret: string): Promise<string | null> {
  const [payloadB64, sigB64] = token.split('.')
  if (!payloadB64 || !sigB64) return null

  const key = await importKey(secret)
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    base64UrlDecodeToBuffer(sigB64),
    new TextEncoder().encode(payloadB64),
  )
  if (!valid) return null

  const payload = JSON.parse(base64UrlDecode(payloadB64)) as SessionPayload
  if (payload.exp < Math.floor(Date.now() / 1000)) return null

  return payload.email
}

export function parseSessionCookie(request: Request): string | null {
  const cookie = request.headers.get('Cookie') ?? ''
  const match = cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function buildSessionCookie(token: string, maxAgeSeconds: number): string {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`
}

export function buildClearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}
