import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import {
  getTeamToken,
  loginTeam,
  requestTeamPasswordResetOtp,
  resetTeamPassword,
  verifyTeamPasswordResetOtp
} from '../services/api'

export function TeamLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const teamToken = getTeamToken()

  const redirectTo = location.state?.from || '/team/dashboard'

  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginMessage, setLoginMessage] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [resetStep, setResetStep] = useState('request')
  const [resetEmail, setResetEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [resetForm, setResetForm] = useState({ newPassword: '', confirmPassword: '' })
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetMessage, setResetMessage] = useState('')

  if (teamToken) {
    return <Navigate to="/team/dashboard" replace />
  }

  const updateResetForm = (field, value) => {
    setResetForm((prev) => ({ ...prev, [field]: value }))
  }

  const onLoginSubmit = async (event) => {
    event.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    setLoginMessage('')

    try {
      const result = await loginTeam({ username, password })
      setLoginMessage(result.message || 'Login successful')
      navigate(redirectTo, { replace: true })
    } catch (requestError) {
      setLoginError(requestError.response?.data?.message || 'Login failed')
    } finally {
      setLoginLoading(false)
    }
  }

  const onRequestOtp = async (event) => {
    event.preventDefault()
    setResetLoading(true)
    setResetError('')
    setResetMessage('')

    try {
      const result = await requestTeamPasswordResetOtp({ email: resetEmail })
      setResetStep('verify')
      setResetMessage(result.message || 'OTP sent successfully')
    } catch (requestError) {
      setResetError(requestError.response?.data?.message || 'Failed to send OTP')
    } finally {
      setResetLoading(false)
    }
  }

  const onVerifyOtp = async (event) => {
    event.preventDefault()
    setResetLoading(true)
    setResetError('')
    setResetMessage('')

    try {
      const result = await verifyTeamPasswordResetOtp({ email: resetEmail, otp })
      setResetToken(result.resetToken)
      setResetStep('reset')
      setResetMessage(result.message || 'OTP verified successfully')
    } catch (requestError) {
      setResetError(requestError.response?.data?.message || 'OTP verification failed')
    } finally {
      setResetLoading(false)
    }
  }

  const onResetPassword = async (event) => {
    event.preventDefault()
    setResetLoading(true)
    setResetError('')
    setResetMessage('')

    try {
      const result = await resetTeamPassword({
        email: resetEmail,
        resetToken,
        newPassword: resetForm.newPassword,
        confirmPassword: resetForm.confirmPassword
      })
      setMode('login')
      setResetStep('request')
      setOtp('')
      setResetToken('')
      setResetForm({ newPassword: '', confirmPassword: '' })
      setLoginMessage(result.message || 'Password reset successful')
      setLoginError('')
      setPassword('')
      setUsername('')
      setResetMessage('')
    } catch (requestError) {
      setResetError(requestError.response?.data?.message || 'Password reset failed')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <PageShell>
      <section className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-white/25 bg-white/10 p-6 shadow-2xl backdrop-blur-xl md:p-8">
          <p className="inline-flex rounded-full border border-cyan-300/40 bg-cyan-200/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-cyan-100">
            Team Access
          </p>
          <h1 className="mt-3 text-3xl font-black text-white md:text-4xl">
            Team Login & Password Reset
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-cyan-50/90 md:text-base">
            Username is your team name. Default password is your team lead USN in lowercase. Change the default password after your first login.
          </p>

          <div className="mt-6 inline-flex rounded-full border border-white/20 bg-black/20 p-1 text-sm">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setResetError('')
                setResetMessage('')
              }}
              className={`rounded-full px-4 py-2 font-semibold transition ${
                mode === 'login' ? 'bg-cyan-300 text-slate-900' : 'text-cyan-100 hover:bg-white/10'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('forgot')
                setLoginError('')
                setLoginMessage('')
              }}
              className={`rounded-full px-4 py-2 font-semibold transition ${
                mode === 'forgot' ? 'bg-cyan-300 text-slate-900' : 'text-cyan-100 hover:bg-white/10'
              }`}
            >
              Forgot Password
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={onLoginSubmit} className="mt-6 space-y-4">
              {loginError ? (
                <div className="rounded-lg border border-rose-300/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-100">
                  {loginError}
                </div>
              ) : null}
              {loginMessage ? (
                <div className="rounded-lg border border-emerald-300/40 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-100">
                  {loginMessage}
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-100">
                  Username
                </label>
                <input
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  className="w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100 placeholder:text-slate-300/70"
                  placeholder="Enter team name"
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
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100 placeholder:text-slate-300/70"
                  placeholder="Enter password"
                />
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-cyan-100/80">Use your team credentials to manage access securely.</span>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="font-semibold text-cyan-200 underline decoration-cyan-300/60 underline-offset-4"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-black uppercase tracking-wide text-slate-900 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-cyan-900 disabled:text-cyan-200"
              >
                {loginLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <div className="mt-6 space-y-4">
              {resetError ? (
                <div className="rounded-lg border border-rose-300/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-100">
                  {resetError}
                </div>
              ) : null}
              {resetMessage ? (
                <div className="rounded-lg border border-emerald-300/40 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-100">
                  {resetMessage}
                </div>
              ) : null}

              {resetStep === 'request' ? (
                <form onSubmit={onRequestOtp} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-100">
                      Registered Email ID
                    </label>
                    <input
                      required
                      type="email"
                      value={resetEmail}
                      onChange={(event) => setResetEmail(event.target.value)}
                      autoComplete="email"
                      className="w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100 placeholder:text-slate-300/70"
                      placeholder="Enter team lead email"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-black uppercase tracking-wide text-slate-900 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-cyan-900 disabled:text-cyan-200"
                  >
                    {resetLoading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </form>
              ) : null}

              {resetStep === 'verify' ? (
                <form onSubmit={onVerifyOtp} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-100">
                      OTP
                    </label>
                    <input
                      required
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100 placeholder:text-slate-300/70"
                      placeholder="Enter 6-digit OTP"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="flex-1 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-black uppercase tracking-wide text-slate-900 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-cyan-900 disabled:text-cyan-200"
                    >
                      {resetLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                    <button
                      type="button"
                      disabled={resetLoading}
                      onClick={() => onRequestOtp({ preventDefault() {} })}
                      className="rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Resend OTP
                    </button>
                  </div>
                </form>
              ) : null}

              {resetStep === 'reset' ? (
                <form onSubmit={onResetPassword} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-100">
                      New Password
                    </label>
                    <input
                      required
                      type="password"
                      value={resetForm.newPassword}
                      onChange={(event) => updateResetForm('newPassword', event.target.value)}
                      className="w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100 placeholder:text-slate-300/70"
                      placeholder="Minimum 8 characters"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-100">
                      Confirm New Password
                    </label>
                    <input
                      required
                      type="password"
                      value={resetForm.confirmPassword}
                      onChange={(event) => updateResetForm('confirmPassword', event.target.value)}
                      className="w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100 placeholder:text-slate-300/70"
                      placeholder="Re-enter new password"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-black uppercase tracking-wide text-slate-900 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-cyan-900 disabled:text-cyan-200"
                  >
                    {resetLoading ? 'Updating Password...' : 'Set New Password'}
                  </button>
                </form>
              ) : null}
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-white/25 bg-white/10 p-6 shadow-2xl backdrop-blur-xl md:p-8">
            <h2 className="text-2xl font-black text-white">Secure Access Rules</h2>
            <ul className="mt-4 space-y-3 text-sm text-cyan-50/90">
              <li>Default password uses the team lead USN in lowercase.</li>
              <li>OTP expires in 5 minutes and resend attempts are limited.</li>
              <li>New passwords cannot reuse the current or recently used passwords.</li>
              <li>Registered team lead email is required for OTP verification.</li>
            </ul>
          </div>
        </aside>
      </section>
    </PageShell>
  )
}