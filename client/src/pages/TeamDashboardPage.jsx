import { useEffect, useState } from 'react'
import { ActionDialog } from '../components/ActionDialog'
import { PageShell } from '../components/PageShell'
import { MemberFields } from '../components/MemberFields'
import {
  changeTeamPassword,
  clearTeamSession,
  getTeamMe,
  getTeamProfile,
  getTeamToken,
  recallTeamProfileUpdateRequest,
  submitTeamProfileUpdateRequest
} from '../services/api'
import { formatDateTime } from '../utils/date'

const initialPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
}

const buildProfileDraft = (sourceTeam) => ({
  teamName: sourceTeam?.teamName || '',
  leadName: sourceTeam?.leadName || '',
  leadEmail: sourceTeam?.leadEmail || '',
  leadUsn: sourceTeam?.leadUsn || '',
  leadPhone: sourceTeam?.leadPhone || '',
  college: sourceTeam?.college || '',
  department: sourceTeam?.department || '',
  requestNote: sourceTeam?.requestNote || ''
})

export function TeamDashboardPage() {
  const [team, setTeam] = useState(getTeamProfile())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [profileDraft, setProfileDraft] = useState(buildProfileDraft(getTeamProfile()))
  const [profileMembers, setProfileMembers] = useState(getTeamProfile()?.members || [
    { name: '', usn: '', email: '' },
    { name: '', usn: '', email: '' }
  ])
  const [profileRequestLoading, setProfileRequestLoading] = useState(false)
  const [profileRequestError, setProfileRequestError] = useState('')
  const [profileRequestMessage, setProfileRequestMessage] = useState('')
  const [showRecallDialog, setShowRecallDialog] = useState(false)

  useEffect(() => {
    const token = getTeamToken()

    const load = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const response = await getTeamMe(token)
        setTeam(response.team)
      } catch {
        clearTeamSession()
        setError('Your team session expired. Please login again.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  useEffect(() => {
    if (!team) {
      return
    }

    const source = team.profileUpdateRequest?.status === 'pending'
      ? team.profileUpdateRequest?.payload
      : team

    setProfileDraft(buildProfileDraft(source))
    setProfileMembers((source?.members || team.members || [
      { name: '', usn: '', email: '' },
      { name: '', usn: '', email: '' }
    ]).map((member) => ({
      name: member.name || '',
      usn: member.usn || '',
      email: member.email || ''
    })))
  }, [team])

  const updatePasswordField = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateProfileDraftField = (field, value) => {
    setProfileDraft((prev) => ({ ...prev, [field]: value }))
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    setPasswordLoading(true)
    setPasswordError('')
    setPasswordMessage('')

    try {
      const result = await changeTeamPassword(passwordForm)
      setTeam(result.team)
      setPasswordForm(initialPasswordForm)
      setPasswordMessage(result.message || 'Password updated successfully')
    } catch (requestError) {
      setPasswordError(requestError.response?.data?.message || 'Failed to update password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleSubmitProfileRequest = async (event) => {
    event.preventDefault()
    setProfileRequestLoading(true)
    setProfileRequestError('')
    setProfileRequestMessage('')

    try {
      const result = await submitTeamProfileUpdateRequest({
        ...profileDraft,
        members: profileMembers
      })
      setTeam(result.team)
      setProfileRequestMessage(result.message || 'Profile update request submitted for admin approval')
    } catch (requestError) {
      setProfileRequestError(requestError.response?.data?.message || 'Failed to submit update request')
    } finally {
      setProfileRequestLoading(false)
    }
  }

  const handleRecallProfileRequest = async () => {
    setProfileRequestLoading(true)
    setProfileRequestError('')
    setProfileRequestMessage('')

    try {
      const result = await recallTeamProfileUpdateRequest()
      setTeam(result.team)
      setProfileRequestMessage(result.message || 'Profile update request recalled')
    } catch (requestError) {
      setProfileRequestError(requestError.response?.data?.message || 'Failed to recall request')
    } finally {
      setProfileRequestLoading(false)
      setShowRecallDialog(false)
    }
  }

  if (loading) {
    return (
      <PageShell>
        <div className="rounded-2xl border border-white/20 bg-black/20 p-6 text-cyan-100">
          Loading team dashboard...
        </div>
      </PageShell>
    )
  }

  if (error || !team) {
    return (
      <PageShell>
        <div className="rounded-2xl border border-rose-300/30 bg-rose-900/30 p-6 text-rose-100">
          {error || 'Unable to load team session. Please login again.'}
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <section className="space-y-6">
        <div className="rounded-3xl border border-white/25 bg-white/10 p-6 shadow-2xl backdrop-blur-xl md:p-8">
          <p className="inline-flex rounded-full border border-cyan-300/40 bg-cyan-200/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-cyan-100">
            Team Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-black text-white md:text-4xl">
            {team.teamNumber} | {team.teamName}
          </h1>
          <p className="mt-2 text-sm text-cyan-50/90 md:text-base">
            Manage your account security and monitor your team assignment details.
          </p>

          {team.isDefaultPassword ? (
            <div className="mt-4 rounded-lg border border-amber-300/40 bg-amber-900/30 px-4 py-3 text-sm text-amber-100">
              You are still using the default password. Please change it now.
            </div>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/20 bg-black/20 p-5">
            <h2 className="text-xl font-black text-white">Team Profile</h2>
            <ul className="mt-3 space-y-2 text-sm text-cyan-50/90">
              <li>Lead Name: {team.leadName}</li>
              <li>Lead Email: {team.leadEmail}</li>
              <li>Lead USN: {team.leadUsn}</li>
              <li>Lead Phone: {team.leadPhone}</li>
              <li>College: {team.college}</li>
              <li>Department: {team.department}</li>
              <li>Password Changed At: {formatDateTime(team.passwordChangedAt)}</li>
            </ul>
            <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-3 text-xs text-cyan-100/90">
              <p className="font-semibold uppercase tracking-wider text-cyan-100">Members</p>
              <ul className="mt-2 space-y-1">
                {(team.members || []).map((member) => (
                  <li key={`${member.usn}-${member.email}`}>
                    {member.name} - {member.usn}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-white/20 bg-black/20 p-5">
            <h2 className="text-xl font-black text-white">Project Status</h2>
            {team.assignedProject?.title ? (
              <>
                <h3 className="mt-3 text-lg font-bold text-cyan-100">{team.assignedProject.title}</h3>
                <p className="mt-2 text-sm text-cyan-50/90">{team.assignedProject.description}</p>
                <p className="mt-3 text-xs text-cyan-100/90">
                  {team.assignedProject.domain} | {team.assignedProject.difficulty}
                </p>
                <p className="mt-1 text-xs text-cyan-100/80">
                  Assigned At: {formatDateTime(team.assignedAt)}
                </p>
              </>
            ) : team.customProjectIdea?.title ? (
              <>
                <h3 className="mt-3 text-lg font-bold text-amber-100">{team.customProjectIdea.title}</h3>
                <p className="mt-2 text-sm text-cyan-50/90">{team.customProjectIdea.description}</p>
                <p className="mt-3 text-xs text-cyan-100/90">
                  {team.customProjectIdea.domain} | {team.customProjectIdea.difficulty}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-amber-200">
                  Status: {team.customProjectIdea.status || 'pending'}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-cyan-100/90">Project is not assigned yet.</p>
            )}

            <div className="mt-5 rounded-xl border border-white/15 bg-white/5 p-3 text-xs text-cyan-100/90">
              <p className="font-semibold uppercase tracking-wider text-cyan-100">Security Activity</p>
              <ul className="mt-2 space-y-1">
                <li>OTP Requests: {team.securityActivity?.otpRequestCount || 0}</li>
                <li>Last OTP Request: {formatDateTime(team.securityActivity?.lastOtpRequestedAt)}</li>
                <li>OTP Verifications: {team.securityActivity?.otpVerifySuccessCount || 0}</li>
                <li>Password Resets: {team.securityActivity?.passwordResetCount || 0}</li>
                <li>Last Password Reset: {formatDateTime(team.securityActivity?.lastPasswordResetAt)}</li>
              </ul>
            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-white/20 bg-black/20 p-6">
          <h2 className="text-2xl font-black text-white">Student Details Change Request</h2>
          <p className="mt-2 text-sm text-cyan-100/90">
            Team lead can request edits to student/member details. Admin approval is required before changes are applied.
          </p>

          {profileRequestError ? (
            <div className="mt-4 rounded-lg border border-rose-300/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-100">
              {profileRequestError}
            </div>
          ) : null}

          {profileRequestMessage ? (
            <div className="mt-4 rounded-lg border border-emerald-300/40 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-100">
              {profileRequestMessage}
            </div>
          ) : null}

          <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-cyan-100/90">
            <div>Status: <span className="font-semibold uppercase">{team.profileUpdateRequest?.status || 'none'}</span></div>
            <div>Requested At: {formatDateTime(team.profileUpdateRequest?.requestedAt)}</div>
            <div>Reviewed At: {formatDateTime(team.profileUpdateRequest?.reviewedAt)}</div>
            <div>Review Note: {team.profileUpdateRequest?.reviewNote || '-'}</div>
          </div>

          <form onSubmit={handleSubmitProfileRequest} className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ['teamName', 'Team Name'],
                ['leadName', 'Team Lead Name'],
                ['leadEmail', 'Team Lead Email'],
                ['leadUsn', 'Team Lead USN'],
                ['leadPhone', 'Team Lead Phone'],
                ['college', 'College Name'],
                ['department', 'Department']
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-100">
                    {label}
                  </label>
                  <input
                    required
                    type={key.includes('Email') ? 'email' : 'text'}
                    autoComplete={key === 'leadEmail' ? 'email' : 'off'}
                    autoCapitalize={key === 'leadUsn' ? 'characters' : 'none'}
                    value={profileDraft[key] || ''}
                    onChange={(event) => updateProfileDraftField(key, event.target.value)}
                    className="w-full rounded-lg border border-white/25 bg-slate-900 px-3 py-2 text-slate-100"
                  />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-100">
                  Request Note For Admin (Optional)
                </label>
                <textarea
                  rows={3}
                  value={profileDraft.requestNote || ''}
                  onChange={(event) => updateProfileDraftField('requestNote', event.target.value)}
                  className="w-full rounded-lg border border-white/25 bg-slate-900 px-3 py-2 text-slate-100"
                  placeholder="Explain why changes are needed"
                />
              </div>
            </div>

            <MemberFields members={profileMembers} setMembers={setProfileMembers} />

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={profileRequestLoading || team.profileUpdateRequest?.status === 'pending'}
                className="rounded-lg bg-indigo-400 px-4 py-2.5 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {profileRequestLoading ? 'Submitting...' : team.profileUpdateRequest?.status === 'pending' ? 'Request Pending Approval' : 'Submit Change Request'}
              </button>

              {team.profileUpdateRequest?.status === 'pending' ? (
                <button
                  type="button"
                  disabled={profileRequestLoading}
                  onClick={() => setShowRecallDialog(true)}
                  className="rounded-lg border border-amber-300/40 bg-amber-900/30 px-4 py-2.5 text-sm font-bold text-amber-100 transition hover:bg-amber-800/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Recall Pending Request
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-white/20 bg-black/20 p-6">
          <h2 className="text-2xl font-black text-white">Change Password</h2>
          {passwordError ? (
            <div className="mt-4 rounded-lg border border-rose-300/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-100">
              {passwordError}
            </div>
          ) : null}
          {passwordMessage ? (
            <div className="mt-4 rounded-lg border border-emerald-300/40 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-100">
              {passwordMessage}
            </div>
          ) : null}

          <form onSubmit={handleChangePassword} className="mt-5 grid gap-4 md:grid-cols-3">
            <input
              required
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
              className="rounded-lg border border-white/25 bg-slate-900 px-3 py-2 text-slate-100"
              placeholder="Current password"
            />
            <input
              required
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => updatePasswordField('newPassword', event.target.value)}
              className="rounded-lg border border-white/25 bg-slate-900 px-3 py-2 text-slate-100"
              placeholder="New password"
            />
            <input
              required
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
              className="rounded-lg border border-white/25 bg-slate-900 px-3 py-2 text-slate-100"
              placeholder="Confirm new password"
            />

            <button
              type="submit"
              disabled={passwordLoading}
              className="md:col-span-3 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-black uppercase tracking-wide text-slate-900 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-cyan-900 disabled:text-cyan-200"
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </section>

        <ActionDialog
          isOpen={showRecallDialog}
          title="Recall Profile Update Request"
          message="Recall the pending profile update request?"
          confirmLabel="Recall Request"
          confirmTone="amber"
          loading={profileRequestLoading}
          onCancel={() => setShowRecallDialog(false)}
          onConfirm={handleRecallProfileRequest}
        />
      </section>
    </PageShell>
  )
}