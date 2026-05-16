import { useEffect, useState } from 'react'
import {
  createRegistrationLookup,
  deleteRegistrationLookup,
  getAdminRegistrationLookups,
  deleteTeam,
  getAdminTeams,
  getProjects,
  getRegistrationMigrationSummary,
  reviewTeamGithubCollaboration,
  reviewTeamRegistrationRequest,
  runRegistrationMigration,
  reviewTeamCustomProjectIdea,
  reviewTeamProfileUpdateRequest,
  updateRegistrationLookup,
  updateTeam
} from '../services/api'
import AdminEditTeamModal from '../components/AdminEditTeamModal'
import { AdminProjectsManager } from '../components/AdminProjectsManager'
import { AdminPasswordSecurityPanel } from '../components/AdminPasswordSecurityPanel'
import { AdminApprovalSection } from '../components/admin/AdminApprovalSection'
import { AdminEditSection } from '../components/admin/AdminEditSection'
import { AdminFlowTabs } from '../components/admin/AdminFlowTabs'
import { AdminGithubCollaborationSection } from '../components/admin/AdminGithubCollaborationSection'
import { AdminLookupManagerSection } from '../components/admin/AdminLookupManagerSection'
import { AdminMigrationSection } from '../components/admin/AdminMigrationSection'
import { AdminRevokeSection } from '../components/admin/AdminRevokeSection'
import { PageShell } from '../components/PageShell'
import { ActionDialog } from '../components/ActionDialog'
import AdminBulkUpdateTeams from '../components/AdminBulkUpdateTeams'
import { ExcelExportDialog } from '../components/ExcelExportDialog'

const PAGE_SIZE = 8
const FLOW_TABS = {
  approval: 'approval',
  edit: 'edit',
  directory: 'directory',
  projects: 'projects',
  github: 'github',
  revoke: 'revoke',
  security: 'security',
  migration: 'migration',
  bulkUpdate: 'bulkUpdate', // Added new tab for Bulk Update Teams
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
  const [reviewingGithubTeamId, setReviewingGithubTeamId] = useState('')
  const [migrationSummary, setMigrationSummary] = useState(null)
  const [lookupCatalog, setLookupCatalog] = useState({ colleges: [], departments: [] })
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupPending, setLookupPending] = useState(false)
  const [lookupMessage, setLookupMessage] = useState('')
  const [migrationLoading, setMigrationLoading] = useState(false)
  const [migrationMessage, setMigrationMessage] = useState('')
  const [showMigrationWizard, setShowMigrationWizard] = useState(false)
  const [migrationConfig, setMigrationConfig] = useState({
    mode: 'missing-only',
    targetStatus: 'approved',
    reviewNote: 'Admin bulk migration'
  })
  const [showExportDialog, setShowExportDialog] = useState(false)

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

  const fetchLookupCatalog = async ({ silent = false } = {}) => {
    if (!silent) {
      setLookupLoading(true)
    }

    try {
      const data = await getAdminRegistrationLookups()
      setLookupCatalog({
        colleges: Array.isArray(data?.colleges) ? data.colleges : [],
        departments: Array.isArray(data?.departments) ? data.departments : []
      })
    } catch {
      setError('Failed to fetch college/department lookup data')
    } finally {
      if (!silent) {
        setLookupLoading(false)
      }
    }
  }

  useEffect(() => {
    let cancelled = false

    const loadInitialData = async () => {
      try {
        const [teamData, projectData, migrationData, lookupData] = await Promise.all([
          getAdminTeams(),
          getProjects(),
          getRegistrationMigrationSummary(),
          getAdminRegistrationLookups()
        ])
        if (cancelled) return
        setTeams(teamData)
        setProjects(projectData)
        setMigrationSummary(migrationData)
        setLookupCatalog({
          colleges: Array.isArray(lookupData?.colleges) ? lookupData.colleges : [],
          departments: Array.isArray(lookupData?.departments) ? lookupData.departments : []
        })
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

  const handleReviewGithubCollaboration = async (team, status) => {
    setReviewingGithubTeamId(team._id)
    setError('')

    try {
      await reviewTeamGithubCollaboration(team._id, { status })
      await fetchTeams()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to update collaboration status')
    } finally {
      setReviewingGithubTeamId('')
    }
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

  const openMigrationWizard = (mode) => {
    setMigrationConfig((prev) => ({ ...prev, mode }))
    setShowMigrationWizard(true)
  }

  const closeMigrationWizard = () => {
    if (migrationLoading) {
      return
    }
    setShowMigrationWizard(false)
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

  const handleCreateLookup = async (type, label) => {
    setLookupPending(true)
    setLookupMessage('')
    setError('')

    try {
      const response = await createRegistrationLookup(type, { label })
      setLookupMessage(response.message || `${type} created`)
      await fetchLookupCatalog({ silent: true })
      return true
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Failed to create ${type}`)
      return false
    } finally {
      setLookupPending(false)
    }
  }

  const handleUpdateLookup = async (type, id, payload) => {
    setLookupPending(true)
    setLookupMessage('')
    setError('')

    try {
      const response = await updateRegistrationLookup(type, id, payload)
      setLookupMessage(response.message || `${type} updated`)
      await fetchLookupCatalog({ silent: true })
      return true
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Failed to update ${type}`)
      return false
    } finally {
      setLookupPending(false)
    }
  }

  const handleDeleteLookup = async (type, id) => {
    setLookupPending(true)
    setLookupMessage('')
    setError('')

    try {
      const response = await deleteRegistrationLookup(type, id)
      setLookupMessage(response.message || `${type} deleted`)
      await fetchLookupCatalog({ silent: true })
      return true
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Failed to delete ${type}`)
      return false
    } finally {
      setLookupPending(false)
    }
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
  const githubTeams = teams.filter((team) => team.registrationStatus === 'approved')

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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowExportDialog(true)}
              className="rounded-lg border border-emerald-300/50 bg-emerald-600/20 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-600/40"
            >
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => {
                fetchTeams({ showLoader: true })
                fetchProjects()
                fetchLookupCatalog()
              }}
              className="rounded-lg border border-cyan-200/60 bg-cyan-100/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-100/20"
            >
              Refresh
            </button>
          </div>
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
            <AdminFlowTabs
              activeFlow={activeFlow}
              onChange={setActiveFlow}
              counts={{
                approval: totalApprovalPending,
                edit: editableTeams.length,
                projects: projects.length,
                github: githubTeams.length,
                revoke: revokableTeams.length
              }}
            />

            {activeFlow === FLOW_TABS.approval ? (
              <AdminApprovalSection
                totalApprovalPending={totalApprovalPending}
                registrationApprovalTeams={registrationApprovalTeams}
                teams={teams}
                reviewingRegistrationTeamId={reviewingRegistrationTeamId}
                onReviewRegistrationRequest={handleReviewRegistrationRequest}
                getDuplicateWarnings={getDuplicateWarnings}
                approvalTeams={approvalTeams}
                approvalPagination={approvalPagination}
                onApprovalPageChange={setApprovalPage}
                getProfileDiffItems={getProfileDiffItems}
                reviewingTeamId={reviewingTeamId}
                onReviewProfileRequest={handleReviewProfileRequest}
                ideaApprovalTeams={ideaApprovalTeams}
                ideaApprovalPagination={ideaApprovalPagination}
                onIdeaPageChange={setIdeaApprovalPage}
                reviewingIdeaTeamId={reviewingIdeaTeamId}
                onReviewCustomIdeaRequest={handleReviewCustomIdeaRequest}
              />
            ) : null}

            {activeFlow === FLOW_TABS.edit ? (
              <AdminEditSection
                editableTeams={editableTeams}
                editPagination={editPagination}
                onEditPageChange={setEditPage}
                onEdit={handleEdit}
              />
            ) : null}

            {activeFlow === FLOW_TABS.directory ? (
              <AdminLookupManagerSection
                lookupCatalog={lookupCatalog}
                loading={lookupLoading}
                pending={lookupPending}
                error={error}
                message={lookupMessage}
                onCreate={handleCreateLookup}
                onUpdate={handleUpdateLookup}
                onDelete={handleDeleteLookup}
                onRefresh={fetchLookupCatalog}
              />
            ) : null}

            {activeFlow === FLOW_TABS.revoke ? (
              <AdminRevokeSection
                revokableTeams={revokableTeams}
                revokePagination={revokePagination}
                onRevokePageChange={setRevokePage}
                deletingTeamId={deletingTeamId}
                onDelete={handleDelete}
              />
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
              <AdminMigrationSection
                migrationSummary={migrationSummary}
                migrationMessage={migrationMessage}
                migrationLoading={migrationLoading}
                showMigrationWizard={showMigrationWizard}
                migrationConfig={migrationConfig}
                onSetMigrationConfig={updateMigrationConfig}
                onOpenWizard={openMigrationWizard}
                onCloseWizard={closeMigrationWizard}
                onRunMigration={handleRunMigration}
                onRefreshSummary={fetchMigrationSummary}
              />
            ) : null}

            {activeFlow === FLOW_TABS.github ? (
              <AdminGithubCollaborationSection
                githubTeams={githubTeams}
                reviewingGithubTeamId={reviewingGithubTeamId}
                onReviewGithubCollaboration={handleReviewGithubCollaboration}
              />
            ) : null}

            {activeFlow === FLOW_TABS.bulkUpdate ? <AdminBulkUpdateTeams /> : null}
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

      <ExcelExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        teams={teams}
      />
    </PageShell>
  )
}

export default AdminTeamsPage
