import { NavLink, Outlet } from 'react-router-dom'
import { NotificationsButton } from './NotificationsButton'
import { useAuth } from './AuthGate'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link ${isActive ? 'active' : ''}`

export function Layout() {
  const { email, isAdmin, logout, showKmReminder, dismissKmReminder } = useAuth()

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="font-display text-xl font-semibold text-ink-bright">
            Car<em className="text-stamp italic">log</em>
          </span>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>
              Vehículos
            </NavLink>
            <NavLink to="/reportes" className={linkClass}>
              Reportes
            </NavLink>
            {isAdmin && (
              <NavLink to="/usuarios" className={linkClass}>
                Usuarios
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
              vehículos para que las alertas de mantenimiento e ITV no se despisten.
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
