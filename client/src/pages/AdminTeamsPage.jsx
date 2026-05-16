import { useEffect, useState } from 'react'
import {
  deleteTeam,
  getProjects,
  getTeams,
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
  security: 'security'
}

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
      const data = await getTeams()
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

  useEffect(() => {
    let cancelled = false

    const loadInitialData = async () => {
      try {
        const [teamData, projectData] = await Promise.all([getTeams(), getProjects()])
        if (cancelled) return
        setTeams(teamData)
        setProjects(projectData)
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
          await fetchTeams()
        } catch (requestError) {
          setError(requestError.response?.data?.message || 'Failed to review custom project idea')
        } finally {
          setReviewingIdeaTeamId('')
        }
      }
    })
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

  const approvalTeams = teams.filter((team) => team.profileUpdateRequest?.status === 'pending')
  const ideaApprovalTeams = teams.filter((team) => {
    const customIdea = team.customProjectIdea || {}
    return Boolean(customIdea.title) && customIdea.status === 'pending'
  })
  const editableTeams = teams
  const revokableTeams = teams

  const approvalPagination = paginate(approvalTeams, approvalPage)
  const ideaApprovalPagination = paginate(ideaApprovalTeams, ideaApprovalPage)
  const editPagination = paginate(editableTeams, editPage)
  const revokePagination = paginate(revokableTeams, revokePage)
  const totalApprovalPending = approvalTeams.length + ideaApprovalTeams.length

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
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
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
