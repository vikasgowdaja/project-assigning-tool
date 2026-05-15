import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { loginAdmin } from '../services/api'

export function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  const redirectTo = location.state?.from || '/admin/teams'

  const onSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await loginAdmin({ username, password })
      navigate(redirectTo, { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-md rounded-3xl border border-white/25 bg-white/10 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        <h1 className="text-3xl font-black text-white">Admin Login</h1>
        <p className="mt-2 text-sm text-cyan-50/90">
          Authenticate as admin to manage teams and project assignments.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-300/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-100">
              Username
            </label>
            <input
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100 placeholder:text-slate-300/70"
              placeholder="Enter admin username"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-100">
              Password
            </label>
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100 placeholder:text-slate-300/70"
              placeholder="Enter admin password"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-black uppercase tracking-wide text-slate-900 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-cyan-900 disabled:text-cyan-200"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </section>
    </PageShell>
  )
}
