import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { api } from '../lib/api'
import { registrarConexionYComprobarAvisoKm } from '../lib/kmReminder'

const AuthContext = createContext<{
  email: string
  isAdmin: boolean
  logout: () => void
  showKmReminder: boolean
  dismissKmReminder: () => void
} | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthGate')
  return ctx
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null | undefined>(undefined)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showKmReminder, setShowKmReminder] = useState(false)

  useEffect(() => {
    api.auth
      .me()
      .then((res) => {
        setEmail(res.email)
        setIsAdmin(res.isAdmin)
        setShowKmReminder(registrarConexionYComprobarAvisoKm(res.email))
      })
      .catch(() => setEmail(null))
  }, [])

  function handleLoggedIn(loggedInEmail: string, loggedInIsAdmin: boolean) {
    setEmail(loggedInEmail)
    setIsAdmin(loggedInIsAdmin)
    setShowKmReminder(registrarConexionYComprobarAvisoKm(loggedInEmail))
  }

  if (email === undefined) {
    return <div className="flex min-h-screen items-center justify-center bg-paper text-sm text-ink-dim">Cargando…</div>
  }

  if (email === null) {
    return <LoginForm onLoggedIn={handleLoggedIn} />
  }

  return (
    <AuthContext.Provider
      value={{
        email,
        isAdmin,
        logout: () => {
          api.auth.logout().finally(() => setEmail(null))
        },
        showKmReminder,
        dismissKmReminder: () => setShowKmReminder(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

function LoginForm({ onLoggedIn }: { onLoggedIn: (email: string, isAdmin: boolean) => void }) {
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
      onLoggedIn(res.email, res.isAdmin)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-wrap">
        <h1 className="login-lockup" aria-label="Carlog">
          <svg className="login-mark" viewBox="0 0 57 64" aria-hidden="true">
            <path className="road" d="M 48.1 45.5 A 21 21 0 1 1 48.1 18.5" />
            <path className="lane" d="M 48.1 45.5 A 21 21 0 1 1 48.1 18.5" />
            <g className="car-drive">
              <path className="car" d="M -9 3 L -7 -1 L -3 -3 L 3 -3 L 6 0 L 9 3 L 9 5 L -9 5 Z" />
              <circle className="car-hl" cx="-4.5" cy="5" r="2.2" />
              <circle className="car-hl" cx="4.5" cy="5" r="2.2" />
            </g>
          </svg>
          <span className="login-rest" aria-hidden="true">
            ar<em>log</em>
          </span>
        </h1>

        <p className="login-tag">
          {step === 'email'
            ? 'Introduce tu email para recibir un código de acceso.'
            : `Introduce el código que te hemos enviado a ${email}.`}
        </p>

        <div className="login-card panel p-6 text-left">
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
              {error && <p className="mb-3 text-sm text-stamp">{error}</p>}
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
              {error && <p className="mb-3 text-sm text-stamp">{error}</p>}
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
                className="mt-2 w-full text-xs text-ink-dim hover:text-stamp"
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
