import { useState } from 'react'

function LookupGroup({
  title,
  type,
  items,
  pending,
  onCreate,
  onUpdate,
  onDelete
}) {
  const [newLabel, setNewLabel] = useState('')
  const [editingId, setEditingId] = useState('')
  const [editingLabel, setEditingLabel] = useState('')

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!newLabel.trim()) {
      return
    }

    const ok = await onCreate(type, newLabel.trim())
    if (ok) {
      setNewLabel('')
    }
  }

  const startEditing = (item) => {
    setEditingId(item._id)
    setEditingLabel(item.label)
  }

  const cancelEditing = () => {
    setEditingId('')
    setEditingLabel('')
  }

  const saveEditing = async () => {
    if (!editingId || !editingLabel.trim()) {
      return
    }

    const ok = await onUpdate(type, editingId, { label: editingLabel.trim() })
    if (ok) {
      cancelEditing()
    }
  }

  return (
    <div className="rounded-xl border border-white/20 bg-black/20 p-4">
      <h3 className="text-sm font-black uppercase tracking-wide text-cyan-100">{title}</h3>

      <form onSubmit={handleCreate} className="mt-3 flex gap-2">
        <input
          value={newLabel}
          onChange={(event) => setNewLabel(event.target.value)}
          placeholder={`Add ${title.toLowerCase().slice(0, -1)}`}
          className="flex-1 rounded-lg border border-white/30 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-black text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add
        </button>
      </form>

      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="text-xs text-cyan-100/80">No entries.</p>
        ) : items.map((item) => {
          const isEditing = editingId === item._id
          return (
            <div key={item._id} className="rounded-lg border border-white/15 bg-slate-900/70 p-2">
              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    value={editingLabel}
                    onChange={(event) => setEditingLabel(event.target.value)}
                    className="flex-1 rounded-md border border-white/25 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={saveEditing}
                    className="rounded bg-emerald-400 px-2 py-1 text-[11px] font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={cancelEditing}
                    className="rounded border border-white/25 bg-white/10 px-2 py-1 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-slate-100">{item.label}</p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => startEditing(item)}
                      className="rounded bg-amber-300 px-2 py-1 text-[11px] font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onDelete(type, item._id)}
                      className="rounded bg-rose-400 px-2 py-1 text-[11px] font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AdminLookupManagerSection({
  lookupCatalog,
  loading,
  pending,
  error,
  message,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh
}) {
  return (
    <section className="rounded-2xl border border-blue-300/30 bg-blue-900/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-black text-blue-100">Colleges & Departments</h2>
        <button
          type="button"
          disabled={loading || pending}
          onClick={onRefresh}
          className="rounded border border-white/30 bg-white/10 px-3 py-1 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Refresh
        </button>
      </div>
      <p className="mt-1 text-xs text-blue-100/90">
        Manage master values stored in database. Student dropdowns are synced from this list.
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

      {loading ? (
        <div className="mt-4 rounded-lg border border-white/20 bg-black/20 px-3 py-3 text-sm text-cyan-100">
          Loading lookup data...
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <LookupGroup
            title="Colleges"
            type="college"
            items={lookupCatalog.colleges}
            pending={pending}
            onCreate={onCreate}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
          <LookupGroup
            title="Departments"
            type="department"
            items={lookupCatalog.departments}
            pending={pending}
            onCreate={onCreate}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </div>
      )}
    </section>
  )
}
