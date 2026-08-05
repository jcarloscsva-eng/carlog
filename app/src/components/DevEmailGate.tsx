import { useState, type ReactNode } from 'react'
import { getDevEmail, setDevEmail } from '../lib/devAuth'

/**
 * En producción, Cloudflare Access ya garantiza que solo llegan requests
 * autenticados, así que este gate no hace nada. En desarrollo local, pide
 * un email una vez para simular el header que inyectaría Access.
 */
export function DevEmailGate({ children }: { children: ReactNode }) {
  const [email, setEmailState] = useState(() => getDevEmail())
  const [input, setInput] = useState('')

  if (import.meta.env.PROD || email) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault()
          if (!input) return
          setDevEmail(input)
          setEmailState(input)
        }}
      >
        <h1 className="mb-2 text-lg font-semibold text-slate-900">Modo desarrollo</h1>
        <p className="mb-4 text-sm text-slate-500">
          Cloudflare Access no está delante en local. Introduce el email que
          quieres simular como usuario autenticado.
        </p>
        <input
          type="email"
          required
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="tu@email.com"
          className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
        >
          Continuar
        </button>
      </form>
    </div>
  )
}
