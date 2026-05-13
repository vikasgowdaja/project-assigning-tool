import { Link, useLocation, Navigate } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { formatDateTime } from '../utils/date'

export function SuccessPage() {
  const location = useLocation()
  const team = location.state?.team

  if (!team) {
    return <Navigate to="/register" replace />
  }

  return (
    <PageShell>
      <section className="rounded-3xl border border-emerald-300/40 bg-emerald-400/15 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        <p className="inline-flex rounded-full bg-emerald-200/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-100">
          Registration Successful
        </p>
        <h1 className="mt-3 text-3xl font-black text-white md:text-4xl">
          Team {team.teamNumber} is officially registered.
        </h1>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/30 bg-white/10 p-5">
            <p className="text-xs uppercase tracking-widest text-cyan-100">Assigned Project</p>
            <h2 className="mt-2 text-2xl font-black text-white">
              {team.assignedProject.title}
            </h2>
            <p className="mt-2 text-sm text-cyan-50/90">
              {team.assignedProject.description}
            </p>
            <p className="mt-3 text-xs text-cyan-100/90">
              {team.assignedProject.domain} | {team.assignedProject.difficulty}
            </p>
          </div>

          <div className="rounded-2xl border border-white/30 bg-white/10 p-5">
            <p className="text-xs uppercase tracking-widest text-cyan-100">Team Summary</p>
            <ul className="mt-3 space-y-2 text-sm text-cyan-50">
              <li>Team Name: {team.teamName}</li>
              <li>Lead: {team.leadName}</li>
              <li>USN: {team.leadUsn}</li>
              <li>College: {team.college}</li>
              <li>Department: {team.department}</li>
              <li>Members: {team.members.length}</li>
              <li>Assigned At: {formatDateTime(team.assignedAt)}</li>
            </ul>
            <div className="mt-4 rounded-xl border border-white/15 bg-black/15 p-3 text-xs text-cyan-50/90">
              <p className="font-semibold uppercase tracking-widest text-cyan-100">
                Teammates
              </p>
              <ul className="mt-2 space-y-1">
                {team.members.map((member) => (
                  <li key={`${member.usn}-${member.email}`}>
                    {member.name} - {member.usn}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/dashboard"
            className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-cyan-200"
          >
            View Live Dashboard
          </Link>
          <Link
            to="/register"
            className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
          >
            Register Another Team
          </Link>
        </div>
      </section>
    </PageShell>
  )
}
