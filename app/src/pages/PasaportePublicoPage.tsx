import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PasaporteTab } from '../components/tabs/PasaporteTab'
import { calcularProximasTareas } from '@shared/alerts'
import type { Averia, Itv, Mantenimiento, Parte, Repuesto, Seguro, Vehiculo } from '@shared/types'

interface PasaportePublico {
  vehiculo: Omit<Vehiculo, 'id' | 'propietarioEmail'>
  averias: Averia[]
  mantenimientos: Mantenimiento[]
  repuestos: Repuesto[]
  itvs: Itv[]
  seguros: Seguro[]
  partes: Parte[]
}

/**
 * Vista pública del pasaporte, para quien recibe un enlace compartido. No
 * requiere sesión y por eso vive fuera de AuthGate.
 */
export function PasaportePublicoPage() {
  const { token } = useParams<{ token: string }>()
  const [datos, setDatos] = useState<PasaportePublico | null>(null)
  // `culpaDelEnlace` distingue "el enlace ya no sirve" de "el servidor ha
  // fallado": en el segundo caso pedir un enlace nuevo no arregla nada.
  const [error, setError] = useState<{ mensaje: string; culpaDelEnlace: boolean } | null>(null)

  useEffect(() => {
    fetch(`/api/publico/pasaporte?token=${encodeURIComponent(token ?? '')}`)
      .then(async (res) => {
        // Si algo va mal en el servidor la respuesta puede no ser JSON (una
        // página de error). Sin esto, el visitante veía el error crudo del
        // parser en vez de un mensaje entendible.
        const texto = await res.text()
        let body: { error?: string } & Partial<PasaportePublico>
        try {
          body = JSON.parse(texto)
        } catch {
          setError({
            mensaje: 'No se pudo cargar el historial. Inténtalo de nuevo en un momento.',
            culpaDelEnlace: false,
          })
          return
        }
        if (!res.ok) {
          setError({
            mensaje: body.error ?? 'No se pudo abrir el enlace',
            culpaDelEnlace: res.status === 400 || res.status === 404,
          })
          return
        }
        setDatos(body as PasaportePublico)
      })
      .catch(() =>
        setError({
          mensaje: 'No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.',
          culpaDelEnlace: false,
        }),
      )
  }, [token])

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-paper-2">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-4">
          <svg viewBox="0 0 57 64" className="h-7 w-7 shrink-0" aria-hidden="true">
            <path
              d="M 48.1 45.5 A 21 21 0 1 1 48.1 18.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={9}
              strokeLinecap="round"
              className="text-ink-bright"
            />
            <g transform="translate(48.1,45.5)">
              <path d="M -9 3 L -7 -1 L -3 -3 L 3 -3 L 6 0 L 9 3 L 9 5 L -9 5 Z" className="fill-stamp" />
            </g>
          </svg>
          <span className="font-display text-lg font-semibold text-ink-bright">
            Car<em className="text-stamp not-italic">log</em>
          </span>
          <span className="ml-auto text-xs text-ink-dim">Historial compartido</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {error && (
          <div className="panel p-6 text-center">
            <p className="font-display text-lg text-ink-bright">{error.mensaje}</p>
            {error.culpaDelEnlace && (
              <p className="mt-1 text-sm text-ink-dim">
                Pide a quien te lo envió que genere un enlace nuevo.
              </p>
            )}
          </div>
        )}

        {!error && !datos && <p className="text-sm text-ink-dim">Cargando…</p>}

        {datos && (
          <>
            <div className="dark-hero mb-6 px-5 py-4">
              <h1 className="font-display mb-1 text-2xl font-semibold">
                {datos.vehiculo.marca} {datos.vehiculo.modelo}
              </h1>
              <p className="text-sm text-[#b6a98f]">
                {datos.vehiculo.matricula} · {datos.vehiculo.anio} · {datos.vehiculo.tipo} ·{' '}
                <span className="font-medium text-[#e2624f]">
                  {datos.vehiculo.kmActual.toLocaleString('es-ES')} km
                </span>
              </p>
            </div>

            <PasaporteTab
              vehiculo={{ ...datos.vehiculo, id: '', propietarioEmail: '' }}
              averias={datos.averias}
              mantenimientos={datos.mantenimientos}
              repuestos={datos.repuestos}
              itvs={datos.itvs}
              seguros={datos.seguros}
              partes={datos.partes}
              proximasTareas={calcularProximasTareas(
                new Date(),
                { ...datos.vehiculo, id: '', propietarioEmail: '' },
                datos.mantenimientos,
                datos.itvs,
              )}
            />

            <p className="mt-8 border-t border-line pt-4 text-center text-xs text-ink-dim">
              Historial mantenido en Carlog por el propietario del vehículo. Este enlace es de solo
              lectura y caduca.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
