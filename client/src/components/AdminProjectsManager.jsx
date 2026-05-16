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

export function AdminProjectsManager({ onProjectsChanged, projects = [] }) {
  const [form, setForm] = useState(initialForm)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)

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
    setUploadResult(null)

    try {
      const result = await uploadProjectsFile(file)
      setMessage(
        `Upload complete. Inserted: ${result.insertedCount}, skipped: ${result.skippedCount}, invalid rows: ${result.invalidCount || 0}`
      )
      setPreview(null)
      setUploadResult(result)
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
    setUploadResult(null)

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
            Excel headers accepted: title/project title, description/desc, difficulty/level, domain/category, technologies/tech stack.
          </p>
          <p className="text-xs text-cyan-100/80">
            PDF: one project per line in format title | description | difficulty | domain | tech1,tech2.
          </p>
          <p className="text-xs text-cyan-100/80">
            Tip: Keep one project per row and avoid blank separator rows.
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
              {preview.validRows?.length > 0 && (
                <div className="mt-2 max-h-44 overflow-y-auto rounded-md border border-emerald-300/30 bg-emerald-900/20 p-2">
                  <div className="mb-1 font-semibold uppercase tracking-wide text-emerald-100">
                    Valid Row Mapping Preview
                  </div>
                  {preview.validRows.map((row) => (
                    <div key={`valid-${row.rowNumber}-${row.title}`} className="mb-2 rounded border border-emerald-200/20 p-2">
                      <div>Row {row.rowNumber}</div>
                      <div>Title: {row.title}</div>
                      <div>Description: {row.description}</div>
                      <div>Difficulty: {row.difficulty}</div>
                      <div>Domain: {row.domain}</div>
                      <div>Technologies: {Array.isArray(row.technologies) ? row.technologies.join(', ') : row.technologies || '-'}</div>
                    </div>
                  ))}
                </div>
              )}
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

          {uploadResult?.loadedProjects?.length > 0 && (
            <div className="rounded-lg border border-emerald-300/30 bg-emerald-900/20 p-3 text-xs text-emerald-100">
              <div className="font-semibold uppercase tracking-wide">Loaded Projects Confirmation</div>
              <div className="mt-1">Inserted: {uploadResult.insertedCount} | Skipped: {uploadResult.skippedCount}</div>
              <div className="mt-2 max-h-44 overflow-y-auto rounded border border-emerald-200/20 p-2">
                {uploadResult.loadedProjects.map((project) => (
                  <div key={`loaded-${project.rowNumber}-${project.title}`} className="mb-2 rounded border border-emerald-200/20 p-2">
                    <div>Source Row: {project.rowNumber || '-'}</div>
                    <div>Title: {project.title}</div>
                    <div>Description: {project.description}</div>
                    <div>Difficulty: {project.difficulty}</div>
                    <div>Domain: {project.domain}</div>
                    <div>Technologies: {Array.isArray(project.technologies) ? project.technologies.join(', ') : '-'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-cyan-100">
            Populated Projects (Row by Row)
          </h3>
          <span className="text-xs text-cyan-100/80">Total Loaded: {projects.length}</span>
        </div>

        {!projects.length ? (
          <div className="mt-3 rounded-lg border border-dashed border-white/20 bg-black/20 px-3 py-3 text-xs text-cyan-100/80">
            No projects available yet.
          </div>
        ) : (
          <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-white/15">
            <table className="min-w-full divide-y divide-white/15 text-left text-xs text-cyan-50">
              <thead className="bg-white/10 uppercase tracking-wide text-cyan-100">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Difficulty</th>
                  <th className="px-3 py-2">Domain</th>
                  <th className="px-3 py-2">Technologies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-black/10">
                {projects.map((project, index) => (
                  <tr key={project._id || `${project.title}-${index}`} className="align-top">
                    <td className="px-3 py-2 font-semibold text-cyan-100">{index + 1}</td>
                    <td className="px-3 py-2 font-semibold text-white">{project.title || '-'}</td>
                    <td className="px-3 py-2 text-cyan-50/90">{project.description || '-'}</td>
                    <td className="px-3 py-2">{project.difficulty || '-'}</td>
                    <td className="px-3 py-2">{project.domain || '-'}</td>
                    <td className="px-3 py-2">
                      {Array.isArray(project.technologies) && project.technologies.length > 0
                        ? project.technologies.join(', ')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
