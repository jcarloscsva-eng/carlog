import { esAdministrador, type AuthEnv } from '../../../shared/auth'
import { json, withAuth } from '../../../shared/http'

type Env = AuthEnv & { ALLOWED_EMAILS?: string }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) =>
  withAuth(request, env, async (email) => json({ email, isAdmin: esAdministrador(env.ALLOWED_EMAILS, email) }))
