import { useEffect, useState } from 'react'
import { deleteTeam, getProjects, getTeams, updateTeam } from '../services/api'
import AdminEditTeamModal from '../components/AdminEditTeamModal'
import { PageShell } from '../components/PageShell'

const AdminTeamsPage = () => {
  const [teams, setTeams] = useState([])
  const [projects, setProjects] = useState([])
  const [editingTeam, setEditingTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    if (!window.confirm('Delete this team?')) return
    setLoading(true)
    try {
      await deleteTeam(id)
      await fetchTeams()
    } catch {
      setError('Failed to delete team')
      setLoading(false)
    }
  }

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
          <div className="mt-6 overflow-x-auto rounded-2xl border border-white/20 bg-black/20">
            <table className="min-w-full divide-y divide-white/15 text-sm text-cyan-50">
              <thead className="bg-white/10 text-xs uppercase tracking-wide text-cyan-100">
                <tr>
                  <th className="px-3 py-3 text-left">Team</th>
                  <th className="px-3 py-3 text-left">Lead</th>
                  <th className="px-3 py-3 text-left">College</th>
                  <th className="px-3 py-3 text-left">Members</th>
                  <th className="px-3 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {teams.map((team) => (
                  <tr key={team._id} className="align-top">
                    <td className="px-3 py-3">
                      <div className="font-semibold text-white">{team.teamNumber}</div>
                      <div>{team.teamName}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-white">{team.leadName}</div>
                      <div className="text-cyan-100/90">{team.leadEmail}</div>
                      <div className="text-cyan-100/80">{team.leadUsn}</div>
                    </td>
                    <td className="px-3 py-3">{team.college}</td>
                    <td className="px-3 py-3">
                      <div className="space-y-1">
                        {(team.members || []).map((member, index) => (
                          <div key={`${team._id}-member-${index}`} className="rounded-md bg-white/10 px-2 py-1 text-xs">
                            <span className="font-semibold text-white">{member.name}</span>
                            <span className="text-cyan-100/90"> {member.usn}</span>
                            <span className="text-cyan-100/80"> {member.email}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(team)}
                          className="rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(team._id)}
                          className="rounded-md bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-400"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      </section>
    </PageShell>
  )
}

export default AdminTeamsPage
