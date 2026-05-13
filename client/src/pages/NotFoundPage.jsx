import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'

export function NotFoundPage() {
  return (
    <PageShell>
      <section className="rounded-3xl border border-white/25 bg-white/10 p-8 text-center backdrop-blur-xl">
        <h1 className="text-3xl font-black text-white">Page Not Found</h1>
        <p className="mt-2 text-cyan-50/90">The requested page does not exist.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-900"
        >
          Back to Home
        </Link>
      </section>
    </PageShell>
  )
}
