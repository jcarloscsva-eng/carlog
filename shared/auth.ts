/**
 * Cloudflare Access injects this header on every request once the user has
 * authenticated. In local dev (no Access in front), fall back to a header
 * the developer sets manually so the app is still testable.
 */
const ACCESS_EMAIL_HEADER = 'Cf-Access-Authenticated-User-Email'
const DEV_EMAIL_HEADER = 'X-Dev-User-Email'

export class UnauthenticatedError extends Error {
  constructor() {
    super('No se pudo identificar al usuario autenticado')
    this.name = 'UnauthenticatedError'
  }
}

export function getAuthenticatedEmail(request: Request): string {
  const email =
    request.headers.get(ACCESS_EMAIL_HEADER) ?? request.headers.get(DEV_EMAIL_HEADER)

  if (!email) {
    throw new UnauthenticatedError()
  }

  return email.toLowerCase()
}
