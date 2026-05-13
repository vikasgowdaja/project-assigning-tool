import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'

export function LandingPage() {
  return (
    <PageShell>
      <section className="rounded-3xl border border-white/25 bg-white/10 p-8 shadow-2xl backdrop-blur-xl md:p-12">
        <p className="mb-3 inline-flex rounded-full border border-cyan-300/60 bg-cyan-200/20 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
          Hackathon Registration Portal
        </p>
        <h1 className="max-w-3xl text-4xl font-black leading-tight text-white md:text-5xl">
          Register your team and get an instantly allocated innovation project.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-cyan-50/90 md:text-lg">
          Built for local network events. Teams register quickly, receive project
          statements instantly, and faculty can monitor live activity in the
          dashboard.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/register"
            className="rounded-xl bg-cyan-300 px-6 py-3 text-sm font-black text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-cyan-200"
          >
            Start Team Registration
          </Link>
          <Link
            to="/dashboard"
            className="rounded-xl border border-white/40 bg-white/10 px-6 py-3 text-sm font-black text-white transition hover:bg-white/20"
          >
            View Live Dashboard
          </Link>
        </div>
      </section>
    </PageShell>
  )
}
