import { useEffect, useState } from 'react'
import { forceResetTeamPassword, getTeamPasswordActivity } from '../services/api'
import { formatDateTime } from '../utils/date'
import { ActionDialog } from './ActionDialog'

export function AdminPasswordSecurityPanel() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [workingTeamId, setWorkingTeamId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [confirmTeam, setConfirmTeam] = useState(null)

  const loadActivity = async ({ showLoader = false } = {}) => {
    if (showLoader) {
      setLoading(true)
    }

    try {
      const response = await getTeamPasswordActivity()
      setTeams(response.teams || [])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load password reset activity')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActivity({ showLoader: true })
  }, [])

  const handleForceReset = async (team) => {
    setConfirmTeam(team)
  }

  const runForceReset = async () => {
    if (!confirmTeam) {
      return
    }

    setWorkingTeamId(confirmTeam.id)
    setError('')
    setMessage('')

    try {
      const response = await forceResetTeamPassword(confirmTeam.id)
      setMessage(response.message || 'Team password reset to default successfully')
      await loadActivity()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to force reset team password')
    } finally {
      setWorkingTeamId('')
      setConfirmTeam(null)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-white/20 bg-black/20 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Password Security Control</h2>
          <p className="mt-1 text-sm text-cyan-100/90">
            Review reset activity and force-reset passwords to default when needed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadActivity({ showLoader: true })}
          className="rounded-lg border border-cyan-200/60 bg-cyan-100/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-100/20"
        >
          Refresh Activity
        </button>
      </div>

      {message ? (
        <div className="mt-4 rounded-lg border border-emerald-300/40 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-100">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-lg border border-rose-300/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-5 rounded-lg border border-white/15 bg-white/5 px-4 py-4 text-sm text-cyan-100">
          Loading password activity...
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border border-white/15">
          <table className="min-w-full divide-y divide-white/15 text-left text-sm text-cyan-50">
            <thead className="bg-white/10 text-xs uppercase tracking-wide text-cyan-100">
              <tr>
                <th className="px-3 py-3">Team</th>
                <th className="px-3 py-3">Password State</th>
                <th className="px-3 py-3">OTP Activity</th>
                <th className="px-3 py-3">Reset Activity</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-black/10">
              {teams.map((team) => (
                <tr key={team.id} className="align-top">
                  <td className="px-3 py-3">
                    <div className="font-semibold text-white">{team.teamNumber}</div>
                    <div>{team.teamName}</div>
                    <div className="text-xs text-cyan-100/80">{team.leadEmail}</div>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <div>{team.isDefaultPassword ? 'Default' : 'Custom'}</div>
                    <div>Changed: {formatDateTime(team.passwordChangedAt)}</div>
                    <div>
                      Active OTP: {team.passwordResetState?.hasActiveOtp ? 'Yes' : 'No'}
                    </div>
                    <div>OTP Expiry: {formatDateTime(team.passwordResetState?.otpExpiresAt)}</div>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <div>Requests: {team.securityActivity?.otpRequestCount || 0}</div>
                    <div>Last Request: {formatDateTime(team.securityActivity?.lastOtpRequestedAt)}</div>
                    <div>Verified: {team.securityActivity?.otpVerifySuccessCount || 0}</div>
                    <div>Last Verify: {formatDateTime(team.securityActivity?.lastOtpVerifiedAt)}</div>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <div>Resets: {team.securityActivity?.passwordResetCount || 0}</div>
                    <div>Last Reset: {formatDateTime(team.securityActivity?.lastPasswordResetAt)}</div>
                    <div>Admin Force: {team.securityActivity?.adminForceResetCount || 0}</div>
                    <div>
                      Last Admin Reset: {formatDateTime(team.securityActivity?.lastPasswordResetByAdminAt)}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      disabled={workingTeamId === team.id}
                      onClick={() => handleForceReset(team)}
                      className="rounded-md bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {workingTeamId === team.id ? 'Resetting...' : 'Force Reset'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ActionDialog
        isOpen={Boolean(confirmTeam)}
        title="Force Reset Team Password"
        message={confirmTeam ? `Force reset password for ${confirmTeam.teamName}?` : ''}
        confirmLabel="Force Reset"
        confirmTone="amber"
        loading={Boolean(workingTeamId)}
        onCancel={() => setConfirmTeam(null)}
        onConfirm={runForceReset}
      />
    </section>
  )
}