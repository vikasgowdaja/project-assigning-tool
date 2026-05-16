import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MemberFields } from '../components/MemberFields'
import { PageShell } from '../components/PageShell'
import { getRegistrationLookups, registerTeam } from '../services/api'

const initialForm = {
  teamName: '',
  leadName: '',
  leadEmail: '',
  leadUsn: '',
  leadPhone: '',
  college: '',
  department: ''
}

const initialCustomIdeaForm = {
  title: '',
  description: '',
  difficulty: '',
  domain: '',
  technologies: ''
}

export function RegistrationPage() {
  const [form, setForm] = useState(initialForm)
  const [lookupOptions, setLookupOptions] = useState({ colleges: [], departments: [] })
  const [lookupLoading, setLookupLoading] = useState(true)
  const [lookupError, setLookupError] = useState('')
  const [wantsCustomIdea, setWantsCustomIdea] = useState(false)
  const [customIdea, setCustomIdea] = useState(initialCustomIdeaForm)
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

  const updateCustomIdeaField = (field, value) => {
    setCustomIdea((prev) => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    let cancelled = false

    const loadLookups = async () => {
      setLookupLoading(true)
      setLookupError('')

      try {
        const data = await getRegistrationLookups()
        if (cancelled) return
        setLookupOptions({
          colleges: Array.isArray(data?.colleges) ? data.colleges : [],
          departments: Array.isArray(data?.departments) ? data.departments : []
        })
      } catch {
        if (cancelled) return
        setLookupError('Failed to load college and department options')
      } finally {
        if (!cancelled) {
          setLookupLoading(false)
        }
      }
    }

    loadLookups()

    return () => {
      cancelled = true
    }
  }, [])

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (wantsCustomIdea) {
        const requiredCustomFields = ['title', 'description', 'difficulty', 'domain', 'technologies']
        const missingField = requiredCustomFields.find((field) => !String(customIdea[field] || '').trim())

        if (missingField) {
          throw new Error('Please fill all custom project idea fields or disable this section')
        }
      }

      const payload = {
        ...form,
        members,
        ...(wantsCustomIdea
          ? {
              customProjectIdea: {
                title: customIdea.title,
                description: customIdea.description,
                difficulty: customIdea.difficulty,
                domain: customIdea.domain,
                technologies: customIdea.technologies
              }
            }
          : {})
      }

      const result = await registerTeam(payload)
      navigate('/success', { state: { team: result.team } })
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Registration failed')
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
          Fill team and member details. You can optionally submit your own project idea for approval instead of random assignment.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['teamName', 'Team Name'],
              ['leadName', 'Team Lead Name'],
              ['leadEmail', 'Team Lead Email'],
              ['leadUsn', 'Team Lead USN'],
              ['leadPhone', 'Team Lead Phone']
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

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-100">
                College Name
              </label>
              <select
                required
                value={form.college}
                onChange={(event) => updateField('college', event.target.value)}
                disabled={lookupLoading}
                className="w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <option value="">{lookupLoading ? 'Loading colleges...' : 'Select college'}</option>
                {lookupOptions.colleges.map((college) => (
                  <option key={college} value={college}>{college}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-100">
                Department
              </label>
              <select
                required
                value={form.department}
                onChange={(event) => updateField('department', event.target.value)}
                disabled={lookupLoading}
                className="w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <option value="">{lookupLoading ? 'Loading departments...' : 'Select department'}</option>
                {lookupOptions.departments.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </div>
          </div>

          {lookupError ? (
            <div className="rounded-lg border border-amber-300/60 bg-amber-500/20 px-3 py-2 text-sm text-amber-100">
              {lookupError}
            </div>
          ) : null}

          <MemberFields members={members} setMembers={setMembers} />

          <div className="rounded-2xl border border-cyan-200/30 bg-cyan-100/5 p-4">
            <label className="flex items-start gap-3 text-sm text-cyan-50">
              <input
                type="checkbox"
                checked={wantsCustomIdea}
                onChange={(event) => {
                  const checked = event.target.checked
                  setWantsCustomIdea(checked)
                  if (!checked) {
                    setCustomIdea(initialCustomIdeaForm)
                  }
                }}
                className="mt-0.5 h-4 w-4 accent-cyan-300"
              />
              <span>
                Submit our own project idea for approval (optional)
              </span>
            </label>

            {wantsCustomIdea ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-100">
                    Project Title
                  </label>
                  <input
                    required={wantsCustomIdea}
                    type="text"
                    value={customIdea.title}
                    onChange={(event) => updateCustomIdeaField('title', event.target.value)}
                    className="w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100 placeholder:text-slate-300/70"
                    placeholder="Enter project title"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-100">
                    Description
                  </label>
                  <textarea
                    required={wantsCustomIdea}
                    rows={3}
                    value={customIdea.description}
                    onChange={(event) => updateCustomIdeaField('description', event.target.value)}
                    className="w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100 placeholder:text-slate-300/70"
                    placeholder="Describe the problem and your solution idea"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-100">
                    Difficulty Level
                  </label>
                  <select
                    required={wantsCustomIdea}
                    value={customIdea.difficulty}
                    onChange={(event) => updateCustomIdeaField('difficulty', event.target.value)}
                    className="w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100"
                  >
                    <option value="">Select difficulty</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-100">
                    Domain
                  </label>
                  <input
                    required={wantsCustomIdea}
                    type="text"
                    value={customIdea.domain}
                    onChange={(event) => updateCustomIdeaField('domain', event.target.value)}
                    className="w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100 placeholder:text-slate-300/70"
                    placeholder="Ex: Education, Healthcare"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-100">
                    Technologies Used
                  </label>
                  <input
                    required={wantsCustomIdea}
                    type="text"
                    value={customIdea.technologies}
                    onChange={(event) => updateCustomIdeaField('technologies', event.target.value)}
                    className="w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100 placeholder:text-slate-300/70"
                    placeholder="Comma-separated, e.g. React, Node.js, MongoDB"
                  />
                </div>
              </div>
            ) : null}
          </div>

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
            {loading
              ? 'Registering Team...'
              : wantsCustomIdea
                ? 'Register Team & Submit Idea'
                : 'Register Team & Assign Project'}
          </button>
        </form>
      </section>
    </PageShell>
  )
}
