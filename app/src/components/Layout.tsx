import { NavLink, Outlet } from 'react-router-dom'
import { NotificationsButton } from './NotificationsButton'
import { useAuth } from './AuthGate'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`

export function Layout() {
  const { email, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold text-slate-900">🚗 Carlog</span>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>
              Vehículos
            </NavLink>
            <NavLink to="/reportes" className={linkClass}>
              Reportes
            </NavLink>
            <NotificationsButton />
            <span className="ml-2 hidden text-xs text-slate-400 sm:inline">{email}</span>
            <button
              onClick={logout}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Salir
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
