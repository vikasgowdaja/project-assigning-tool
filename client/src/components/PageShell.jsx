import { Link, NavLink } from 'react-router-dom'
import { clearAdminToken, getAdminToken } from '../services/api'

const navClassName = ({ isActive }) =>
  `rounded-full px-4 py-2 text-sm font-semibold transition ${
    isActive
      ? 'bg-white text-slate-900'
      : 'bg-white/10 text-white hover:bg-white/20'
  }`

export function PageShell({ children }) {
  const isAdminLoggedIn = Boolean(getAdminToken())

  const onLogout = () => {
    clearAdminToken()
    window.location.assign('/admin/login')
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#0ea5e9_0%,_#0369a1_40%,_#0f172a_80%)] pb-12 text-slate-100">
      <header className="border-b border-white/20 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <Link to="/" className="text-lg font-bold tracking-wide text-white">
            Innovation Project Allocation Portal
          </Link>
          <nav className="flex items-center gap-2">
            <NavLink to="/register" className={navClassName}>
              Register
            </NavLink>
            <NavLink to="/dashboard" className={navClassName}>
              Dashboard
            </NavLink>
            <NavLink to={isAdminLoggedIn ? '/admin/teams' : '/admin/login'} className={navClassName}>
              Admin
            </NavLink>
            {isAdminLoggedIn && (
              <button
                type="button"
                onClick={onLogout}
                className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400"
              >
                Logout
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pt-8 md:px-8 md:pt-10">
        {children}
      </main>
    </div>
  )
}
