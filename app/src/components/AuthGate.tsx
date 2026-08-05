import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext<{ email: string; logout: () => void } | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthGate')
  return ctx
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    api.auth
      .me()
      .then((res) => setEmail(res.email))
      .catch(() => setEmail(null))
  }, [])

  if (email === undefined) {
    return <div className="flex min-h-screen items-center justify-center bg-carbon text-sm text-ink-dim">Cargando…</div>
  }

  if (email === null) {
    return <LoginForm onLoggedIn={setEmail} />
  }

  return (
    <AuthContext.Provider
      value={{
        email,
        logout: () => {
          api.auth.logout().finally(() => setEmail(null))
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

function LoginForm({ onLoggedIn }: { onLoggedIn: (email: string) => void }) {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRequestCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.auth.requestCode(email)
      setStep('code')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.auth.verifyCode(email, code)
      onLoggedIn(res.email)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-carbon p-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #d4cfc7 1px, transparent 1px), linear-gradient(to bottom, #d4cfc7 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="eyebrow justify-center">Gestión de vehículos</span>
          <h1 className="heading mt-3 text-3xl">
            Car<em>log</em>
          </h1>
        </div>

        <div className="panel p-6">
          <p className="mb-4 text-sm text-ink-dim">
            {step === 'email'
              ? 'Introduce tu email para recibir un código de acceso.'
              : `Introduce el código que te hemos enviado a ${email}.`}
          </p>

          {step === 'email' ? (
            <form onSubmit={handleRequestCode}>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="input mb-3"
              />
              {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? 'Enviando…' : 'Enviar código'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode}>
              <input
                type="text"
                inputMode="numeric"
                required
                autoFocus
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="input mb-3 text-center text-lg tracking-[0.3em]"
              />
              {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? 'Comprobando…' : 'Entrar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setCode('')
                  setError(null)
                }}
                className="mt-2 w-full text-xs text-ink-dim hover:text-gold"
              >
                Usar otro email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
