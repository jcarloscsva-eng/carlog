import { Link, NavLink, Outlet } from 'react-router-dom'
import { api } from '../lib/api'
import { useCollection } from '../hooks/useCollection'
import { NotificationsButton } from './NotificationsButton'
import { useAuth } from './AuthGate'
import { IconGarage, IconReportes, IconUsers } from './Icons'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link flex items-center gap-1.5 ${isActive ? 'active' : ''}`

export function Layout() {
  const { email, isAdmin, logout, showKmReminder, dismissKmReminder } = useAuth()
  const { data: vehiculos } = useCollection(api.vehiculos.list)

  // Si solo hay un vehículo, el aviso lleva directo a su edición con el
  // km enfocado; con varios, lleva al garaje para elegir cuál tocar.
  const kmReminderHref =
    vehiculos.length === 1 ? `/vehiculos/${vehiculos[0].id}?editarKm=1` : '/'

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="font-display text-xl font-semibold text-ink-bright">
            Car<em className="text-stamp italic">log</em>
          </span>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={linkClass} aria-label="Vehículos">
              <IconGarage className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Vehículos</span>
            </NavLink>
            <NavLink to="/reportes" className={linkClass} aria-label="Reportes">
              <IconReportes className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Reportes</span>
            </NavLink>
            {isAdmin && (
              <NavLink to="/usuarios" className={linkClass} aria-label="Usuarios">
                <IconUsers className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Usuarios</span>
              </NavLink>
            )}
            <NotificationsButton />
            <span className="ml-2 hidden text-xs text-ink-dim sm:inline">{email}</span>
            <button onClick={logout} className="nav-link">
              Salir
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        {showKmReminder && (
          <div className="entry mb-6 flex items-start justify-between gap-3 p-3">
            <p className="text-sm text-ink">
              📏 ¿Tienes a mano el cuentakilómetros? Actualiza el kilometraje de tus
              vehículos para que las alertas de mantenimiento e ITV no se despisten. —{' '}
              <Link
                to={kmReminderHref}
                onClick={dismissKmReminder}
                className="font-medium text-stamp hover:underline"
              >
                Actualizar ahora
              </Link>
            </p>
            <button
              onClick={dismissKmReminder}
              className="shrink-0 text-ink-dim hover:text-stamp"
              aria-label="Descartar aviso"
            >
              ✕
            </button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
