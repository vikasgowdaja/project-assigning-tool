export function StatsCard({ title, value, subtitle }) {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/15 p-5 shadow-lg backdrop-blur-md">
      <p className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
        {title}
      </p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      {subtitle ? (
        <p className="mt-1 text-sm text-cyan-50/90">{subtitle}</p>
      ) : null}
    </div>
  )
}
