import { useEffect, useState } from 'react'
import {
  deleteTeam,
  getAdminTeams,
  getProjects,
  getRegistrationMigrationSummary,
  reviewTeamRegistrationRequest,
  runRegistrationMigration,
  reviewTeamCustomProjectIdea,
  reviewTeamProfileUpdateRequest,
  updateTeam
} from '../services/api'
import AdminEditTeamModal from '../components/AdminEditTeamModal'
import { AdminProjectsManager } from '../components/AdminProjectsManager'
import { AdminPasswordSecurityPanel } from '../components/AdminPasswordSecurityPanel'
import { PageShell } from '../components/PageShell'
import { ActionDialog } from '../components/ActionDialog'

const PAGE_SIZE = 8
const FLOW_TABS = {
  approval: 'approval',
  edit: 'edit',
  revoke: 'revoke',
  projects: 'projects',
  security: 'security',
  migration: 'migration'
}

const MIGRATION_MODES = [
  { value: 'missing-only', label: 'Missing Status Only' },
  { value: 'pending-with-assigned', label: 'Pending + Assigned Project' },
  { value: 'pending-all', label: 'All Pending Records' }
]

const REGISTRATION_STATUS_ENUM = [
  { value: 'approved', label: 'approved' },
  { value: 'pending', label: 'pending' },
  { value: 'rejected', label: 'rejected' }
]

const MIGRATION_NOTE_TEMPLATES = [
  { value: 'Admin bulk migration', label: 'Admin bulk migration' },
  { value: 'Legacy records backfill', label: 'Legacy records backfill' },
  { value: 'Schema compatibility migration', label: 'Schema compatibility migration' }
]

const formatMembersForDiff = (members = []) => {
  return (members || [])
    .map((member) => `${member.name || ''} (${member.usn || ''})`)
    .join(', ')
}

const getProfileDiffItems = (team) => {
  const requested = team.profileUpdateRequest?.payload || {}
  const items = [
    { label: 'Team Name', current: team.teamName, requested: requested.teamName },
    { label: 'Lead Name', current: team.leadName, requested: requested.leadName },
    { label: 'Lead Email', current: team.leadEmail, requested: requested.leadEmail },
    { label: 'Lead USN', current: team.leadUsn, requested: requested.leadUsn },
    { label: 'Lead Phone', current: team.leadPhone, requested: requested.leadPhone },
    { label: 'College', current: team.college, requested: requested.college },
    { label: 'Department', current: team.department, requested: requested.department },
    {
      label: 'Members',
      current: formatMembersForDiff(team.members),
      requested: formatMembersForDiff(requested.members)
    }
  ]

  return items.filter((item) => {
    const currentValue = String(item.current || '').trim()
    const requestedValue = String(item.requested || '').trim()
    return requestedValue && currentValue !== requestedValue
  })
}

const paginate = (items = [], page = 1, pageSize = PAGE_SIZE) => {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const start = (safePage - 1) * pageSize

  return {
    rows: items.slice(start, start + pageSize),
    safePage,
    totalPages
  }
}

const getDuplicateWarnings = (team, allTeams = []) => {
  const normalizedTeamName = String(team.teamName || '').trim().toLowerCase()
  const normalizedLeadEmail = String(team.leadEmail || '').trim().toLowerCase()
  const normalizedLeadUsn = String(team.leadUsn || '').trim().toUpperCase()

  const warnings = []

  const sameTeamName = allTeams.filter((item) =>
    item._id !== team._id && String(item.teamName || '').trim().toLowerCase() === normalizedTeamName
  )
  if (sameTeamName.length > 0) {
    warnings.push('Duplicate team name')
  }

  const sameLeadEmail = allTeams.filter((item) =>
    item._id !== team._id && String(item.leadEmail || '').trim().toLowerCase() === normalizedLeadEmail
  )
  if (sameLeadEmail.length > 0) {
    warnings.push('Duplicate lead email')
  }

  const sameLeadUsn = allTeams.filter((item) =>
    item._id !== team._id && String(item.leadUsn || '').trim().toUpperCase() === normalizedLeadUsn
  )
  if (sameLeadUsn.length > 0) {
    warnings.push('Duplicate lead USN')
  }

  return warnings
}

function PaginationControls({ page, totalPages, onChange }) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-xs text-cyan-100/90">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
        className="rounded border border-white/20 bg-white/10 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Prev
      </button>
      <span>
        Page {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        className="rounded border border-white/20 bg-white/10 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  )
}

const AdminTeamsPage = () => {
  const [teams, setTeams] = useState([])
  const [projects, setProjects] = useState([])
  const [editingTeam, setEditingTeam] = useState(null)
  const [reviewingTeamId, setReviewingTeamId] = useState('')
  const [deletingTeamId, setDeletingTeamId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [approvalPage, setApprovalPage] = useState(1)
  const [ideaApprovalPage, setIdeaApprovalPage] = useState(1)
  const [editPage, setEditPage] = useState(1)
  const [revokePage, setRevokePage] = useState(1)
  const [activeFlow, setActiveFlow] = useState(FLOW_TABS.approval)
  const [dialogLoading, setDialogLoading] = useState(false)
  const [reviewingIdeaTeamId, setReviewingIdeaTeamId] = useState('')
  const [reviewingRegistrationTeamId, setReviewingRegistrationTeamId] = useState('')
  const [migrationSummary, setMigrationSummary] = useState(null)
  const [migrationLoading, setMigrationLoading] = useState(false)
  const [migrationMessage, setMigrationMessage] = useState('')
  const [showMigrationWizard, setShowMigrationWizard] = useState(false)
  const [migrationConfig, setMigrationConfig] = useState({
    mode: 'missing-only',
    targetStatus: 'approved',
    reviewNote: 'Admin bulk migration'
  })
  const [dialogConfig, setDialogConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    noteLabel: '',
    notePlaceholder: '',
    requireNote: false,
    confirmLabel: 'Confirm',
    confirmTone: 'cyan',
    onConfirm: null
  })

  const fetchTeams = async ({ showLoader = false } = {}) => {
    if (showLoader) {
      setLoading(true)
    }

    try {
      const data = await getAdminTeams()
      setTeams(data)
    } catch {
      setError('Failed to fetch teams')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const data = await getProjects()
      setProjects(data)
    } catch {
      setError('Failed to fetch projects')
    }
  }

  const refreshAdminData = async () => {
    await Promise.all([fetchTeams({ showLoader: true }), fetchProjects()])
  }

  const fetchMigrationSummary = async () => {
    try {
      const data = await getRegistrationMigrationSummary()
      setMigrationSummary(data)
    } catch {
      setError('Failed to fetch migration summary')
    }
  }

  useEffect(() => {
    let cancelled = false

    const loadInitialData = async () => {
      try {
        const [teamData, projectData, migrationData] = await Promise.all([
          getAdminTeams(),
          getProjects(),
          getRegistrationMigrationSummary()
        ])
        if (cancelled) return
        setTeams(teamData)
        setProjects(projectData)
        setMigrationSummary(migrationData)
      } catch {
        if (cancelled) return
        setError('Failed to fetch admin data')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadInitialData()

    return () => {
      cancelled = true
    }
  }, [])

  const handleEdit = (team) => {
    setEditingTeam(team)
  }

  const handleEditSave = async (updatedFields) => {
    setLoading(true)
    setError('')
    try {
      await updateTeam(editingTeam._id, updatedFields)
      setEditingTeam(null)
      await fetchTeams()
    } catch {
      setError('Failed to update team')
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    const team = teams.find((entry) => entry._id === id)
    if (!team) {
      return
    }

    setDialogConfig({
      isOpen: true,
      title: 'Revoke Team Registration',
      message: `Delete team ${team.teamName} (${team.teamNumber})? This action cannot be undone.`,
      noteLabel: '',
      notePlaceholder: '',
      requireNote: false,
      confirmLabel: 'Delete Team',
      confirmTone: 'rose',
      onConfirm: async () => {
        setDeletingTeamId(team._id)
        setError('')

        try {
          await deleteTeam(team._id)
          await fetchTeams()
        } catch (requestError) {
          setError(requestError.response?.data?.message || 'Failed to delete team')
        } finally {
          setDeletingTeamId('')
        }
      }
    })
  }

  const handleReviewProfileRequest = async (team, action) => {
    const isApprove = action === 'approve'

    setDialogConfig({
      isOpen: true,
      title: isApprove ? 'Approve Profile Update Request' : 'Reject Profile Update Request',
      message: isApprove
        ? `Approve profile update request for ${team.teamName}?`
        : `Reject profile update request for ${team.teamName}?`,
      noteLabel: isApprove ? 'Approval Note (Optional)' : 'Rejection Reason (Optional)',
      notePlaceholder: 'Add context for the team lead',
      requireNote: false,
      confirmLabel: isApprove ? 'Approve' : 'Reject',
      confirmTone: isApprove ? 'emerald' : 'rose',
      onConfirm: async (reviewNote) => {
        setReviewingTeamId(team._id)
        setError('')

        try {
          await reviewTeamProfileUpdateRequest(team._id, {
            action,
            reviewNote: reviewNote || ''
          })
          await fetchTeams()
        } catch (requestError) {
          setError(requestError.response?.data?.message || 'Failed to review profile update request')
        } finally {
          setReviewingTeamId('')
        }
      }
    })
  }

  const handleReviewCustomIdeaRequest = async (team, action) => {
    const isApprove = action === 'approve'

    setDialogConfig({
      isOpen: true,
      title: isApprove ? 'Approve Custom Project Idea' : 'Reject Custom Project Idea',
      message: isApprove
        ? `Approve custom idea for ${team.teamName}?`
        : `Reject custom idea for ${team.teamName} and assign random project?`,
      noteLabel: '',
      notePlaceholder: '',
      requireNote: false,
      confirmLabel: isApprove ? 'Approve Idea' : 'Reject Idea',
      confirmTone: isApprove ? 'emerald' : 'rose',
      onConfirm: async () => {
        setReviewingIdeaTeamId(team._id)
        setError('')

        try {
          await reviewTeamCustomProjectIdea(team._id, { action })
          await Promise.all([fetchTeams(), fetchProjects()])
        } catch (requestError) {
          setError(requestError.response?.data?.message || 'Failed to review custom project idea')
        } finally {
          setReviewingIdeaTeamId('')
        }
      }
    })
  }

  const handleReviewRegistrationRequest = async (team, action) => {
    const isApprove = action === 'approve'

    setDialogConfig({
      isOpen: true,
      title: isApprove ? 'Approve Team Registration' : 'Reject Team Registration',
      message: isApprove
        ? `Approve registration for ${team.teamName}?`
        : `Reject registration for ${team.teamName}?`,
      noteLabel: isApprove ? 'Approval Note (Optional)' : 'Rejection Reason (Optional)',
      notePlaceholder: 'Add context for this registration review',
      requireNote: false,
      confirmLabel: isApprove ? 'Approve Registration' : 'Reject Registration',
      confirmTone: isApprove ? 'emerald' : 'rose',
      onConfirm: async (reviewNote) => {
        setReviewingRegistrationTeamId(team._id)
        setError('')

        try {
          await reviewTeamRegistrationRequest(team._id, {
            action,
            reviewNote: reviewNote || ''
          })
          await fetchTeams()
        } catch (requestError) {
          setError(requestError.response?.data?.message || 'Failed to review team registration')
        } finally {
          setReviewingRegistrationTeamId('')
        }
      }
    })
  }

  const handleRunMigration = async (config) => {
    setMigrationLoading(true)
    setMigrationMessage('')
    setError('')

    try {
      const response = await runRegistrationMigration(config)
      setMigrationMessage(
        `${response.message}. Mode: ${response.mode}, Status: ${response.targetStatus}. Matched: ${response.matchedCount}, Updated: ${response.modifiedCount}`
      )
      await Promise.all([fetchTeams(), fetchMigrationSummary()])
      setShowMigrationWizard(false)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Migration failed')
    } finally {
      setMigrationLoading(false)
    }
  }

  const updateMigrationConfig = (field, value) => {
    setMigrationConfig((prev) => ({ ...prev, [field]: value }))
  }

  const closeDialog = () => {
    if (dialogLoading) {
      return
    }

    setDialogConfig((prev) => ({
      ...prev,
      isOpen: false
    }))
  }

  const handleDialogConfirm = async (note) => {
    if (!dialogConfig.onConfirm) {
      return
    }

    setDialogLoading(true)
    try {
      await dialogConfig.onConfirm(note)
      setDialogConfig((prev) => ({
        ...prev,
        isOpen: false
      }))
    } finally {
      setDialogLoading(false)
    }
  }

  const registrationApprovalTeams = teams.filter((team) => team.registrationStatus === 'pending')
  const approvalTeams = teams.filter((team) => team.registrationStatus === 'approved' && team.profileUpdateRequest?.status === 'pending')
  const ideaApprovalTeams = teams.filter((team) => {
    const customIdea = team.customProjectIdea || {}
    return team.registrationStatus === 'approved' && Boolean(customIdea.title) && customIdea.status === 'pending'
  })
  const editableTeams = teams.filter((team) => team.registrationStatus === 'approved')
  const revokableTeams = teams

  const approvalPagination = paginate(approvalTeams, approvalPage)
  const ideaApprovalPagination = paginate(ideaApprovalTeams, ideaApprovalPage)
  const editPagination = paginate(editableTeams, editPage)
  const revokePagination = paginate(revokableTeams, revokePage)
  const totalApprovalPending = registrationApprovalTeams.length + approvalTeams.length + ideaApprovalTeams.length

  return (
    <PageShell>
      <section className="rounded-3xl border border-white/25 bg-white/10 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-white md:text-4xl">Admin Team Management</h1>
            <p className="mt-2 text-sm text-cyan-50/90 md:text-base">
              Edit team details and member records without creating duplicate entries.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              fetchTeams({ showLoader: true })
              fetchProjects()
            }}
            className="rounded-lg border border-cyan-200/60 bg-cyan-100/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-100/20"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-300/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 rounded-xl border border-white/20 bg-black/20 px-4 py-5 text-cyan-100">
            Loading teams...
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-white/20 bg-black/20 p-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
                <button
                  type="button"
                  onClick={() => setActiveFlow(FLOW_TABS.approval)}
                  className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                    activeFlow === FLOW_TABS.approval
                      ? 'bg-indigo-400 text-slate-950'
                      : 'border border-indigo-300/40 bg-indigo-900/30 text-indigo-100 hover:bg-indigo-800/40'
                  }`}
                >
                  Approval ({totalApprovalPending})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFlow(FLOW_TABS.edit)}
                  className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                    activeFlow === FLOW_TABS.edit
                      ? 'bg-cyan-400 text-slate-950'
                      : 'border border-cyan-300/40 bg-cyan-900/30 text-cyan-100 hover:bg-cyan-800/40'
                  }`}
                >
                  Edit ({editableTeams.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFlow(FLOW_TABS.revoke)}
                  className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                    activeFlow === FLOW_TABS.revoke
                      ? 'bg-rose-400 text-slate-950'
                      : 'border border-rose-300/40 bg-rose-900/30 text-rose-100 hover:bg-rose-800/40'
                  }`}
                >
                  Revoke ({revokableTeams.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFlow(FLOW_TABS.projects)}
                  className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                    activeFlow === FLOW_TABS.projects
                      ? 'bg-amber-300 text-slate-950'
                      : 'border border-amber-300/40 bg-amber-900/30 text-amber-100 hover:bg-amber-800/40'
                  }`}
                >
                  Projects ({projects.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFlow(FLOW_TABS.security)}
                  className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                    activeFlow === FLOW_TABS.security
                      ? 'bg-emerald-300 text-slate-950'
                      : 'border border-emerald-300/40 bg-emerald-900/30 text-emerald-100 hover:bg-emerald-800/40'
                  }`}
                >
                  Password Security
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFlow(FLOW_TABS.migration)}
                  className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                    activeFlow === FLOW_TABS.migration
                      ? 'bg-fuchsia-300 text-slate-950'
                      : 'border border-fuchsia-300/40 bg-fuchsia-900/30 text-fuchsia-100 hover:bg-fuchsia-800/40'
                  }`}
                >
                  Migration
                </button>
              </div>
            </div>

            {activeFlow === FLOW_TABS.approval ? (
              <section className="rounded-2xl border border-indigo-300/30 bg-indigo-900/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-black text-indigo-100">Approval Section</h2>
                <span className="rounded-full border border-indigo-200/40 bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-100">
                  Pending: {totalApprovalPending}
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-emerald-200/30 bg-emerald-950/30 p-3">
                <h3 className="text-sm font-black uppercase tracking-wide text-emerald-100">
                  Team Registration Approvals
                </h3>
                <p className="mt-1 text-xs text-emerald-100/85">
                  Pending registrations: {registrationApprovalTeams.length}
                </p>

                <div className="mt-3 overflow-x-auto rounded-xl border border-white/15 bg-black/20">
                  <table className="min-w-full divide-y divide-white/15 text-sm text-cyan-50">
                    <thead className="bg-white/10 text-xs uppercase tracking-wide text-cyan-100">
                      <tr>
                        <th className="px-3 py-3 text-left">Team</th>
                        <th className="px-3 py-3 text-left">Lead</th>
                        <th className="px-3 py-3 text-left">Duplicate Signals</th>
                        <th className="px-3 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {registrationApprovalTeams.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-cyan-100/80">
                            No pending team registrations.
                          </td>
                        </tr>
                      ) : registrationApprovalTeams.map((team) => {
                        const warnings = getDuplicateWarnings(team, teams)
                        return (
                          <tr key={`registration-${team._id}`} className="align-top">
                            <td className="px-3 py-3">
                              <div className="font-semibold text-white">{team.teamNumber}</div>
                              <div>{team.teamName}</div>
                              <div className="text-xs text-cyan-100/90">{team.college}</div>
                            </td>
                            <td className="px-3 py-3 text-xs">
                              <div className="font-semibold text-white">{team.leadName}</div>
                              <div>{team.leadEmail}</div>
                              <div>{team.leadUsn}</div>
                            </td>
                            <td className="px-3 py-3 text-xs">
                              {warnings.length === 0 ? (
                                <span className="rounded border border-emerald-300/40 bg-emerald-900/30 px-2 py-1 text-emerald-100">
                                  No duplicate signal
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  {warnings.map((warning) => (
                                    <div key={`${team._id}-${warning}`} className="rounded border border-amber-300/40 bg-amber-900/30 px-2 py-1 text-amber-100">
                                      {warning}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  disabled={reviewingRegistrationTeamId === team._id}
                                  onClick={() => handleReviewRegistrationRequest(team, 'approve')}
                                  className="rounded bg-emerald-400 px-2 py-1 text-[11px] font-bold text-slate-900 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={reviewingRegistrationTeamId === team._id}
                                  onClick={() => handleReviewRegistrationRequest(team, 'reject')}
                                  className="rounded bg-rose-400 px-2 py-1 text-[11px] font-bold text-slate-900 hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-indigo-200/30 bg-indigo-950/30 p-3">
                <h3 className="text-sm font-black uppercase tracking-wide text-indigo-100">
                  Profile Update Approvals
                </h3>
                <p className="mt-1 text-xs text-indigo-100/85">
                  Pending profile requests: {approvalTeams.length}
                </p>

              <div className="mt-3 overflow-x-auto rounded-xl border border-white/15 bg-black/20">
                <table className="min-w-full divide-y divide-white/15 text-sm text-cyan-50">
                  <thead className="bg-white/10 text-xs uppercase tracking-wide text-cyan-100">
                    <tr>
                      <th className="px-3 py-3 text-left">Team</th>
                      <th className="px-3 py-3 text-left">Request</th>
                      <th className="px-3 py-3 text-left">Requested vs Current</th>
                      <th className="px-3 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {approvalPagination.rows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-cyan-100/80">
                          No pending profile update requests.
                        </td>
                      </tr>
                    ) : approvalPagination.rows.map((team) => {
                      const diffItems = getProfileDiffItems(team)

                      return (
                        <tr key={team._id} className="align-top">
                          <td className="px-3 py-3">
                            <div className="font-semibold text-white">{team.teamNumber}</div>
                            <div>{team.teamName}</div>
                            <div className="text-xs text-cyan-100/90">{team.leadEmail}</div>
                          </td>
                          <td className="px-3 py-3 text-xs">
                            <div>Status: <span className="font-semibold uppercase">{team.profileUpdateRequest?.status}</span></div>
                            <div>Requested: {team.profileUpdateRequest?.requestedAt ? new Date(team.profileUpdateRequest.requestedAt).toLocaleString() : '-'}</div>
                            <div>Note: {team.profileUpdateRequest?.payload?.requestNote || '-'}</div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="rounded border border-indigo-200/30 bg-indigo-950/30 p-2 text-xs text-indigo-100">
                              {diffItems.length > 0 ? (
                                <div className="space-y-1">
                                  {diffItems.slice(0, 6).map((item) => (
                                    <div key={`${team._id}-${item.label}`}>
                                      <div className="font-semibold text-indigo-100">{item.label}</div>
                                      <div className="text-indigo-200/90">Now: {item.current || '-'}</div>
                                      <div className="text-emerald-200">Req: {item.requested || '-'}</div>
                                    </div>
                                  ))}
                                  {diffItems.length > 6 ? (
                                    <div className="text-indigo-200/80">+{diffItems.length - 6} more changes</div>
                                  ) : null}
                                </div>
                              ) : (
                                <div className="text-indigo-200/80">No field differences detected.</div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                disabled={reviewingTeamId === team._id}
                                onClick={() => handleReviewProfileRequest(team, 'approve')}
                                className="rounded bg-emerald-400 px-2 py-1 text-[11px] font-bold text-slate-900 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={reviewingTeamId === team._id}
                                onClick={() => handleReviewProfileRequest(team, 'reject')}
                                className="rounded bg-rose-400 px-2 py-1 text-[11px] font-bold text-slate-900 hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationControls page={approvalPagination.safePage} totalPages={approvalPagination.totalPages} onChange={setApprovalPage} />
              </div>

              <div className="mt-5 rounded-xl border border-amber-200/30 bg-amber-950/30 p-3">
                <h3 className="text-sm font-black uppercase tracking-wide text-amber-100">
                  Custom Project Idea Approvals
                </h3>
                <p className="mt-1 text-xs text-amber-100/85">
                  Pending custom ideas: {ideaApprovalTeams.length}
                </p>

                <div className="mt-3 overflow-x-auto rounded-xl border border-white/15 bg-black/20">
                  <table className="min-w-full divide-y divide-white/15 text-sm text-cyan-50">
                    <thead className="bg-white/10 text-xs uppercase tracking-wide text-cyan-100">
                      <tr>
                        <th className="px-3 py-3 text-left">Team</th>
                        <th className="px-3 py-3 text-left">Idea</th>
                        <th className="px-3 py-3 text-left">Stack</th>
                        <th className="px-3 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {ideaApprovalPagination.rows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-cyan-100/80">
                            No pending custom project ideas.
                          </td>
                        </tr>
                      ) : ideaApprovalPagination.rows.map((team) => (
                        <tr key={`idea-${team._id}`} className="align-top">
                          <td className="px-3 py-3">
                            <div className="font-semibold text-white">{team.teamNumber}</div>
                            <div>{team.teamName}</div>
                            <div className="text-xs text-cyan-100/90">{team.leadEmail}</div>
                          </td>
                          <td className="px-3 py-3 text-xs">
                            <div className="font-semibold text-amber-100">{team.customProjectIdea?.title || '-'}</div>
                            <div className="mt-1 text-cyan-100/90">{team.customProjectIdea?.description || '-'}</div>
                            <div className="mt-1 text-cyan-100/80">
                              {(team.customProjectIdea?.domain || '-')}
                              {' | '}
                              {(team.customProjectIdea?.difficulty || '-')}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs text-cyan-100/90">
                            {Array.isArray(team.customProjectIdea?.technologies)
                              ? team.customProjectIdea.technologies.join(', ')
                              : '-'}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                disabled={reviewingIdeaTeamId === team._id}
                                onClick={() => handleReviewCustomIdeaRequest(team, 'approve')}
                                className="rounded bg-emerald-400 px-2 py-1 text-[11px] font-bold text-slate-900 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={reviewingIdeaTeamId === team._id}
                                onClick={() => handleReviewCustomIdeaRequest(team, 'reject')}
                                className="rounded bg-rose-400 px-2 py-1 text-[11px] font-bold text-slate-900 hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationControls page={ideaApprovalPagination.safePage} totalPages={ideaApprovalPagination.totalPages} onChange={setIdeaApprovalPage} />
              </div>
              </section>
            ) : null}

            {activeFlow === FLOW_TABS.edit ? (
              <section className="rounded-2xl border border-cyan-300/30 bg-cyan-900/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-black text-cyan-100">Edit Section</h2>
                <span className="rounded-full border border-cyan-200/40 bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-100">
                  Teams: {editableTeams.length}
                </span>
              </div>

              <div className="mt-3 overflow-x-auto rounded-xl border border-white/15 bg-black/20">
                <table className="min-w-full divide-y divide-white/15 text-sm text-cyan-50">
                  <thead className="bg-white/10 text-xs uppercase tracking-wide text-cyan-100">
                    <tr>
                      <th className="px-3 py-3 text-left">Team</th>
                      <th className="px-3 py-3 text-left">Lead</th>
                      <th className="px-3 py-3 text-left">College</th>
                      <th className="px-3 py-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {editPagination.rows.map((team) => (
                      <tr key={team._id} className="align-top">
                        <td className="px-3 py-3">
                          <div className="font-semibold text-white">{team.teamNumber}</div>
                          <div>{team.teamName}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-white">{team.leadName}</div>
                          <div className="text-cyan-100/90">{team.leadEmail}</div>
                        </td>
                        <td className="px-3 py-3">{team.college}</td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => handleEdit(team)}
                            className="rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                          >
                            Edit Team
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls page={editPagination.safePage} totalPages={editPagination.totalPages} onChange={setEditPage} />
              </section>
            ) : null}

            {activeFlow === FLOW_TABS.revoke ? (
              <section className="rounded-2xl border border-rose-300/30 bg-rose-900/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-black text-rose-100">Revoke Section</h2>
                <span className="rounded-full border border-rose-200/40 bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-100">
                  Teams: {revokableTeams.length}
                </span>
              </div>

              <div className="mt-3 overflow-x-auto rounded-xl border border-white/15 bg-black/20">
                <table className="min-w-full divide-y divide-white/15 text-sm text-cyan-50">
                  <thead className="bg-white/10 text-xs uppercase tracking-wide text-cyan-100">
                    <tr>
                      <th className="px-3 py-3 text-left">Team</th>
                      <th className="px-3 py-3 text-left">Lead</th>
                      <th className="px-3 py-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {revokePagination.rows.map((team) => (
                      <tr key={team._id} className="align-top">
                        <td className="px-3 py-3">
                          <div className="font-semibold text-white">{team.teamNumber}</div>
                          <div>{team.teamName}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-white">{team.leadName}</div>
                          <div className="text-cyan-100/90">{team.leadEmail}</div>
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            disabled={deletingTeamId === team._id}
                            onClick={() => handleDelete(team._id)}
                            className="rounded-md bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingTeamId === team._id ? 'Revoking...' : 'Revoke / Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls page={revokePagination.safePage} totalPages={revokePagination.totalPages} onChange={setRevokePage} />
              </section>
            ) : null}

            {activeFlow === FLOW_TABS.projects ? (
              <section className="rounded-2xl border border-amber-300/30 bg-amber-900/20 p-4">
                <h2 className="text-lg font-black text-amber-100">Project Management</h2>
                <p className="mt-1 text-xs text-amber-100/90">
                  Add projects manually, bulk upload, and reconcile assignments in one focused workflow.
                </p>
                <div className="mt-4">
                  <AdminProjectsManager onProjectsChanged={refreshAdminData} projects={projects} />
                </div>
              </section>
            ) : null}

            {activeFlow === FLOW_TABS.security ? (
              <section className="rounded-2xl border border-emerald-300/30 bg-emerald-900/20 p-4">
                <h2 className="text-lg font-black text-emerald-100">Password Security Control</h2>
                <p className="mt-1 text-xs text-emerald-100/90">
                  Review OTP/reset activity and force reset passwords using a dedicated security view.
                </p>
                <div className="mt-4">
                  <AdminPasswordSecurityPanel />
                </div>
              </section>
            ) : null}

            {activeFlow === FLOW_TABS.migration ? (
              <section className="rounded-2xl border border-fuchsia-300/30 bg-fuchsia-900/20 p-4">
                <h2 className="text-lg font-black text-fuchsia-100">Data Migration</h2>
                <p className="mt-1 text-xs text-fuchsia-100/90">
                  Bulk-fix old records when new schema fields are introduced.
                </p>

                {migrationMessage ? (
                  <div className="mt-3 rounded-lg border border-emerald-300/40 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-100">
                    {migrationMessage}
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-white/20 bg-black/20 p-3 text-sm text-fuchsia-100 md:col-span-3">
                    <p className="font-semibold">Fields Updated By Migration</p>
                    <div className="mt-2 overflow-x-auto rounded border border-white/20">
                      <table className="min-w-full text-left text-xs text-fuchsia-100">
                        <thead className="bg-white/10 uppercase tracking-wide">
                          <tr>
                            <th className="px-3 py-2">Field</th>
                            <th className="px-3 py-2">Value Source</th>
                            <th className="px-3 py-2">Allowed Values (Enum)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          <tr>
                            <td className="px-3 py-2">registrationStatus</td>
                            <td className="px-3 py-2">Selected in migration popup</td>
                            <td className="px-3 py-2">approved | pending | rejected</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2">registrationReviewedAt</td>
                            <td className="px-3 py-2">System current timestamp</td>
                            <td className="px-3 py-2">DateTime (auto)</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2">registrationReviewedBy</td>
                            <td className="px-3 py-2">Current admin user</td>
                            <td className="px-3 py-2">String (auto)</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2">registrationReviewNote</td>
                            <td className="px-3 py-2">Selected note template</td>
                            <td className="px-3 py-2">Template dropdown values</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/20 bg-black/20 p-3 text-sm text-fuchsia-100">
                    <p><strong>Total Teams:</strong> {migrationSummary?.totalTeams ?? '-'}</p>
                    <p><strong>Approved:</strong> {migrationSummary?.approved ?? '-'}</p>
                    <p><strong>Pending:</strong> {migrationSummary?.pending ?? '-'}</p>
                    <p><strong>Rejected:</strong> {migrationSummary?.rejected ?? '-'}</p>
                  </div>
                  <div className="rounded-lg border border-white/20 bg-black/20 p-3 text-sm text-fuchsia-100">
                    <p><strong>Missing Status:</strong> {migrationSummary?.missingStatus ?? '-'}</p>
                    <p><strong>Pending + Assigned:</strong> {migrationSummary?.pendingWithAssignedProject ?? '-'}</p>
                    <p><strong>Pending + Idea:</strong> {migrationSummary?.pendingWithCustomIdea ?? '-'}</p>
                  </div>
                  <div className="rounded-lg border border-white/20 bg-black/20 p-3 text-sm text-fuchsia-100">
                    <p className="font-semibold">Bulk Actions</p>
                    <div className="mt-2 flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={migrationLoading}
                        onClick={() => {
                          setMigrationConfig((prev) => ({ ...prev, mode: 'missing-only' }))
                          setShowMigrationWizard(true)
                        }}
                        className="rounded bg-fuchsia-400 px-3 py-2 text-xs font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Open Migration Wizard (Missing Status)
                      </button>
                      <button
                        type="button"
                        disabled={migrationLoading}
                        onClick={() => {
                          setMigrationConfig((prev) => ({ ...prev, mode: 'pending-with-assigned' }))
                          setShowMigrationWizard(true)
                        }}
                        className="rounded bg-indigo-400 px-3 py-2 text-xs font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Open Migration Wizard (Pending + Assigned)
                      </button>
                      <button
                        type="button"
                        disabled={migrationLoading}
                        onClick={() => {
                          setMigrationConfig((prev) => ({ ...prev, mode: 'pending-all' }))
                          setShowMigrationWizard(true)
                        }}
                        className="rounded bg-amber-400 px-3 py-2 text-xs font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Open Migration Wizard (Pending All)
                      </button>
                      <button
                        type="button"
                        disabled={migrationLoading}
                        onClick={fetchMigrationSummary}
                        className="rounded border border-white/30 bg-white/10 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Refresh Summary
                      </button>
                    </div>
                  </div>
                </div>

                {showMigrationWizard ? (
                  <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded-2xl border border-fuchsia-300/40 bg-slate-900 p-6 shadow-2xl">
                      <h3 className="text-xl font-black text-white">Migration Wizard</h3>
                      <p className="mt-1 text-sm text-fuchsia-100/90">
                        Select enum values below. These fields will be updated in bulk.
                      </p>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-fuchsia-100">
                            Migration Mode (Enum)
                          </label>
                          <select
                            value={migrationConfig.mode}
                            onChange={(event) => updateMigrationConfig('mode', event.target.value)}
                            className="w-full rounded-lg border border-white/25 bg-slate-800 px-3 py-2 text-slate-100"
                          >
                            {MIGRATION_MODES.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-fuchsia-100">
                            registrationStatus (Enum)
                          </label>
                          <select
                            value={migrationConfig.targetStatus}
                            onChange={(event) => updateMigrationConfig('targetStatus', event.target.value)}
                            className="w-full rounded-lg border border-white/25 bg-slate-800 px-3 py-2 text-slate-100"
                          >
                            {REGISTRATION_STATUS_ENUM.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-fuchsia-100">
                            reviewNote Template (Enum)
                          </label>
                          <select
                            value={migrationConfig.reviewNote}
                            onChange={(event) => updateMigrationConfig('reviewNote', event.target.value)}
                            className="w-full rounded-lg border border-white/25 bg-slate-800 px-3 py-2 text-slate-100"
                          >
                            {MIGRATION_NOTE_TEMPLATES.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="mt-4 rounded-lg border border-white/20 bg-black/20 p-3 text-xs text-fuchsia-100">
                        <p><strong>Will update fields:</strong> registrationStatus, registrationReviewedAt, registrationReviewedBy, registrationReviewNote</p>
                        <p className="mt-1"><strong>Selected values:</strong> {migrationConfig.mode} | {migrationConfig.targetStatus} | {migrationConfig.reviewNote}</p>
                      </div>

                      <div className="mt-5 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowMigrationWizard(false)}
                          disabled={migrationLoading}
                          className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRunMigration(migrationConfig)}
                          disabled={migrationLoading}
                          className="rounded-lg bg-fuchsia-400 px-4 py-2 text-sm font-black text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {migrationLoading ? 'Applying...' : 'Apply Migration'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        )}

        {editingTeam && (
          <AdminEditTeamModal
            team={editingTeam}
            projects={projects}
            onSave={handleEditSave}
            onCancel={() => setEditingTeam(null)}
          />
        )}

        <ActionDialog
          isOpen={dialogConfig.isOpen}
          title={dialogConfig.title}
          message={dialogConfig.message}
          noteLabel={dialogConfig.noteLabel}
          notePlaceholder={dialogConfig.notePlaceholder}
          requireNote={dialogConfig.requireNote}
          confirmLabel={dialogConfig.confirmLabel}
          confirmTone={dialogConfig.confirmTone}
          loading={dialogLoading}
          onCancel={closeDialog}
          onConfirm={handleDialogConfirm}
        />
      </section>
    </PageShell>
  )
}

export default AdminTeamsPage
