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

export function AdminApprovalSection({
  totalApprovalPending,
  registrationApprovalTeams,
  teams,
  reviewingRegistrationTeamId,
  onReviewRegistrationRequest,
  getDuplicateWarnings,
  approvalTeams,
  approvalPagination,
  onApprovalPageChange,
  getProfileDiffItems,
  reviewingTeamId,
  onReviewProfileRequest,
  ideaApprovalTeams,
  ideaApprovalPagination,
  onIdeaPageChange,
  reviewingIdeaTeamId,
  onReviewCustomIdeaRequest
}) {
  return (
    <section className="rounded-2xl border border-indigo-300/30 bg-indigo-900/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-black text-indigo-100">Approval Section</h2>
        <span className="rounded-full border border-indigo-200/40 bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-100">
          Pending: {totalApprovalPending}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-emerald-200/30 bg-emerald-950/30 p-3">
        <h3 className="text-sm font-black uppercase tracking-wide text-emerald-100">
          Team Registration Approvals
        </h3>
        <p className="mt-1 text-xs text-emerald-100/85">
          Pending registrations: {registrationApprovalTeams.length}
        </p>

        <div className="mt-3 overflow-x-auto rounded-xl border border-white/15 bg-black/20">
          <table className="min-w-full divide-y divide-white/15 text-sm text-cyan-50">
            <thead className="bg-white/10 text-xs uppercase tracking-wide text-cyan-100">
              <tr>
                <th className="px-3 py-3 text-left">Team</th>
                <th className="px-3 py-3 text-left">Lead</th>
                <th className="px-3 py-3 text-left">Duplicate Signals</th>
                <th className="px-3 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {registrationApprovalTeams.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-cyan-100/80">
                    No pending team registrations.
                  </td>
                </tr>
              ) : registrationApprovalTeams.map((team) => {
                const warnings = getDuplicateWarnings(team, teams)
                return (
                  <tr key={`registration-${team._id}`} className="align-top">
                    <td className="px-3 py-3">
                      <div className="font-semibold text-white">{team.teamNumber}</div>
                      <div>{team.teamName}</div>
                      <div className="text-xs text-cyan-100/90">{team.college}</div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div className="font-semibold text-white">{team.leadName}</div>
                      <div>{team.leadEmail}</div>
                      <div>{team.leadUsn}</div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {warnings.length === 0 ? (
                        <span className="rounded border border-emerald-300/40 bg-emerald-900/30 px-2 py-1 text-emerald-100">
                          No duplicate signal
                        </span>
                      ) : (
                        <div className="space-y-1">
                          {warnings.map((warning) => (
                            <div key={`${team._id}-${warning}`} className="rounded border border-amber-300/40 bg-amber-900/30 px-2 py-1 text-amber-100">
                              {warning}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={reviewingRegistrationTeamId === team._id}
                          onClick={() => onReviewRegistrationRequest(team, 'approve')}
                          className="rounded bg-emerald-400 px-2 py-1 text-[11px] font-bold text-slate-900 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={reviewingRegistrationTeamId === team._id}
                          onClick={() => onReviewRegistrationRequest(team, 'reject')}
                          className="rounded bg-rose-400 px-2 py-1 text-[11px] font-bold text-slate-900 hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-indigo-200/30 bg-indigo-950/30 p-3">
        <h3 className="text-sm font-black uppercase tracking-wide text-indigo-100">
          Profile Update Approvals
        </h3>
        <p className="mt-1 text-xs text-indigo-100/85">
          Pending profile requests: {approvalTeams.length}
        </p>

        <div className="mt-3 overflow-x-auto rounded-xl border border-white/15 bg-black/20">
          <table className="min-w-full divide-y divide-white/15 text-sm text-cyan-50">
            <thead className="bg-white/10 text-xs uppercase tracking-wide text-cyan-100">
              <tr>
                <th className="px-3 py-3 text-left">Team</th>
                <th className="px-3 py-3 text-left">Request</th>
                <th className="px-3 py-3 text-left">Requested vs Current</th>
                <th className="px-3 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {approvalPagination.rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-cyan-100/80">
                    No pending profile update requests.
                  </td>
                </tr>
              ) : approvalPagination.rows.map((team) => {
                const diffItems = getProfileDiffItems(team)

                return (
                  <tr key={team._id} className="align-top">
                    <td className="px-3 py-3">
                      <div className="font-semibold text-white">{team.teamNumber}</div>
                      <div>{team.teamName}</div>
                      <div className="text-xs text-cyan-100/90">{team.leadEmail}</div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div>Status: <span className="font-semibold uppercase">{team.profileUpdateRequest?.status}</span></div>
                      <div>Requested: {team.profileUpdateRequest?.requestedAt ? new Date(team.profileUpdateRequest.requestedAt).toLocaleString() : '-'}</div>
                      <div>Note: {team.profileUpdateRequest?.payload?.requestNote || '-'}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="rounded border border-indigo-200/30 bg-indigo-950/30 p-2 text-xs text-indigo-100">
                        {diffItems.length > 0 ? (
                          <div className="space-y-1">
                            {diffItems.slice(0, 6).map((item) => (
                              <div key={`${team._id}-${item.label}`}>
                                <div className="font-semibold text-indigo-100">{item.label}</div>
                                <div className="text-indigo-200/90">Now: {item.current || '-'}</div>
                                <div className="text-emerald-200">Req: {item.requested || '-'}</div>
                              </div>
                            ))}
                            {diffItems.length > 6 ? (
                              <div className="text-indigo-200/80">+{diffItems.length - 6} more changes</div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="text-indigo-200/80">No field differences detected.</div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={reviewingTeamId === team._id}
                          onClick={() => onReviewProfileRequest(team, 'approve')}
                          className="rounded bg-emerald-400 px-2 py-1 text-[11px] font-bold text-slate-900 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={reviewingTeamId === team._id}
                          onClick={() => onReviewProfileRequest(team, 'reject')}
                          className="rounded bg-rose-400 px-2 py-1 text-[11px] font-bold text-slate-900 hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={approvalPagination.safePage}
          totalPages={approvalPagination.totalPages}
          onChange={onApprovalPageChange}
        />
      </div>

      <div className="mt-5 rounded-xl border border-amber-200/30 bg-amber-950/30 p-3">
        <h3 className="text-sm font-black uppercase tracking-wide text-amber-100">
          Custom Project Idea Approvals
        </h3>
        <p className="mt-1 text-xs text-amber-100/85">
          Pending custom ideas: {ideaApprovalTeams.length}
        </p>

        <div className="mt-3 overflow-x-auto rounded-xl border border-white/15 bg-black/20">
          <table className="min-w-full divide-y divide-white/15 text-sm text-cyan-50">
            <thead className="bg-white/10 text-xs uppercase tracking-wide text-cyan-100">
              <tr>
                <th className="px-3 py-3 text-left">Team</th>
                <th className="px-3 py-3 text-left">Idea</th>
                <th className="px-3 py-3 text-left">Stack</th>
                <th className="px-3 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {ideaApprovalPagination.rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-cyan-100/80">
                    No pending custom project ideas.
                  </td>
                </tr>
              ) : ideaApprovalPagination.rows.map((team) => (
                <tr key={`idea-${team._id}`} className="align-top">
                  <td className="px-3 py-3">
                    <div className="font-semibold text-white">{team.teamNumber}</div>
                    <div>{team.teamName}</div>
                    <div className="text-xs text-cyan-100/90">{team.leadEmail}</div>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <div className="font-semibold text-amber-100">{team.customProjectIdea?.title || '-'}</div>
                    <div className="mt-1 text-cyan-100/90">{team.customProjectIdea?.description || '-'}</div>
                    <div className="mt-1 text-cyan-100/80">
                      {(team.customProjectIdea?.domain || '-')}
                      {' | '}
                      {(team.customProjectIdea?.difficulty || '-')}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-cyan-100/90">
                    {Array.isArray(team.customProjectIdea?.technologies)
                      ? team.customProjectIdea.technologies.join(', ')
                      : '-'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={reviewingIdeaTeamId === team._id}
                        onClick={() => onReviewCustomIdeaRequest(team, 'approve')}
                        className="rounded bg-emerald-400 px-2 py-1 text-[11px] font-bold text-slate-900 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={reviewingIdeaTeamId === team._id}
                        onClick={() => onReviewCustomIdeaRequest(team, 'reject')}
                        className="rounded bg-rose-400 px-2 py-1 text-[11px] font-bold text-slate-900 hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={ideaApprovalPagination.safePage}
          totalPages={ideaApprovalPagination.totalPages}
          onChange={onIdeaPageChange}
        />
      </div>
    </section>
  )
}
