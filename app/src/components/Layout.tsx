import { NavLink, Outlet } from 'react-router-dom'
import { NotificationsButton } from './NotificationsButton'
import { useAuth } from './AuthGate'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link ${isActive ? 'active' : ''}`

export function Layout() {
  const { email, logout } = useAuth()

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
            <NotificationsButton />
            <span className="ml-2 hidden text-xs text-ink-dim sm:inline">{email}</span>
            <button onClick={logout} className="nav-link">
              Salir
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
