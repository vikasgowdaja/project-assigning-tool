import { useEffect, useMemo, useState } from 'react'
import {
  bulkUpdateTeamsCollege,
  getAdminRegistrationLookups,
  getAdminTeams
} from '../services/api'

const PAGE_SIZE = 10

const AdminBulkUpdateTeams = () => {
  const [teams, setTeams] = useState([])
  const [selectedTeams, setSelectedTeams] = useState([])
  const [college, setCollege] = useState('')
  const [collegeOptions, setCollegeOptions] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError('')
      try {
        const [teamResponse, lookupResponse] = await Promise.all([
          getAdminTeams(),
          getAdminRegistrationLookups()
        ])

        const teamList = Array.isArray(teamResponse) ? teamResponse : []
        setTeams(teamList)

        const lookupColleges = Array.isArray(lookupResponse?.colleges)
          ? lookupResponse.colleges
              .filter((item) => item?.active)
              .map((item) => String(item?.label || '').trim())
              .filter(Boolean)
          : []

        const uniqueOptions = Array.from(new Set(lookupColleges)).sort((a, b) => a.localeCompare(b))

        setCollegeOptions(uniqueOptions)
        if (uniqueOptions.length > 0) {
          setCollege((prev) => prev || uniqueOptions[0])
        } else {
          setCollege('')
        }
      } catch (error) {
        setError('Failed to load teams or college options')
        console.error('Error fetching teams:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const totalPages = Math.max(1, Math.ceil(teams.length / PAGE_SIZE))
  const safePage = Math.min(Math.max(page, 1), totalPages)

  const pagedTeams = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return teams.slice(start, start + PAGE_SIZE)
  }, [teams, safePage])

  const effectiveCollege = college.trim()

  const selectedSet = useMemo(() => new Set(selectedTeams), [selectedTeams])
  const allOnPageSelected =
    pagedTeams.length > 0 && pagedTeams.every((team) => selectedSet.has(team._id))

  const handleSelectTeam = (teamId) => {
    setSelectedTeams((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId]
    )
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTeams((prev) => {
        const next = new Set(prev)
        pagedTeams.forEach((team) => next.add(team._id))
        return Array.from(next)
      })
    } else {
      const pageIds = new Set(pagedTeams.map((team) => team._id))
      setSelectedTeams((prev) => prev.filter((id) => !pageIds.has(id)))
    }
  }

  const refreshTeams = async () => {
    const refreshedTeams = await getAdminTeams()
    setTeams(Array.isArray(refreshedTeams) ? refreshedTeams : [])
  }

  const runBulkUpdate = async (teamIds) => {
    if (!effectiveCollege) {
      setError('Please choose a college value from Directory')
      return
    }

    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      setError('Please select at least one record')
      return
    }

    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      const response = await bulkUpdateTeamsCollege({
        teamIds,
        college: effectiveCollege
      })

      setMessage(response.message || 'Bulk update completed successfully')
      setSelectedTeams([])
      await refreshTeams()
    } catch (error) {
      setError(error?.response?.data?.message || 'Error updating teams')
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateSelected = async () => {
    await runBulkUpdate(selectedTeams)
  }

  const handleUpdateAll = async () => {
    await runBulkUpdate(teams.map((team) => team._id))
  }

  const startItem = teams.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const endItem = Math.min(safePage * PAGE_SIZE, teams.length)

  if (loading) {
    return (
      <section className="rounded-2xl border border-teal-300/30 bg-teal-900/20 p-4">
        <h2 className="text-lg font-black text-teal-100">Bulk Update Teams</h2>
        <p className="mt-2 text-sm text-teal-100/90">Loading records...</p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-teal-300/30 bg-teal-900/20 p-4">
      <h2 className="text-lg font-black text-teal-100">Bulk Update Teams</h2>
      <p className="mt-1 text-xs text-teal-100/90">
        Select records by checkbox and choose the target college value from Directory.
      </p>

      {error ? (
        <div className="mt-3 rounded-lg border border-rose-300/40 bg-rose-900/30 px-3 py-2 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-3 rounded-lg border border-emerald-300/40 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-100">
          {message}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <label htmlFor="college-select" className="mb-1 block text-xs font-bold text-teal-100/90">
            New College Value
          </label>
          <select
            id="college-select"
            value={college}
            onChange={(event) => setCollege(event.target.value)}
            className="w-full rounded-lg border border-teal-200/40 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none ring-0"
          >
            <option value="" disabled>
              {collegeOptions.length > 0 ? 'Select college from directory' : 'No directory colleges available'}
            </option>
            {collegeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={handleUpdateSelected}
            disabled={submitting || collegeOptions.length === 0}
            className="rounded-lg border border-cyan-300/50 bg-cyan-500/20 px-3 py-2 text-xs font-bold text-cyan-100 disabled:opacity-50"
          >
            {submitting ? 'Updating...' : 'Update Selected'}
          </button>
          <button
            type="button"
            onClick={handleUpdateAll}
            disabled={submitting || teams.length === 0 || collegeOptions.length === 0}
            className="rounded-lg border border-amber-300/50 bg-amber-500/20 px-3 py-2 text-xs font-bold text-amber-100 disabled:opacity-50"
          >
            {submitting ? 'Updating...' : 'Update All Records'}
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-white/15">
        <table className="min-w-full text-left text-sm text-cyan-50">
          <thead className="bg-black/25 text-xs uppercase tracking-wide text-cyan-100/90">
            <tr>
              <th className="px-3 py-2">
                <input type="checkbox" onChange={handleSelectAll} checked={allOnPageSelected} />
              </th>
              <th className="px-3 py-2">Team Name</th>
              <th className="px-3 py-2">Current College</th>
            </tr>
          </thead>
          <tbody>
            {pagedTeams.map((team) => (
              <tr key={team._id} className="border-t border-white/10">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedSet.has(team._id)}
                    onChange={() => handleSelectTeam(team._id)}
                  />
                </td>
                <td className="px-3 py-2">{team.teamName || team.name || '-'}</td>
                <td className="px-3 py-2">{team.college || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-cyan-100/90">
        <p>
          Showing {startItem}-{endItem} of {teams.length} records
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={safePage === 1}
            className="rounded-md border border-white/25 px-2 py-1 disabled:opacity-50"
          >
            Prev
          </button>
          <span>
            Page {safePage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={safePage === totalPages}
            className="rounded-md border border-white/25 px-2 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  )
}

export default AdminBulkUpdateTeams