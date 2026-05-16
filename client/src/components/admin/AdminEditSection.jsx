function PaginationControls({ page, totalPages, onChange }) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-xs text-cyan-100/90">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
        className="rounded border border-white/20 bg-white/10 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Prev
      </button>
      <span>
        Page {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        className="rounded border border-white/20 bg-white/10 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  )
}

export function AdminEditSection({ editableTeams, editPagination, onEditPageChange, onEdit }) {
  return (
    <section className="rounded-2xl border border-cyan-300/30 bg-cyan-900/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-black text-cyan-100">Edit Section</h2>
        <span className="rounded-full border border-cyan-200/40 bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-100">
          Teams: {editableTeams.length}
        </span>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-white/15 bg-black/20">
        <table className="min-w-full divide-y divide-white/15 text-sm text-cyan-50">
          <thead className="bg-white/10 text-xs uppercase tracking-wide text-cyan-100">
            <tr>
              <th className="px-3 py-3 text-left">Team</th>
              <th className="px-3 py-3 text-left">Lead</th>
              <th className="px-3 py-3 text-left">College</th>
              <th className="px-3 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {editPagination.rows.map((team) => (
              <tr key={team._id} className="align-top">
                <td className="px-3 py-3">
                  <div className="font-semibold text-white">{team.teamNumber}</div>
                  <div>{team.teamName}</div>
                </td>
                <td className="px-3 py-3">
                  <div className="font-semibold text-white">{team.leadName}</div>
                  <div className="text-cyan-100/90">{team.leadEmail}</div>
                </td>
                <td className="px-3 py-3">{team.college}</td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => onEdit(team)}
                    className="rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                  >
                    Edit Team
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationControls
        page={editPagination.safePage}
        totalPages={editPagination.totalPages}
        onChange={onEditPageChange}
      />
    </section>
  )
}
