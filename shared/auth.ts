import { parseSessionCookie, verifySessionToken } from './session'

export interface AuthEnv {
  SESSION_SECRET: string
}

export class UnauthenticatedError extends Error {
  constructor() {
    super('No se pudo identificar al usuario autenticado')
    this.name = 'UnauthenticatedError'
  }
}

export async function getAuthenticatedEmail(request: Request, env: AuthEnv): Promise<string> {
  const token = parseSessionCookie(request)
  if (!token) throw new UnauthenticatedError()

  const email = await verifySessionToken(token, env.SESSION_SECRET)
  if (!email) throw new UnauthenticatedError()

  return email
}

export class AdminRequiredError extends Error {
  constructor() {
    super('No tienes permisos de administrador')
    this.name = 'AdminRequiredError'
  }
}

/** Emails separados por coma de la variable ALLOWED_EMAILS. */
function listaDesdeEnv(valor: string | undefined): string[] {
  return valor?.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean) ?? []
}

/**
 * Administrador = email ya fijado en el secret ALLOWED_EMAILS de
 * Cloudflare. Es el nivel de confianza "raíz": quien esté ahí puede
 * gestionar altas/bajas de UsuariosPermitidos desde la propia app, sin
 * que eso a su vez pueda tocar ALLOWED_EMAILS. Si ALLOWED_EMAILS no está
 * configurada (modo abierto), nadie es administrador por esta vía.
 */
export function esAdministrador(allowedEmailsEnv: string | undefined, email: string): boolean {
  return listaDesdeEnv(allowedEmailsEnv).includes(email.trim().toLowerCase())
}

export function assertEsAdministrador(allowedEmailsEnv: string | undefined, email: string): void {
  if (!esAdministrador(allowedEmailsEnv, email)) throw new AdminRequiredError()
}
