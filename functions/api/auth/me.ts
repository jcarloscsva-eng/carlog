import type { AuthEnv } from '../../../shared/auth'
import { json, withAuth } from '../../../shared/http'

export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) =>
  withAuth(request, env, async (email) => json({ email }))
