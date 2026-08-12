import { useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { useCollection } from '../hooks/useCollection'
import { useAuth } from '../components/AuthGate'

export function UsuariosPage() {
  const { isAdmin } = useAuth()
  const { data: usuarios, loading, error, reload } = useCollection(api.usuarios.list)
  const [email, setEmail] = useState('')
  const [nota, setNota] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  if (!isAdmin) {
    return (
      <div>
        <span className="eyebrow">Acceso</span>
        <h1 className="heading mt-1 mb-4 text-2xl">Usuarios</h1>
        <p className="text-sm text-ink-dim">
          Esta sección es solo para administradores — quienes ya tienen su email en la
          configuración de Cloudflare.
        </p>
      </div>
    )
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      await api.usuarios.create({ email, nota: nota || undefined })
      setEmail('')
      setNota('')
      reload()
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`¿Quitar el acceso de ${email}?`)) return
    await api.usuarios.remove(id)
    reload()
  }

  return (
    <div>
      <span className="eyebrow">Administración</span>
      <h1 className="heading mt-1 mb-2 text-2xl">Usuarios</h1>
      <p className="mb-6 text-sm text-ink-dim">
        Da de alta un email para que pueda entrar en Carlog con su propio código, sin
        tocar la configuración de Cloudflare. Cada persona invitada ve solo sus propios
        vehículos.
      </p>

      <form onSubmit={handleSubmit} className="panel mb-6 grid gap-2 p-4 sm:grid-cols-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@ejemplo.com"
          className="input sm:col-span-1"
        />
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Nota (opcional, p. ej. «cuñado»)"
          className="input sm:col-span-1"
        />
        <button type="submit" disabled={submitting} className="btn-primary sm:col-span-1">
          {submitting ? 'Añadiendo…' : '+ Dar acceso'}
        </button>
        {formError && <p className="text-sm text-stamp sm:col-span-3">{formError}</p>}
      </form>

      {loading && <p className="text-sm text-ink-dim">Cargando…</p>}
      {error && <p className="text-sm text-stamp">{error}</p>}

      <ul className="space-y-2">
        {usuarios.map((u) => (
          <li key={u.id} className="entry flex items-center justify-between gap-3 p-3">
            <div>
              <p className="text-sm text-ink">{u.email}</p>
              <p className="text-xs text-ink-dim">
                Desde el {u.fechaAlta}
                {u.nota && <> · {u.nota}</>}
              </p>
            </div>
            <button onClick={() => handleDelete(u.id, u.email)} className="btn-ghost shrink-0 px-2 py-1 text-xs">
              Quitar acceso
            </button>
          </li>
        ))}
        {!loading && usuarios.length === 0 && (
          <p className="text-sm text-ink-dim">
            Sin invitados todavía — solo entran los emails configurados en Cloudflare.
          </p>
        )}
      </ul>
    </div>
  )
}
