import { useState } from 'react'
import { MemberFields } from './MemberFields'

export default function AdminEditTeamModal({ team, projects, onSave, onCancel }) {
  const [form, setForm] = useState({
    teamName: team.teamName || '',
    leadName: team.leadName || '',
    leadEmail: team.leadEmail || '',
    leadUsn: team.leadUsn || '',
    leadPhone: team.leadPhone || '',
    college: team.college || '',
    department: team.department || '',
    projectTitle: team.assignedProject?.title || ''
  })
  const [members, setMembers] = useState(team.members || [
    { name: '', usn: '', email: '' },
    { name: '', usn: '', email: '' }
  ])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSave({ ...form, members })
    } catch (err) {
      setError('Failed to update team')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-cyan-400/30 bg-slate-900 p-6 shadow-2xl md:p-8">
        <h2 className="mb-4 text-2xl font-black text-white">Edit Team: {form.teamName}</h2>
        {error && (
          <div className="mb-3 rounded-lg border border-rose-400/50 bg-rose-900/40 px-3 py-2 text-sm text-rose-100">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-200">
                  {label}
                </label>
                <input
                  required
                  type={key.includes('Email') ? 'email' : 'text'}
                  autoComplete={key === 'leadEmail' ? 'email' : 'off'}
                  autoCapitalize={key === 'leadUsn' ? 'characters' : 'none'}
                  value={form[key]}
                  onChange={e => updateField(key, e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-200">
                Assigned Project
              </label>
              <select
                required
                value={form.projectTitle}
                onChange={(e) => updateField('projectTitle', e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
              >
                <option value="" disabled>
                  Select a project
                </option>
                {(projects || []).map((project) => (
                  <option key={project._id} value={project.title}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <MemberFields members={members} setMembers={setMembers} />
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-cyan-500 px-4 py-2 font-bold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-800 disabled:text-cyan-300"
              disabled={loading}
            >
              Save
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-500 bg-slate-700 px-4 py-2 font-bold text-slate-100 hover:bg-slate-600"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
