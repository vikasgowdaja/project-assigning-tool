import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MemberFields } from '../components/MemberFields'
import { PageShell } from '../components/PageShell'
import { registerTeam } from '../services/api'

const initialForm = {
  teamName: '',
  leadName: '',
  leadEmail: '',
  leadUsn: '',
  leadPhone: '',
  college: '',
  department: ''
}

export function RegistrationPage() {
  const [form, setForm] = useState(initialForm)
  const [members, setMembers] = useState([
    { name: '', usn: '', email: '' },
    { name: '', usn: '', email: '' }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = {
        ...form,
        members
      }
      const result = await registerTeam(payload)
      navigate('/success', { state: { team: result.team } })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell>
      <section className="rounded-3xl border border-white/25 bg-white/10 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        <h1 className="text-3xl font-black text-white md:text-4xl">
          Team Registration
        </h1>
        <p className="mt-2 text-sm text-cyan-50/90 md:text-base">
          Fill team and member details to receive a random project statement.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
                  value={form[key]}
                  onChange={(event) => updateField(key, event.target.value)}
                  className="w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100 placeholder:text-slate-300/70"
                  placeholder={`Enter ${label.toLowerCase()}`}
                />
              </div>
            ))}
          </div>

          <MemberFields members={members} setMembers={setMembers} />

          {error ? (
            <div className="rounded-lg border border-rose-300/60 bg-rose-500/20 px-3 py-2 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Registering Team...' : 'Register Team & Assign Project'}
          </button>
        </form>
      </section>
    </PageShell>
  )
}
