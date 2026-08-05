const DEV_EMAIL_KEY = 'carlog:dev-email'

/**
 * En producción, Cloudflare Access inyecta el email autenticado en cada
 * request y este valor nunca se usa. En local (sin Access delante), lo
 * pedimos una vez y lo mandamos como header para poder probar la app.
 */
export function getDevEmail(): string | null {
  if (import.meta.env.PROD) return null
  return localStorage.getItem(DEV_EMAIL_KEY)
}

export function setDevEmail(email: string): void {
  localStorage.setItem(DEV_EMAIL_KEY, email)
}
