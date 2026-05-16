const TAB_META = {
  approval: {
    label: 'Approval',
    active: 'bg-indigo-400 text-slate-950',
    idle: 'border border-indigo-300/40 bg-indigo-900/30 text-indigo-100 hover:bg-indigo-800/40'
  },
  edit: {
    label: 'Edit',
    active: 'bg-cyan-400 text-slate-950',
    idle: 'border border-cyan-300/40 bg-cyan-900/30 text-cyan-100 hover:bg-cyan-800/40'
  },
  directory: {
    label: 'Directory',
    active: 'bg-blue-300 text-slate-950',
    idle: 'border border-blue-300/40 bg-blue-900/30 text-blue-100 hover:bg-blue-800/40'
  },
  projects: {
    label: 'Projects',
    active: 'bg-amber-300 text-slate-950',
    idle: 'border border-amber-300/40 bg-amber-900/30 text-amber-100 hover:bg-amber-800/40'
  },
  github: {
    label: 'GitHub',
    active: 'bg-sky-300 text-slate-950',
    idle: 'border border-sky-300/40 bg-sky-900/30 text-sky-100 hover:bg-sky-800/40'
  },
  revoke: {
    label: 'Revoke',
    active: 'bg-rose-400 text-slate-950',
    idle: 'border border-rose-300/40 bg-rose-900/30 text-rose-100 hover:bg-rose-800/40'
  },
  security: {
    label: 'Password Security',
    active: 'bg-emerald-300 text-slate-950',
    idle: 'border border-emerald-300/40 bg-emerald-900/30 text-emerald-100 hover:bg-emerald-800/40'
  },
  migration: {
    label: 'Migration',
    active: 'bg-fuchsia-300 text-slate-950',
    idle: 'border border-fuchsia-300/40 bg-fuchsia-900/30 text-fuchsia-100 hover:bg-fuchsia-800/40'
  },
  bulkUpdate: {
    label: 'Bulk Update Teams',
    active: 'bg-teal-300 text-slate-950',
    idle: 'border border-teal-300/40 bg-teal-900/30 text-teal-100 hover:bg-teal-800/40'
  }
}

export function AdminFlowTabs({ activeFlow, onChange, counts }) {
  const order = ['approval', 'edit', 'directory', 'projects', 'github', 'revoke', 'security', 'migration', 'bulkUpdate']

  return (
    <div className="rounded-2xl border border-white/20 bg-black/20 p-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-8">
        {order.map((key) => {
          const meta = TAB_META[key]
          const isActive = activeFlow === key
          const count = counts?.[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`rounded-lg px-3 py-2 text-sm font-bold transition ${isActive ? meta.active : meta.idle}`}
            >
              {meta.label}{typeof count === 'number' ? ` (${count})` : ''}
            </button>
          )
        })}
      </div>
    </div>
  )
}
