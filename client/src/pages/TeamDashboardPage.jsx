import { useEffect, useState } from 'react'
import { ActionDialog } from '../components/ActionDialog'
import { MemberFields } from '../components/MemberFields'
import { PageShell } from '../components/PageShell'
import {
  changeTeamPassword,
  clearTeamSession,
  getTeamMe,
  getTeamProfile,
  getTeamToken,
  previewTeamCustomIdeaFile,
  recallTeamProfileUpdateRequest,
  submitTeamCustomProjectIdeaRequest,
  submitTeamProfileUpdateRequest,
  uploadTeamCustomIdeaFile
} from '../services/api'

const TABS = [
  { key: 'profile', label: 'Team Profile' },
  { key: 'idea', label: 'New Project Idea' },
  { key: 'update', label: 'Student Details Change' },
  { key: 'password', label: 'Change Password' }
]

const initialPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
}

const initialIdeaDraft = {
  title: '',
  description: '',
  difficulty: 'Medium',
  domain: '',
  technologies: ''
}

const fallbackMembers = [
  { name: '', usn: '', email: '' },
  { name: '', usn: '', email: '' }
]

const normalizeTechnologies = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const buildProfileDraft = (team) => ({
  teamName: team?.teamName || '',
  leadName: team?.leadName || '',
  leadEmail: team?.leadEmail || '',
  leadUsn: team?.leadUsn || '',
  leadPhone: team?.leadPhone || '',
  college: team?.college || '',
  department: team?.department || '',
  requestNote: ''
})

export function TeamDashboardPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [team, setTeam] = useState(getTeamProfile())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [passwordForm, setPasswordForm] = useState(initialPasswordForm)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')

  const [profileDraft, setProfileDraft] = useState(buildProfileDraft(getTeamProfile()))
  const [profileMembers, setProfileMembers] = useState(getTeamProfile()?.members || fallbackMembers)
  const [profileRequestLoading, setProfileRequestLoading] = useState(false)
  const [profileRequestError, setProfileRequestError] = useState('')
  const [profileRequestMessage, setProfileRequestMessage] = useState('')
  const [showRecallDialog, setShowRecallDialog] = useState(false)

  const [ideaDraft, setIdeaDraft] = useState(initialIdeaDraft)
  const [ideaRequestLoading, setIdeaRequestLoading] = useState(false)
  const [ideaRequestError, setIdeaRequestError] = useState('')
  const [ideaRequestMessage, setIdeaRequestMessage] = useState('')

  const [ideaFile, setIdeaFile] = useState(null)
  const [ideaUploadLoading, setIdeaUploadLoading] = useState(false)
  const [ideaUploadError, setIdeaUploadError] = useState('')
  const [ideaUploadMessage, setIdeaUploadMessage] = useState('')
  const [ideaPreview, setIdeaPreview] = useState(null)

  useEffect(() => {
    const token = getTeamToken()

    const load = async () => {
      if (!token) {
        setLoading(false)
        setError('Your team session expired. Please login again.')
        return
      }

      try {
        const response = await getTeamMe(token)
        setTeam(response.team)

        const source = response.team.profileUpdateRequest?.status === 'pending'
          ? response.team.profileUpdateRequest?.payload
          : response.team

        setProfileDraft(buildProfileDraft(source))
        setProfileMembers((source?.members || response.team.members || fallbackMembers).map((member) => ({
          name: member.name || '',
          usn: member.usn || '',
          email: member.email || ''
        })))
      } catch {
        clearTeamSession()
        setError('Your team session expired. Please login again.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const updatePasswordField = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateProfileDraftField = (field, value) => {
    setProfileDraft((prev) => ({ ...prev, [field]: value }))
  }

  const updateIdeaDraftField = (field, value) => {
    setIdeaDraft((prev) => ({ ...prev, [field]: value }))
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

  const handleSubmitIdeaRequest = async (event) => {
    event.preventDefault()
    setIdeaRequestLoading(true)
    setIdeaRequestError('')
    setIdeaRequestMessage('')

    try {
      const result = await submitTeamCustomProjectIdeaRequest({
        title: ideaDraft.title,
        description: ideaDraft.description,
        difficulty: ideaDraft.difficulty,
        domain: ideaDraft.domain,
        technologies: normalizeTechnologies(ideaDraft.technologies)
      })

      setTeam(result.team)
      setIdeaDraft(initialIdeaDraft)
      setIdeaRequestMessage(result.message || 'Custom project idea submitted for admin approval')
    } catch (requestError) {
      setIdeaRequestError(requestError.response?.data?.message || 'Failed to submit custom project idea')
    } finally {
      setIdeaRequestLoading(false)
    }
  }

  const handleIdeaFilePreview = async () => {
    if (!ideaFile) {
      setIdeaUploadError('Select an Excel or PDF file first')
      return
    }

    setIdeaUploadLoading(true)
    setIdeaUploadError('')
    setIdeaUploadMessage('')

    try {
      const data = await previewTeamCustomIdeaFile(ideaFile)
      setIdeaPreview(data)
      setIdeaUploadMessage('Preview generated. Verify details and submit.')
    } catch (requestError) {
      setIdeaPreview(null)
      setIdeaUploadError(requestError.response?.data?.message || 'Preview failed')
    } finally {
      setIdeaUploadLoading(false)
    }
  }

  const handleIdeaFileUpload = async () => {
    if (!ideaFile) {
      setIdeaUploadError('Select an Excel or PDF file first')
      return
    }

    setIdeaUploadLoading(true)
    setIdeaUploadError('')
    setIdeaUploadMessage('')

    try {
      const data = await uploadTeamCustomIdeaFile(ideaFile)
      setTeam(data.team)
      setIdeaFile(null)
      setIdeaPreview(null)
      setIdeaUploadMessage(data.message || 'Custom project idea submitted for admin approval')
    } catch (requestError) {
      setIdeaUploadError(requestError.response?.data?.message || 'Upload failed')
    } finally {
      setIdeaUploadLoading(false)
    }
  }

  const pendingProfileRequest = team?.profileUpdateRequest?.status === 'pending'

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
        <header className="rounded-2xl border border-white/20 bg-white/10 p-5">
          <h1 className="text-2xl font-black text-white md:text-3xl">Team Dashboard</h1>
          <p className="mt-2 text-sm text-cyan-100">
            Team {team.teamNumber} - {team.teamName}
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                activeTab === tab.key
                  ? 'bg-cyan-400 text-slate-900'
                  : 'border border-white/30 bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'profile' ? (
          <div className="rounded-2xl border border-white/20 bg-white/10 p-6 text-slate-100">
            <h2 className="text-xl font-black">Assigned Project</h2>
            {team.assignedProject?.title ? (
              <div className="mt-3 space-y-2 text-sm text-cyan-50">
                <p><strong>Title:</strong> {team.assignedProject.title}</p>
                <p><strong>Description:</strong> {team.assignedProject.description || '-'}</p>
                <p><strong>Difficulty:</strong> {team.assignedProject.difficulty || '-'}</p>
                <p><strong>Domain:</strong> {team.assignedProject.domain || '-'}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-cyan-100">Project not assigned yet.</p>
            )}
          </div>
        ) : null}

        {activeTab === 'idea' ? (
          <div className="space-y-6">
            <form onSubmit={handleSubmitIdeaRequest} className="rounded-2xl border border-white/20 bg-white/10 p-6">
              <h2 className="text-xl font-black text-white">Submit Idea Manually</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input
                  required
                  value={ideaDraft.title}
                  onChange={(event) => updateIdeaDraftField('title', event.target.value)}
                  placeholder="Idea title"
                  className="rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100"
                />
                <input
                  required
                  value={ideaDraft.domain}
                  onChange={(event) => updateIdeaDraftField('domain', event.target.value)}
                  placeholder="Domain"
                  className="rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100"
                />
                <select
                  value={ideaDraft.difficulty}
                  onChange={(event) => updateIdeaDraftField('difficulty', event.target.value)}
                  className="rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
                <input
                  required
                  value={ideaDraft.technologies}
                  onChange={(event) => updateIdeaDraftField('technologies', event.target.value)}
                  placeholder="React, Node.js, MongoDB"
                  className="rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100"
                />
              </div>
              <textarea
                required
                rows={4}
                value={ideaDraft.description}
                onChange={(event) => updateIdeaDraftField('description', event.target.value)}
                placeholder="Idea description"
                className="mt-4 w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100"
              />

              {ideaRequestError ? (
                <div className="mt-3 rounded-lg border border-rose-300/40 bg-rose-900/30 px-3 py-2 text-sm text-rose-100">
                  {ideaRequestError}
                </div>
              ) : null}

              {ideaRequestMessage ? (
                <div className="mt-3 rounded-lg border border-emerald-300/40 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-100">
                  {ideaRequestMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={ideaRequestLoading}
                className="mt-4 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-black text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {ideaRequestLoading ? 'Submitting...' : 'Submit Manual Idea'}
              </button>
            </form>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-6">
              <h2 className="text-xl font-black text-white">Upload Idea File (Individual)</h2>
              <p className="mt-2 text-sm text-cyan-100">Upload one Excel/PDF file, preview, then submit.</p>

              <input
                type="file"
                accept=".xlsx,.xls,.pdf"
                onChange={(event) => setIdeaFile(event.target.files?.[0] || null)}
                className="mt-4 block w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleIdeaFilePreview}
                  disabled={ideaUploadLoading || !ideaFile}
                  className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {ideaUploadLoading ? 'Working...' : 'Preview File'}
                </button>
                <button
                  type="button"
                  onClick={handleIdeaFileUpload}
                  disabled={ideaUploadLoading || !ideaFile}
                  className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-black text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {ideaUploadLoading ? 'Uploading...' : 'Submit File Idea'}
                </button>
              </div>

              {ideaUploadError ? (
                <div className="mt-3 rounded-lg border border-rose-300/40 bg-rose-900/30 px-3 py-2 text-sm text-rose-100">
                  {ideaUploadError}
                </div>
              ) : null}

              {ideaUploadMessage ? (
                <div className="mt-3 rounded-lg border border-cyan-300/40 bg-cyan-900/30 px-3 py-2 text-sm text-cyan-100">
                  {ideaUploadMessage}
                </div>
              ) : null}

              {ideaPreview ? (
                <div className="mt-4 rounded-xl border border-white/20 bg-black/20 p-4 text-sm text-cyan-50">
                  <p><strong>Title:</strong> {ideaPreview.title || '-'}</p>
                  <p><strong>Description:</strong> {ideaPreview.description || '-'}</p>
                  <p><strong>Difficulty:</strong> {ideaPreview.difficulty || '-'}</p>
                  <p><strong>Domain:</strong> {ideaPreview.domain || '-'}</p>
                  <p>
                    <strong>Technologies:</strong>{' '}
                    {Array.isArray(ideaPreview.technologies)
                      ? ideaPreview.technologies.join(', ')
                      : ideaPreview.technologies || '-'}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === 'update' ? (
          <form onSubmit={handleSubmitProfileRequest} className="rounded-2xl border border-white/20 bg-white/10 p-6">
            <h2 className="text-xl font-black text-white">Request Student Details Update</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input
                required
                value={profileDraft.teamName}
                onChange={(event) => updateProfileDraftField('teamName', event.target.value)}
                placeholder="Team Name"
                className="rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100"
              />
              <input
                required
                value={profileDraft.leadName}
                onChange={(event) => updateProfileDraftField('leadName', event.target.value)}
                placeholder="Lead Name"
                className="rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100"
              />
              <input
                required
                type="email"
                value={profileDraft.leadEmail}
                onChange={(event) => updateProfileDraftField('leadEmail', event.target.value)}
                placeholder="Lead Email"
                className="rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100"
              />
              <input
                required
                value={profileDraft.leadUsn}
                onChange={(event) => updateProfileDraftField('leadUsn', event.target.value)}
                placeholder="Lead USN"
                className="rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100"
              />
              <input
                required
                value={profileDraft.leadPhone}
                onChange={(event) => updateProfileDraftField('leadPhone', event.target.value)}
                placeholder="Lead Phone"
                className="rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100"
              />
              <input
                required
                value={profileDraft.department}
                onChange={(event) => updateProfileDraftField('department', event.target.value)}
                placeholder="Department"
                className="rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100"
              />
            </div>

            <div className="mt-4">
              <input
                required
                value={profileDraft.college}
                onChange={(event) => updateProfileDraftField('college', event.target.value)}
                placeholder="College"
                className="w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100"
              />
            </div>

            <div className="mt-4">
              <MemberFields members={profileMembers} setMembers={setProfileMembers} />
            </div>

            <textarea
              rows={3}
              value={profileDraft.requestNote}
              onChange={(event) => updateProfileDraftField('requestNote', event.target.value)}
              placeholder="Reason for update (optional)"
              className="mt-4 w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100"
            />

            {profileRequestError ? (
              <div className="mt-3 rounded-lg border border-rose-300/40 bg-rose-900/30 px-3 py-2 text-sm text-rose-100">
                {profileRequestError}
              </div>
            ) : null}

            {profileRequestMessage ? (
              <div className="mt-3 rounded-lg border border-emerald-300/40 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-100">
                {profileRequestMessage}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={profileRequestLoading || pendingProfileRequest}
                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-black text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {profileRequestLoading ? 'Submitting...' : pendingProfileRequest ? 'Request Pending' : 'Submit Update Request'}
              </button>

              {pendingProfileRequest ? (
                <button
                  type="button"
                  onClick={() => setShowRecallDialog(true)}
                  className="rounded-lg border border-rose-300/50 bg-rose-900/30 px-4 py-2 text-sm font-semibold text-rose-100"
                >
                  Recall Pending Request
                </button>
              ) : null}
            </div>
          </form>
        ) : null}

        {activeTab === 'password' ? (
          <form onSubmit={handleChangePassword} className="rounded-2xl border border-white/20 bg-white/10 p-6">
            <h2 className="text-xl font-black text-white">Change Password</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <input
                required
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
                placeholder="Current Password"
                className="rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100"
              />
              <input
                required
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => updatePasswordField('newPassword', event.target.value)}
                placeholder="New Password"
                className="rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100"
              />
              <input
                required
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
                placeholder="Confirm Password"
                className="rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100"
              />
            </div>

            {passwordError ? (
              <div className="mt-3 rounded-lg border border-rose-300/40 bg-rose-900/30 px-3 py-2 text-sm text-rose-100">
                {passwordError}
              </div>
            ) : null}

            {passwordMessage ? (
              <div className="mt-3 rounded-lg border border-emerald-300/40 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-100">
                {passwordMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={passwordLoading}
              className="mt-4 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-black text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        ) : null}
      </section>

      <ActionDialog
        isOpen={showRecallDialog}
        title="Recall Update Request"
        message="Do you want to recall the pending profile update request?"
        confirmLabel="Recall Request"
        confirmTone="rose"
        loading={profileRequestLoading}
        onConfirm={handleRecallProfileRequest}
        onCancel={() => setShowRecallDialog(false)}
      />
    </PageShell>
  )
}

export default TeamDashboardPage
