import { useState } from 'react'
import {
  createProject,
  downloadProjectsTemplate,
  previewProjectsFile,
  reconcileProjects,
  uploadProjectsFile
} from '../services/api'

const initialForm = {
  title: '',
  description: '',
  difficulty: 'Medium',
  domain: '',
  technologies: ''
}

export function AdminProjectsManager({ onProjectsChanged }) {
  const [form, setForm] = useState(initialForm)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleManualSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await createProject({
        ...form,
        technologies: form.technologies
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      })
      setForm(initialForm)
      setMessage('Project added successfully')
      await onProjectsChanged()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to add project')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Select an Excel (.xlsx) or PDF (.pdf) file first')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const result = await uploadProjectsFile(file)
      setMessage(
        `Upload complete. Inserted: ${result.insertedCount}, skipped: ${result.skippedCount}, invalid rows: ${result.invalidCount || 0}`
      )
      setPreview(null)
      setFile(null)
      await onProjectsChanged()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = async () => {
    if (!file) {
      setError('Select an Excel (.xlsx) or PDF (.pdf) file first')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const data = await previewProjectsFile(file)
      setPreview(data)
      setMessage(
        `Preview ready. Valid: ${data.validCount}, invalid: ${data.invalidCount}, total rows: ${data.totalRows}`
      )
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Preview failed')
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await downloadProjectsTemplate()
      setMessage('Template downloaded successfully')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Template download failed')
    } finally {
      setLoading(false)
    }
  }

  const handleReconcile = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await reconcileProjects()
      setMessage('Project assignment reconciliation completed')
      await onProjectsChanged()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Reconciliation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-white/20 bg-black/20 p-4 md:p-6">
      <h2 className="text-xl font-black text-white">Project Management</h2>
      <p className="mt-1 text-sm text-cyan-100/90">
        Add projects manually, upload from Excel/PDF, and reconcile past assignment mismatch caused by direct DB deletes.
      </p>

      {message && (
        <div className="mt-4 rounded-lg border border-emerald-300/40 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-100">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-rose-300/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleManualSubmit} className="space-y-3 rounded-xl border border-white/15 bg-white/5 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-cyan-100">Manual Add</h3>
          <input
            required
            value={form.title}
            onChange={(event) => updateField('title', event.target.value)}
            className="w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-slate-100"
            placeholder="Project title"
          />
          <textarea
            required
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
            className="h-24 w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-slate-100"
            placeholder="Project description"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={form.difficulty}
              onChange={(event) => updateField('difficulty', event.target.value)}
              className="rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-slate-100"
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
            <input
              required
              value={form.domain}
              onChange={(event) => updateField('domain', event.target.value)}
              className="rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-slate-100"
              placeholder="Domain"
            />
          </div>
          <input
            value={form.technologies}
            onChange={(event) => updateField('technologies', event.target.value)}
            className="w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-slate-100"
            placeholder="Technologies (comma separated)"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add Project
          </button>
        </form>

        <div className="space-y-4 rounded-xl border border-white/15 bg-white/5 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-cyan-100">Bulk Upload</h3>
          <input
            type="file"
            accept=".xlsx,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="block w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
          <p className="text-xs text-cyan-100/80">
            Excel: use headers title, description, difficulty, domain, technologies.
          </p>
          <p className="text-xs text-cyan-100/80">
            PDF: one project per line in format title | description | difficulty | domain | tech1,tech2.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleDownloadTemplate}
              className="rounded-lg border border-cyan-300/40 bg-cyan-900/30 px-4 py-2 text-sm font-bold text-cyan-100 hover:bg-cyan-800/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Download Template
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handlePreview}
              className="rounded-lg border border-indigo-300/40 bg-indigo-900/30 px-4 py-2 text-sm font-bold text-indigo-100 hover:bg-indigo-800/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Preview File
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleUpload}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Upload File
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleReconcile}
              className="rounded-lg border border-amber-300/40 bg-amber-900/30 px-4 py-2 text-sm font-bold text-amber-100 hover:bg-amber-800/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reconcile Assignments
            </button>
          </div>

          {preview && (
            <div className="rounded-lg border border-white/15 bg-black/30 p-3 text-xs text-cyan-100">
              <div>Valid rows: {preview.validCount}</div>
              <div>Invalid rows: {preview.invalidCount}</div>
              <div>Total rows: {preview.totalRows}</div>
              {preview.invalidRows?.length > 0 && (
                <div className="mt-2 max-h-36 overflow-y-auto rounded-md border border-rose-300/30 bg-rose-900/20 p-2">
                  {preview.invalidRows.slice(0, 15).map((row) => (
                    <div key={`${row.rowNumber}-${row.title}`} className="mb-1 text-rose-100">
                      Row {row.rowNumber}: {row.title || 'Untitled'} - {row.errors.join(', ')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
