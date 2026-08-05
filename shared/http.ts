import { getAuthenticatedEmail, UnauthenticatedError, type AuthEnv } from './auth'
import { ForbiddenError } from './ownership'

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function errorResponse(err: unknown): Response {
  if (err instanceof UnauthenticatedError) {
    return json({ error: err.message }, 401)
  }
  if (err instanceof ForbiddenError) {
    return json({ error: err.message }, 403)
  }
  console.error(err)
  const message = err instanceof Error ? err.message : 'Error inesperado'
  return json({ error: message }, 500)
}

/** Ejecuta `handler` con el email autenticado, devolviendo 401/500 en caso de error. */
export async function withAuth(
  request: Request,
  env: AuthEnv,
  handler: (email: string) => Promise<Response>,
): Promise<Response> {
  try {
    const email = await getAuthenticatedEmail(request, env)
    return await handler(email)
  } catch (err) {
    return errorResponse(err)
  }
}
