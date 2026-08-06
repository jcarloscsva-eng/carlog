# Editar/borrar registros + rate limiting del login — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir edición y borrado desde la UI para Averías, Mantenimientos, Repuestos e ITV, edición de la información de los Vehículos, y proteger `/api/auth/request-code` contra abuso (spam de códigos) por IP y por email.

**Architecture:** Un componente `Modal` genérico nuevo, reutilizado por las 4 pestañas de vehículo, cada una extrayendo su formulario existente a un sub-componente parametrizable por `initialValues`. En el backend, `request-code.ts` gana dos comprobaciones de Airtable (`CREATED_TIME()`) antes de crear un código nuevo; la protección por IP se configura aparte en el dashboard de Cloudflare (no es código).

**Tech Stack:** React + TypeScript (frontend), Cloudflare Pages Functions + Airtable REST API (backend). Sin framework de tests — este proyecto no tiene ninguno configurado y añadirlo se dejó fuera de alcance en el spec; la verificación de cada tarea es `tsc -b` + build + comprobación manual en el navegador (frontend) o revisión lógica + prueba manual con credenciales reales (backend, ya que ni Airtable ni Resend están disponibles como credenciales locales para quien ejecute este plan).

## Global Constraints

- No introducir ningún framework de test (spec: "Fuera de alcance: Tests automatizados").
- No tocar el modelo de datos de Airtable (spec: "Fuera de alcance").
- Reutilizar los estilos ya existentes: clases `panel`, `input`, `btn-primary`, `btn-ghost` de `app/src/index.css` — no inventar clases nuevas de color.
- Cada tarea termina con `cd app && npx tsc -b` sin errores antes de comitear.
- Commits frecuentes, uno por tarea.

---

### Task 1: Componente `Modal` genérico

**Files:**
- Create: `app/src/components/Modal.tsx`

**Interfaces:**
- Produces: `Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode })` — componente por defecto exportado como *named export* `Modal`.

- [ ] **Step 1: Crear el componente**

```tsx
import { useEffect, type ReactNode } from 'react'

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="panel w-full max-w-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-bright">{title}</h2>
          <button
            onClick={onClose}
            className="text-ink-dim hover:text-stamp"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd app && npx tsc -b`
Expected: sin errores (el componente aún no se usa en ningún sitio, pero debe compilar solo).

- [ ] **Step 3: Commit**

```bash
git add app/src/components/Modal.tsx
git commit -m "Add generic Modal component for edit dialogs"
```

---

### Task 2: Rate limiting por email en `request-code.ts`

**Files:**
- Modify: `functions/api/auth/request-code.ts`

**Interfaces:**
- Consumes: `airtableList<F>(env: AirtableEnv, table: string, filterByFormula?: string): Promise<{id: string; fields: F}[]>` de `shared/airtable.ts`; `airtableFormulaString(value: string): string` de `shared/airtable.ts`; `TABLES.LoginCodes` de `shared/airtable-mappers.ts`.
- Produces: sin cambios en la interfaz pública del endpoint (`POST /api/auth/request-code` con `{email}` → `{ok: true}` o `{error}` con status 429/400/500).

- [ ] **Step 1: Importar `airtableList` y `airtableFormulaString`**

En `functions/api/auth/request-code.ts`, cambia la primera línea de:

```ts
import { airtableCreate, type AirtableEnv } from '../../../shared/airtable'
```

a:

```ts
import { airtableCreate, airtableFormulaString, airtableList, type AirtableEnv } from '../../../shared/airtable'
```

- [ ] **Step 2: Añadir las constantes de límite y la función de comprobación**

Justo debajo de `const CODE_TTL_SECONDS = 10 * 60`, añade:

```ts
const COOLDOWN_SECONDS = 60
const MAX_POR_HORA = 5

async function demasiadosIntentos(env: Env, email: string): Promise<string | null> {
  const emailEscapado = airtableFormulaString(email)

  const recientes = await airtableList<Record<string, unknown>>(
    env,
    TABLES.LoginCodes,
    `AND({Email} = '${emailEscapado}', IS_AFTER(CREATED_TIME(), DATEADD(NOW(), -${COOLDOWN_SECONDS}, 'seconds')))`,
  )
  if (recientes.length > 0) {
    return 'Espera un momento antes de pedir otro código'
  }

  const ultimaHora = await airtableList<Record<string, unknown>>(
    env,
    TABLES.LoginCodes,
    `AND({Email} = '${emailEscapado}', IS_AFTER(CREATED_TIME(), DATEADD(NOW(), -60, 'minutes')))`,
  )
  if (ultimaHora.length >= MAX_POR_HORA) {
    return 'Demasiados intentos, prueba más tarde'
  }

  return null
}
```

- [ ] **Step 3: Llamar a la comprobación antes de crear el código**

Dentro del `if (isAllowed) {` bloque, justo antes de `const code = generateCode()`, añade:

```ts
    const bloqueo = await demasiadosIntentos(env, email)
    if (bloqueo) {
      return json({ error: bloqueo }, 429)
    }

```

- [ ] **Step 4: Revertir el TODO de depuración (silenciar el fallo de envío de email)**

Ese `TODO` ya cumplió su función durante el diagnóstico en producción (confirmado que el envío funciona). Cambia el bloque:

```ts
    try {
      await sendEmail(
        env,
        email,
        'Tu código de acceso a Carlog',
        `<p>Tu código de acceso es:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p><p>Caduca en 10 minutos.</p>`,
      )
    } catch (err) {
      console.error('Error enviando código de login', err)
      // TODO: una vez confirmado el envío en producción, volver a silenciar
      // este fallo (devolver siempre ok:true) para no filtrar qué emails
      // están en ALLOWED_EMAILS.
      return json({ error: `Fallo enviando el email: ${(err as Error).message}` }, 500)
    }
```

por:

```ts
    await sendEmail(
      env,
      email,
      'Tu código de acceso a Carlog',
      `<p>Tu código de acceso es:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p><p>Caduca en 10 minutos.</p>`,
    ).catch((err) => console.error('Error enviando código de login', err))
```

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.json` (desde la raíz del repo)
Expected: sin errores.

- [ ] **Step 6: Prueba manual (requiere despliegue con credenciales reales)**

Quien ejecute esto no tiene `AIRTABLE_API_KEY`/`RESEND_API_KEY` en local. Tras desplegar (push a `main`, Cloudflare auto-despliega), probar desde la app: pedir un código dos veces seguidas en menos de 60s y comprobar que la segunda devuelve el error de "Espera un momento...".

- [ ] **Step 7: Commit**

```bash
git add functions/api/auth/request-code.ts
git commit -m "Rate limit login code requests by email (cooldown + hourly cap)"
```

---

### Task 3: Editar/borrar en `AveriasTab`

**Files:**
- Modify: `app/src/components/tabs/AveriasTab.tsx`

**Interfaces:**
- Consumes: `Modal` de Task 1; `api.averias.update(id: string, data: Partial<Omit<Averia, 'id'>>): Promise<Averia>` y `api.averias.remove(id: string): Promise<{ok: true}>` (ya existen en `app/src/lib/api.ts`).

- [ ] **Step 1: Importar `Modal` y añadir estado de edición**

Añade el import y el estado, justo tras los imports existentes y el primer `useState`:

```tsx
import { Modal } from '../Modal'
```

Dentro del componente, tras `const [submitting, setSubmitting] = useState(false)`, añade:

```tsx
  const [editing, setEditing] = useState<Averia | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
```

- [ ] **Step 2: Handlers de editar y borrar**

Tras la función `marcarResuelta`, añade:

```tsx
  async function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    const form = new FormData(e.currentTarget)
    setEditSubmitting(true)
    setEditError(null)
    try {
      await api.averias.update(editing.id, {
        fecha: String(form.get('fecha')),
        descripcion: String(form.get('descripcion')),
      })
      setEditing(null)
      reload()
    } catch (err) {
      setEditError((err as Error).message)
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleDelete(a: Averia) {
    if (!confirm('¿Borrar esta avería?')) return
    await api.averias.remove(a.id)
    reload()
  }
```

- [ ] **Step 3: Añadir botones Editar/Eliminar en cada fila**

En el `<div className="flex shrink-0 gap-2">` de cada fila, tras el botón de "Marcar resuelta"/"Reabrir", añade:

```tsx
              <button onClick={() => setEditing(a)} className="btn-ghost px-2 py-1 text-xs">
                Editar
              </button>
              <button onClick={() => handleDelete(a)} className="btn-ghost px-2 py-1 text-xs">
                Eliminar
              </button>
```

- [ ] **Step 4: Añadir el modal al final del `return`, antes del `</div>` que cierra el componente**

```tsx
      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Editar avería">
        {editing && (
          <form onSubmit={handleEditSubmit} className="grid gap-2">
            <input name="fecha" type="date" required defaultValue={editing.fecha} className="input" />
            <textarea
              name="descripcion"
              required
              defaultValue={editing.descripcion}
              className="input"
              rows={3}
            />
            {editError && <p className="text-sm text-red-700">{editError}</p>}
            <button type="submit" disabled={editSubmitting} className="btn-primary">
              {editSubmitting ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </form>
        )}
      </Modal>
```

- [ ] **Step 5: Verificar tipos**

Run: `cd app && npx tsc -b`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add app/src/components/tabs/AveriasTab.tsx
git commit -m "Add edit/delete to AveriasTab"
```

---

### Task 4: Editar/borrar en `MantenimientosTab`

**Files:**
- Modify: `app/src/components/tabs/MantenimientosTab.tsx`

**Interfaces:**
- Consumes: `Modal` de Task 1; `api.mantenimientos.update`/`api.mantenimientos.remove` (ya existen).
- Produces: sub-componente interno `MantenimientoForm` usado tanto para crear como editar (no exportado, solo dentro de este archivo).

- [ ] **Step 1: Extraer el formulario a un sub-componente**

Reemplaza todo el contenido del archivo por:

```tsx
import { useState, type FormEvent } from 'react'
import type { Mantenimiento } from '@shared/types'
import { api } from '../../lib/api'
import { Modal } from '../Modal'

interface MantenimientoFormValues {
  fecha: string
  km: number
  precio: number
  tienda: string
  elementos: string
  intervaloKm?: number
  intervaloMeses?: number
}

function MantenimientoForm({
  initialValues,
  submitting,
  error,
  submitLabel,
  onSubmit,
}: {
  initialValues?: MantenimientoFormValues
  submitting: boolean
  error: string | null
  submitLabel: string
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-3">
      <input name="fecha" type="date" required defaultValue={initialValues?.fecha} className="input" />
      <input
        name="km"
        type="number"
        required
        placeholder="Km"
        defaultValue={initialValues?.km}
        className="input"
      />
      <input
        name="precio"
        type="number"
        step="0.01"
        required
        placeholder="Precio (€)"
        defaultValue={initialValues?.precio}
        className="input"
      />
      <input
        name="tienda"
        required
        placeholder="Tienda / taller"
        defaultValue={initialValues?.tienda}
        className="input"
      />
      <input
        name="elementos"
        required
        placeholder="Elementos abordados"
        defaultValue={initialValues?.elementos}
        className="input sm:col-span-2"
      />
      <input
        name="intervaloKm"
        type="number"
        placeholder="Recordar cada X km (opcional)"
        defaultValue={initialValues?.intervaloKm}
        className="input"
      />
      <input
        name="intervaloMeses"
        type="number"
        placeholder="Recordar cada X meses (opcional)"
        defaultValue={initialValues?.intervaloMeses}
        className="input"
      />
      {error && <p className="text-sm text-red-700 sm:col-span-3">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary sm:col-span-3">
        {submitting ? 'Guardando…' : submitLabel}
      </button>
    </form>
  )
}

function readFormValues(form: FormData): Omit<Mantenimiento, 'id' | 'vehiculoId'> {
  return {
    fecha: String(form.get('fecha')),
    km: Number(form.get('km')),
    precio: Number(form.get('precio')),
    tienda: String(form.get('tienda')),
    elementos: String(form.get('elementos')),
    intervaloKm: form.get('intervaloKm') ? Number(form.get('intervaloKm')) : undefined,
    intervaloMeses: form.get('intervaloMeses') ? Number(form.get('intervaloMeses')) : undefined,
  }
}

export function MantenimientosTab({
  vehiculoId,
  mantenimientos,
  reload,
}: {
  vehiculoId: string
  mantenimientos: Mantenimiento[]
  reload: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState<Mantenimiento | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      await api.mantenimientos.create({ vehiculoId, ...readFormValues(form) })
      e.currentTarget.reset()
      reload()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    const form = new FormData(e.currentTarget)
    setEditSubmitting(true)
    setEditError(null)
    try {
      await api.mantenimientos.update(editing.id, readFormValues(form))
      setEditing(null)
      reload()
    } catch (err) {
      setEditError((err as Error).message)
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleDelete(m: Mantenimiento) {
    if (!confirm('¿Borrar este mantenimiento?')) return
    await api.mantenimientos.remove(m.id)
    reload()
  }

  return (
    <div>
      <div className="panel mb-4 p-4">
        <MantenimientoForm
          submitting={submitting}
          error={error}
          submitLabel="Añadir mantenimiento"
          onSubmit={handleSubmit}
        />
      </div>

      <ul className="space-y-2">
        {mantenimientos.map((m) => (
          <li key={m.id} className="entry flex items-start justify-between gap-3 p-3">
            <div>
              <p className="text-sm text-ink">{m.elementos}</p>
              <p className="text-xs text-ink-dim">
                {m.fecha} · {m.km.toLocaleString('es-ES')} km ·{' '}
                <span className="text-stamp">{m.precio.toFixed(2)} €</span> · {m.tienda}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => setEditing(m)} className="btn-ghost px-2 py-1 text-xs">
                Editar
              </button>
              <button onClick={() => handleDelete(m)} className="btn-ghost px-2 py-1 text-xs">
                Eliminar
              </button>
            </div>
          </li>
        ))}
        {mantenimientos.length === 0 && (
          <p className="text-sm text-ink-dim">Sin mantenimientos registrados.</p>
        )}
      </ul>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Editar mantenimiento">
        {editing && (
          <MantenimientoForm
            initialValues={editing}
            submitting={editSubmitting}
            error={editError}
            submitLabel="Guardar cambios"
            onSubmit={handleEditSubmit}
          />
        )}
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd app && npx tsc -b`
Expected: sin errores.

- [ ] **Step 3: Verificación manual en el navegador**

Con el dev server local corriendo (`node_modules/.bin/vite app --config app/vite.config.ts` desde la raíz), abrir un vehículo, pestaña Mantenimientos, comprobar: el formulario de crear sigue funcionando igual que antes; aparecen botones Editar/Eliminar en cada fila; Editar abre el modal precargado; Eliminar pide confirmación. (La llamada real a la API fallará sin backend local con credenciales, pero la interacción de UI debe verse correcta.)

- [ ] **Step 4: Commit**

```bash
git add app/src/components/tabs/MantenimientosTab.tsx
git commit -m "Add edit/delete to MantenimientosTab, extract reusable form"
```

---

### Task 5: Editar/borrar en `RepuestosTab`

**Files:**
- Modify: `app/src/components/tabs/RepuestosTab.tsx`

**Interfaces:**
- Consumes: `Modal` de Task 1; `api.repuestos.update`/`api.repuestos.remove` (ya existen).
- Produces: sub-componente interno `RepuestoForm`.

- [ ] **Step 1: Extraer el formulario y añadir edición/borrado**

Reemplaza todo el contenido del archivo por:

```tsx
import { useState, type FormEvent } from 'react'
import type { Repuesto, TipoRepuesto } from '@shared/types'
import { api } from '../../lib/api'
import { Modal } from '../Modal'

const TIPOS: TipoRepuesto[] = [
  'Neumáticos',
  'Batería',
  'Frenos',
  'Correa de distribución',
  'Filtros',
  'Otro',
]

interface RepuestoFormValues {
  tipoRepuesto: TipoRepuesto
  fecha: string
  km: number
  precio: number
  tienda: string
  vidaUtilKm?: number
  vidaUtilAnios?: number
}

function RepuestoForm({
  initialValues,
  submitting,
  error,
  submitLabel,
  onSubmit,
}: {
  initialValues?: RepuestoFormValues
  submitting: boolean
  error: string | null
  submitLabel: string
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-3">
      <select
        name="tipoRepuesto"
        required
        className="input"
        defaultValue={initialValues?.tipoRepuesto ?? 'Neumáticos'}
      >
        {TIPOS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <input name="fecha" type="date" required defaultValue={initialValues?.fecha} className="input" />
      <input
        name="km"
        type="number"
        required
        placeholder="Km"
        defaultValue={initialValues?.km}
        className="input"
      />
      <input
        name="precio"
        type="number"
        step="0.01"
        required
        placeholder="Precio (€)"
        defaultValue={initialValues?.precio}
        className="input"
      />
      <input name="tienda" required placeholder="Tienda" defaultValue={initialValues?.tienda} className="input" />
      <div />
      <input
        name="vidaUtilKm"
        type="number"
        placeholder="Vida útil en km (opcional)"
        defaultValue={initialValues?.vidaUtilKm}
        className="input"
      />
      <input
        name="vidaUtilAnios"
        type="number"
        placeholder="Vida útil en años (opcional)"
        defaultValue={initialValues?.vidaUtilAnios}
        className="input"
      />
      {error && <p className="text-sm text-red-700 sm:col-span-3">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary sm:col-span-3">
        {submitting ? 'Guardando…' : submitLabel}
      </button>
    </form>
  )
}

function readFormValues(form: FormData): Omit<Repuesto, 'id' | 'vehiculoId'> {
  return {
    tipoRepuesto: form.get('tipoRepuesto') as TipoRepuesto,
    fecha: String(form.get('fecha')),
    km: Number(form.get('km')),
    precio: Number(form.get('precio')),
    tienda: String(form.get('tienda')),
    vidaUtilKm: form.get('vidaUtilKm') ? Number(form.get('vidaUtilKm')) : undefined,
    vidaUtilAnios: form.get('vidaUtilAnios') ? Number(form.get('vidaUtilAnios')) : undefined,
  }
}

export function RepuestosTab({
  vehiculoId,
  repuestos,
  reload,
}: {
  vehiculoId: string
  repuestos: Repuesto[]
  reload: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState<Repuesto | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      await api.repuestos.create({ vehiculoId, ...readFormValues(form) })
      e.currentTarget.reset()
      reload()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    const form = new FormData(e.currentTarget)
    setEditSubmitting(true)
    setEditError(null)
    try {
      await api.repuestos.update(editing.id, readFormValues(form))
      setEditing(null)
      reload()
    } catch (err) {
      setEditError((err as Error).message)
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleDelete(r: Repuesto) {
    if (!confirm('¿Borrar este repuesto?')) return
    await api.repuestos.remove(r.id)
    reload()
  }

  return (
    <div>
      <div className="panel mb-4 p-4">
        <RepuestoForm
          submitting={submitting}
          error={error}
          submitLabel="Añadir repuesto"
          onSubmit={handleSubmit}
        />
      </div>

      <ul className="space-y-2">
        {repuestos.map((r) => (
          <li key={r.id} className="entry flex items-start justify-between gap-3 p-3">
            <div>
              <p className="text-sm text-ink">{r.tipoRepuesto}</p>
              <p className="text-xs text-ink-dim">
                {r.fecha} · {r.km.toLocaleString('es-ES')} km ·{' '}
                <span className="text-stamp">{r.precio.toFixed(2)} €</span> · {r.tienda}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => setEditing(r)} className="btn-ghost px-2 py-1 text-xs">
                Editar
              </button>
              <button onClick={() => handleDelete(r)} className="btn-ghost px-2 py-1 text-xs">
                Eliminar
              </button>
            </div>
          </li>
        ))}
        {repuestos.length === 0 && <p className="text-sm text-ink-dim">Sin repuestos registrados.</p>}
      </ul>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Editar repuesto">
        {editing && (
          <RepuestoForm
            initialValues={editing}
            submitting={editSubmitting}
            error={editError}
            submitLabel="Guardar cambios"
            onSubmit={handleEditSubmit}
          />
        )}
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd app && npx tsc -b`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/tabs/RepuestosTab.tsx
git commit -m "Add edit/delete to RepuestosTab, extract reusable form"
```

---

### Task 6: Editar/borrar en `ItvTab` + añadir `update` al cliente API

**Files:**
- Modify: `app/src/lib/api.ts`
- Modify: `app/src/components/tabs/ItvTab.tsx`

**Interfaces:**
- Consumes: `Modal` de Task 1.
- Produces: `api.itv.update(id: string, data: Partial<Pick<Itv, 'fechaRealizada' | 'resultado'>>): Promise<Itv>` — nuevo método en el cliente API.

- [ ] **Step 1: Añadir `update` al cliente API de ITV**

En `app/src/lib/api.ts`, dentro de `itv: {`, entre `create` y `remove`, añade:

```ts
    update: (id: string, data: Partial<Pick<Itv, 'fechaRealizada' | 'resultado'>>) =>
      request<Itv>(`/itv/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
```

- [ ] **Step 2: Extraer el formulario y añadir edición/borrado en `ItvTab`**

Reemplaza todo el contenido de `app/src/components/tabs/ItvTab.tsx` por:

```tsx
import { useState, type FormEvent } from 'react'
import type { Itv, ItvResultado } from '@shared/types'
import { api } from '../../lib/api'
import { Modal } from '../Modal'

interface ItvFormValues {
  fechaRealizada: string
  resultado: ItvResultado
}

function ItvForm({
  initialValues,
  submitting,
  error,
  submitLabel,
  onSubmit,
}: {
  initialValues?: ItvFormValues
  submitting: boolean
  error: string | null
  submitLabel: string
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-3">
      <input
        name="fechaRealizada"
        type="date"
        required
        defaultValue={initialValues?.fechaRealizada}
        className="input"
      />
      <select
        name="resultado"
        required
        className="input"
        defaultValue={initialValues?.resultado ?? 'Favorable'}
      >
        <option value="Favorable">Favorable</option>
        <option value="Desfavorable">Desfavorable</option>
        <option value="Negativo">Negativo</option>
      </select>
      {error && <p className="text-sm text-red-700 sm:col-span-3">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary sm:col-span-3">
        {submitting ? 'Guardando…' : submitLabel}
      </button>
    </form>
  )
}

export function ItvTab({
  vehiculoId,
  itvs,
  reload,
}: {
  vehiculoId: string
  itvs: Itv[]
  reload: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState<Itv | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      await api.itv.create({
        vehiculoId,
        fechaRealizada: String(form.get('fechaRealizada')),
        resultado: form.get('resultado') as ItvResultado,
      })
      e.currentTarget.reset()
      reload()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    const form = new FormData(e.currentTarget)
    setEditSubmitting(true)
    setEditError(null)
    try {
      await api.itv.update(editing.id, {
        fechaRealizada: String(form.get('fechaRealizada')),
        resultado: form.get('resultado') as ItvResultado,
      })
      setEditing(null)
      reload()
    } catch (err) {
      setEditError((err as Error).message)
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleDelete(i: Itv) {
    if (!confirm('¿Borrar esta ITV?')) return
    await api.itv.remove(i.id)
    reload()
  }

  const ordenadas = [...itvs].sort((a, b) => b.fechaRealizada.localeCompare(a.fechaRealizada))

  return (
    <div>
      <div className="panel mb-4 p-4">
        <ItvForm
          submitting={submitting}
          error={error}
          submitLabel="Registrar ITV pasada"
          onSubmit={handleSubmit}
        />
      </div>

      <ul className="space-y-2">
        {ordenadas.map((i) => (
          <li key={i.id} className="entry flex items-start justify-between gap-3 p-3">
            <div>
              <p className="text-sm text-ink">
                Resultado: <span className="font-medium text-ink-bright">{i.resultado}</span>
              </p>
              <p className="text-xs text-ink-dim">
                Realizada el {i.fechaRealizada} · Próxima el{' '}
                <span className="font-medium text-stamp">
                  {new Date(i.fechaProxima).toLocaleDateString('es-ES')}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => setEditing(i)} className="btn-ghost px-2 py-1 text-xs">
                Editar
              </button>
              <button onClick={() => handleDelete(i)} className="btn-ghost px-2 py-1 text-xs">
                Eliminar
              </button>
            </div>
          </li>
        ))}
        {ordenadas.length === 0 && (
          <p className="text-sm text-ink-dim">
            Aún no hay ITV registrada — se calculará la primera fecha según la
            antigüedad del vehículo.
          </p>
        )}
      </ul>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Editar ITV">
        {editing && (
          <ItvForm
            initialValues={editing}
            submitting={editSubmitting}
            error={editError}
            submitLabel="Guardar cambios"
            onSubmit={handleEditSubmit}
          />
        )}
      </Modal>
    </div>
  )
}
```

**Nota:** editar una ITV no recalcula `fechaProxima` (el PATCH del backend solo actualiza los campos enviados) — es una limitación conocida y aceptable, coherente con que `shared/itv-rules.ts` ya es una aproximación.

- [ ] **Step 3: Verificar tipos**

Run: `cd app && npx tsc -b`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add app/src/lib/api.ts app/src/components/tabs/ItvTab.tsx
git commit -m "Add edit/delete to ItvTab, add itv.update to API client"
```

---

### Task 7: Regla de rate limiting por IP en Cloudflare (manual, con el usuario)

**Files:** ninguno — configuración en el dashboard de Cloudflare.

**Interfaces:** N/A.

- [ ] **Step 1: Crear la regla**

En el dashboard de Cloudflare, dominio/proyecto del sitio `carlog-4x2.pages.dev`: **Security → WAF → Rate limiting rules → Create rule**.
- Nombre: `Carlog login rate limit`
- Condición: `URI Path` `contains` `/api/auth/request-code` **OR** `contains` `/api/auth/verify-code`
- Umbral: más de **10** peticiones en **5 minutos**, por IP de origen
- Acción: **Block** durante **1 hora**

- [ ] **Step 2: Verificación manual**

Hacer más de 10 peticiones seguidas a `/api/auth/request-code` desde la misma IP (p. ej. con `curl` en bucle) y comprobar que a partir de la 11ª Cloudflare responde con un bloqueo (normalmente HTTP 429 con la página de Cloudflare), no con la respuesta normal de la app.

- [ ] **Step 3: Nada que comitear** — es una regla del dashboard, no vive en el repo. (Opcional: documentarla en `README.md` bajo la sección de Cloudflare Access/login si se quiere dejar constancia — no obligatorio para este plan.)

---

### Task 8: Editar la información del Vehículo

**Files:**
- Modify: `app/src/pages/VehiculoDetailPage.tsx`

**Interfaces:**
- Consumes: `Modal` de Task 1; `api.vehiculos.update(id: string, data: Partial<Omit<Vehiculo, 'id' | 'propietarioEmail'>>): Promise<Vehiculo>` (ya existe en `app/src/lib/api.ts`); `reload` que ya expone `useCollection`.

- [ ] **Step 1: Reemplazar todo el contenido del archivo**

```tsx
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useCollection } from '../hooks/useCollection'
import { AveriasTab } from '../components/tabs/AveriasTab'
import { MantenimientosTab } from '../components/tabs/MantenimientosTab'
import { RepuestosTab } from '../components/tabs/RepuestosTab'
import { ItvTab } from '../components/tabs/ItvTab'
import { Modal } from '../components/Modal'
import type { Vehiculo, VehiculoTipo } from '@shared/types'

const TABS = ['Averías', 'Mantenimientos', 'Repuestos', 'ITV'] as const
type Tab = (typeof TABS)[number]

const TIPOS: VehiculoTipo[] = ['Turismo', 'Moto', 'Furgoneta']

export function VehiculoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const routeId = id!
  const [tab, setTab] = useState<Tab>('Averías')

  const { data: vehiculos, reload: reloadVehiculos } = useCollection(api.vehiculos.list)
  const { data: averias, reload: reloadAverias } = useCollection(api.averias.list)
  const { data: mantenimientos, reload: reloadMantenimientos } = useCollection(api.mantenimientos.list)
  const { data: repuestos, reload: reloadRepuestos } = useCollection(api.repuestos.list)
  const { data: itvs, reload: reloadItv } = useCollection(api.itv.list)

  const vehiculo = vehiculos.find((v) => v.id === routeId)
  // Averias/Mantenimientos/Repuestos/ITV enlazan por matrícula (texto), no
  // por el id de registro de Airtable — ver shared/types.ts.
  const matricula = vehiculo?.matricula ?? ''

  const [editing, setEditing] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  async function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!vehiculo) return
    const form = new FormData(e.currentTarget)
    setEditSubmitting(true)
    setEditError(null)
    try {
      await api.vehiculos.update(vehiculo.id, {
        marca: String(form.get('marca')),
        modelo: String(form.get('modelo')),
        matricula: String(form.get('matricula')),
        anio: Number(form.get('anio')),
        tipo: form.get('tipo') as VehiculoTipo,
        kmActual: Number(form.get('kmActual')),
      })
      setEditing(false)
      reloadVehiculos()
    } catch (err) {
      setEditError((err as Error).message)
    } finally {
      setEditSubmitting(false)
    }
  }

  return (
    <div>
      <Link to="/" className="mb-3 inline-block text-sm text-ink-dim hover:text-stamp">
        ← Volver a vehículos
      </Link>

      {vehiculo && (
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="heading mb-1 text-2xl">
              {vehiculo.marca} {vehiculo.modelo}
            </h1>
            <p className="text-sm text-ink-dim">
              {vehiculo.matricula} · {vehiculo.anio} · {vehiculo.tipo} ·{' '}
              <span className="text-stamp">{vehiculo.kmActual.toLocaleString('es-ES')} km</span>
            </p>
          </div>
          <button onClick={() => setEditing(true)} className="btn-ghost shrink-0">
            Editar vehículo
          </button>
        </div>
      )}

      <div className="mb-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium transition ${
              tab === t
                ? 'border-b-2 border-stamp text-stamp'
                : 'text-ink-dim hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Averías' && (
        <AveriasTab
          vehiculoId={matricula}
          averias={averias.filter((a) => a.vehiculoId === matricula)}
          reload={reloadAverias}
        />
      )}
      {tab === 'Mantenimientos' && (
        <MantenimientosTab
          vehiculoId={matricula}
          mantenimientos={mantenimientos.filter((m) => m.vehiculoId === matricula)}
          reload={reloadMantenimientos}
        />
      )}
      {tab === 'Repuestos' && (
        <RepuestosTab
          vehiculoId={matricula}
          repuestos={repuestos.filter((r) => r.vehiculoId === matricula)}
          reload={reloadRepuestos}
        />
      )}
      {tab === 'ITV' && (
        <ItvTab
          vehiculoId={matricula}
          itvs={itvs.filter((i) => i.vehiculoId === matricula)}
          reload={reloadItv}
        />
      )}

      <Modal open={editing} onClose={() => setEditing(false)} title="Editar vehículo">
        {vehiculo && (
          <form onSubmit={handleEditSubmit} className="grid gap-2 sm:grid-cols-2">
            <input name="marca" required defaultValue={vehiculo.marca} placeholder="Marca" className="input" />
            <input name="modelo" required defaultValue={vehiculo.modelo} placeholder="Modelo" className="input" />
            <input
              name="matricula"
              required
              defaultValue={vehiculo.matricula}
              placeholder="Matrícula"
              className="input"
            />
            <input
              name="anio"
              required
              type="number"
              defaultValue={vehiculo.anio}
              placeholder="Año"
              className="input"
            />
            <select name="tipo" required defaultValue={vehiculo.tipo} className="input">
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              name="kmActual"
              required
              type="number"
              defaultValue={vehiculo.kmActual}
              placeholder="Km actual"
              className="input"
            />
            {editError && <p className="text-sm text-red-700 sm:col-span-2">{editError}</p>}
            <button type="submit" disabled={editSubmitting} className="btn-primary sm:col-span-2">
              {editSubmitting ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  )
}
```

**Nota:** cambiar la matrícula de un vehículo aquí **no** actualiza el campo
`Vehiculo` (texto) de sus Averias/Mantenimientos/Repuestos/ITV ya
existentes — quedarían huérfanos, igual que si se editase a mano en
Airtable. Es una limitación conocida y aceptable (el spec no cubre
renombrar matrículas); si el usuario cambia la matrícula, lo hará sabiendo
que es principalmente para corregir un error tipográfico recién cometido,
no para "cambiar" el vehículo.

- [ ] **Step 2: Verificar tipos**

Run: `cd app && npx tsc -b`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/src/pages/VehiculoDetailPage.tsx
git commit -m "Add vehicle info editing to VehiculoDetailPage"
```

---

## Self-Review

- **Cobertura del spec**: Task 1 (Modal) + Tasks 3-6 (edición/borrado en las 4 pestañas) cubren la sección A completa. Task 2 (rate limit por email) + Task 7 (rate limit por IP) cubren la sección B completa. La sección "Intentos de acertar el código" ya estaba implementada — no requiere tarea. Task 8 (editar Vehículo) cubre la ampliación de alcance pedida por el usuario tras aprobar el plan original.
- **Placeholders**: ninguno — todo el código de cada paso es el código final a pegar.
- **Consistencia de tipos**: `api.itv.update` se añade en Task 6 con la misma forma que `api.averias.update`/`api.mantenimientos.update`/`api.repuestos.update` ya existentes. `MantenimientoForm`/`RepuestoForm`/`ItvForm` siguen el mismo patrón (`initialValues?`, `submitting`, `error`, `submitLabel`, `onSubmit`) en las tres tareas donde se introducen.
