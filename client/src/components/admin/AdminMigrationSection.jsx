const MIGRATION_MODES = [
  { value: 'missing-only', label: 'Missing Status Only' },
  { value: 'pending-with-assigned', label: 'Pending + Assigned Project' },
  { value: 'pending-all', label: 'All Pending Records' }
]

const REGISTRATION_STATUS_ENUM = [
  { value: 'approved', label: 'approved' },
  { value: 'pending', label: 'pending' },
  { value: 'rejected', label: 'rejected' }
]

const MIGRATION_NOTE_TEMPLATES = [
  { value: 'Admin bulk migration', label: 'Admin bulk migration' },
  { value: 'Legacy records backfill', label: 'Legacy records backfill' },
  { value: 'Schema compatibility migration', label: 'Schema compatibility migration' }
]

export function AdminMigrationSection({
  migrationSummary,
  migrationMessage,
  migrationLoading,
  showMigrationWizard,
  migrationConfig,
  onSetMigrationConfig,
  onOpenWizard,
  onCloseWizard,
  onRunMigration,
  onRefreshSummary
}) {
  return (
    <section className="rounded-2xl border border-fuchsia-300/30 bg-fuchsia-900/20 p-4">
      <h2 className="text-lg font-black text-fuchsia-100">Data Migration</h2>
      <p className="mt-1 text-xs text-fuchsia-100/90">
        Bulk-fix old records when new schema fields are introduced.
      </p>

      {migrationMessage ? (
        <div className="mt-3 rounded-lg border border-emerald-300/40 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-100">
          {migrationMessage}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-white/20 bg-black/20 p-3 text-sm text-fuchsia-100 md:col-span-3">
          <p className="font-semibold">Fields Updated By Migration</p>
          <div className="mt-2 overflow-x-auto rounded border border-white/20">
            <table className="min-w-full text-left text-xs text-fuchsia-100">
              <thead className="bg-white/10 uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2">Field</th>
                  <th className="px-3 py-2">Value Source</th>
                  <th className="px-3 py-2">Allowed Values (Enum)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                <tr>
                  <td className="px-3 py-2">registrationStatus</td>
                  <td className="px-3 py-2">Selected in migration popup</td>
                  <td className="px-3 py-2">approved | pending | rejected</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">registrationReviewedAt</td>
                  <td className="px-3 py-2">System current timestamp</td>
                  <td className="px-3 py-2">DateTime (auto)</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">registrationReviewedBy</td>
                  <td className="px-3 py-2">Current admin user</td>
                  <td className="px-3 py-2">String (auto)</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">registrationReviewNote</td>
                  <td className="px-3 py-2">Selected note template</td>
                  <td className="px-3 py-2">Template dropdown values</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-white/20 bg-black/20 p-3 text-sm text-fuchsia-100">
          <p><strong>Total Teams:</strong> {migrationSummary?.totalTeams ?? '-'}</p>
          <p><strong>Approved:</strong> {migrationSummary?.approved ?? '-'}</p>
          <p><strong>Pending:</strong> {migrationSummary?.pending ?? '-'}</p>
          <p><strong>Rejected:</strong> {migrationSummary?.rejected ?? '-'}</p>
        </div>
        <div className="rounded-lg border border-white/20 bg-black/20 p-3 text-sm text-fuchsia-100">
          <p><strong>Missing Status:</strong> {migrationSummary?.missingStatus ?? '-'}</p>
          <p><strong>Pending + Assigned:</strong> {migrationSummary?.pendingWithAssignedProject ?? '-'}</p>
          <p><strong>Pending + Idea:</strong> {migrationSummary?.pendingWithCustomIdea ?? '-'}</p>
        </div>
        <div className="rounded-lg border border-white/20 bg-black/20 p-3 text-sm text-fuchsia-100">
          <p className="font-semibold">Bulk Actions</p>
          <div className="mt-2 flex flex-col gap-2">
            <button
              type="button"
              disabled={migrationLoading}
              onClick={() => onOpenWizard('missing-only')}
              className="rounded bg-fuchsia-400 px-3 py-2 text-xs font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Open Migration Wizard (Missing Status)
            </button>
            <button
              type="button"
              disabled={migrationLoading}
              onClick={() => onOpenWizard('pending-with-assigned')}
              className="rounded bg-indigo-400 px-3 py-2 text-xs font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Open Migration Wizard (Pending + Assigned)
            </button>
            <button
              type="button"
              disabled={migrationLoading}
              onClick={() => onOpenWizard('pending-all')}
              className="rounded bg-amber-400 px-3 py-2 text-xs font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Open Migration Wizard (Pending All)
            </button>
            <button
              type="button"
              disabled={migrationLoading}
              onClick={onRefreshSummary}
              className="rounded border border-white/30 bg-white/10 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Refresh Summary
            </button>
          </div>
        </div>
      </div>

      {showMigrationWizard ? (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-fuchsia-300/40 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-black text-white">Migration Wizard</h3>
            <p className="mt-1 text-sm text-fuchsia-100/90">
              Select enum values below. These fields will be updated in bulk.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-fuchsia-100">
                  Migration Mode (Enum)
                </label>
                <select
                  value={migrationConfig.mode}
                  onChange={(event) => onSetMigrationConfig('mode', event.target.value)}
                  className="w-full rounded-lg border border-white/25 bg-slate-800 px-3 py-2 text-slate-100"
                >
                  {MIGRATION_MODES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-fuchsia-100">
                  registrationStatus (Enum)
                </label>
                <select
                  value={migrationConfig.targetStatus}
                  onChange={(event) => onSetMigrationConfig('targetStatus', event.target.value)}
                  className="w-full rounded-lg border border-white/25 bg-slate-800 px-3 py-2 text-slate-100"
                >
                  {REGISTRATION_STATUS_ENUM.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-fuchsia-100">
                  reviewNote Template (Enum)
                </label>
                <select
                  value={migrationConfig.reviewNote}
                  onChange={(event) => onSetMigrationConfig('reviewNote', event.target.value)}
                  className="w-full rounded-lg border border-white/25 bg-slate-800 px-3 py-2 text-slate-100"
                >
                  {MIGRATION_NOTE_TEMPLATES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-white/20 bg-black/20 p-3 text-xs text-fuchsia-100">
              <p><strong>Will update fields:</strong> registrationStatus, registrationReviewedAt, registrationReviewedBy, registrationReviewNote</p>
              <p className="mt-1"><strong>Selected values:</strong> {migrationConfig.mode} | {migrationConfig.targetStatus} | {migrationConfig.reviewNote}</p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCloseWizard}
                disabled={migrationLoading}
                className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onRunMigration(migrationConfig)}
                disabled={migrationLoading}
                className="rounded-lg bg-fuchsia-400 px-4 py-2 text-sm font-black text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {migrationLoading ? 'Applying...' : 'Apply Migration'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
