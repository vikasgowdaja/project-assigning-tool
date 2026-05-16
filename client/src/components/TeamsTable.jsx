import { formatDateTime } from '../utils/date'

export function TeamsTable({ teams }) {
  if (!teams.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/30 bg-white/10 p-8 text-center text-cyan-50/90">
        No teams registered yet.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/30 bg-white/10 backdrop-blur-md">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-cyan-50">
          <thead className="bg-black/20 text-xs uppercase tracking-wider text-cyan-100">
            <tr>
              <th className="px-4 py-3">Team Number</th>
              <th className="px-4 py-3">Team Name</th>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">USN</th>
              <th className="px-4 py-3">College</th>
              <th className="px-4 py-3">Assigned Project</th>
              <th className="px-4 py-3">Registered At</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team._id} className="border-t border-white/20">
                <td className="px-4 py-3 font-semibold">{team.teamNumber}</td>
                <td className="px-4 py-3">{team.teamName}</td>
                <td className="px-4 py-3">{team.leadName}</td>
                <td className="px-4 py-3">{team.leadUsn}</td>
                <td className="px-4 py-3">{team.college}</td>
                <td className="px-4 py-3">
                  {team.assignedProject?.title || (team.customProjectIdea?.title
                    ? `${team.customProjectIdea.title} (Pending Approval)`
                    : '-')}
                </td>
                <td className="px-4 py-3">{formatDateTime(team.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
