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
