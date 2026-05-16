export function AdminGithubCollaborationSection({
  githubTeams,
  reviewingGithubTeamId,
  onReviewGithubCollaboration
}) {
  return (
    <section className="rounded-2xl border border-sky-300/30 bg-sky-900/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-black text-sky-100">GitHub Collaboration</h2>
        <span className="rounded-full border border-sky-200/40 bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-100">
          Teams: {githubTeams.length}
        </span>
      </div>
      <p className="mt-1 text-xs text-sky-100/90">
        Manage repository links and mark collaboration status after invite acceptance.
      </p>

      <div className="mt-3 overflow-x-auto rounded-xl border border-white/15 bg-black/20">
        <table className="min-w-full divide-y divide-white/15 text-sm text-cyan-50">
          <thead className="bg-white/10 text-xs uppercase tracking-wide text-cyan-100">
            <tr>
              <th className="px-3 py-3 text-left">Team</th>
              <th className="px-3 py-3 text-left">GitHub Repository</th>
              <th className="px-3 py-3 text-left">Status</th>
              <th className="px-3 py-3 text-left">Marked By</th>
              <th className="px-3 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {githubTeams.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-cyan-100/80">
                  No approved teams available.
                </td>
              </tr>
            ) : githubTeams.map((team) => {
              const hasRepo = Boolean(team.githubRepoUrl)
              const isCollaborated = team.collaborationStatus === 'collaborated'
              const isPending = team.collaborationStatus === 'pending'
              const isBusy = reviewingGithubTeamId === team._id

              const canMarkCollaborated = hasRepo && !isCollaborated && !isBusy
              const canMarkPending = hasRepo && !isPending && !isBusy

              return (
                <tr key={`github-${team._id}`} className="align-top">
                  <td className="px-3 py-3">
                    <div className="font-semibold text-white">{team.teamNumber}</div>
                    <div>{team.teamName}</div>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {team.githubRepoUrl ? (
                      <a
                        href={team.githubRepoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all font-semibold text-sky-300 underline hover:text-sky-200"
                      >
                        {team.githubRepoUrl}
                      </a>
                    ) : (
                      <span className="text-cyan-100/70">Not submitted</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <span className={`rounded border px-2 py-1 font-semibold uppercase ${
                      isCollaborated
                        ? 'border-emerald-300/40 bg-emerald-900/30 text-emerald-100'
                        : 'border-amber-300/40 bg-amber-900/30 text-amber-100'
                    }`}>
                      {isCollaborated ? 'Collaborated' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-cyan-100/90">
                    <div>{team.collaborationMarkedBy || '-'}</div>
                    <div>
                      {team.collaborationMarkedAt
                        ? new Date(team.collaborationMarkedAt).toLocaleString()
                        : '-'}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        disabled={!canMarkCollaborated}
                        onClick={() => onReviewGithubCollaboration(team, 'collaborated')}
                        className={`rounded px-2 py-1 text-[11px] font-bold ${
                          canMarkCollaborated
                            ? 'bg-emerald-400 text-slate-900 hover:bg-emerald-300 ring-1 ring-emerald-200/60'
                            : 'cursor-not-allowed bg-slate-700 text-slate-300 opacity-70'
                        }`}
                      >
                        Mark Collaborated
                      </button>
                      <button
                        type="button"
                        disabled={!canMarkPending}
                        onClick={() => onReviewGithubCollaboration(team, 'pending')}
                        className={`rounded px-2 py-1 text-[11px] font-bold ${
                          canMarkPending
                            ? 'bg-amber-400 text-slate-900 hover:bg-amber-300 ring-1 ring-amber-200/60'
                            : 'cursor-not-allowed bg-slate-700 text-slate-300 opacity-70'
                        }`}
                      >
                        Mark Pending
                      </button>
                    </div>
                    {isCollaborated ? (
                      <p className="mt-1 text-[10px] text-emerald-200/90">
                        Locked until team resubmits a different GitHub URL.
                      </p>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
