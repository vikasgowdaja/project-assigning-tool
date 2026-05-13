import { useEffect, useMemo, useState } from 'react'
import { PageShell } from '../components/PageShell'
import { StatsCard } from '../components/StatsCard'
import { TeamsTable } from '../components/TeamsTable'
import { downloadTeamsExcel, getStats, getTeams } from '../services/api'
import { socket } from '../services/socket'

export function DashboardPage() {
  const [teams, setTeams] = useState([])
  const [stats, setStats] = useState({
    totalTeams: 0,
    remainingProjects: 0,
    totalProjects: 0,
    latestTeam: null
  })
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [teamsData, statsData] = await Promise.all([getTeams(), getStats()])
        setTeams(teamsData)
        setStats(statsData)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  useEffect(() => {
    socket.connect()

    const onTeamRegistered = ({ team, stats: liveStats }) => {
      if (team) {
        setTeams((prev) => [team, ...prev].slice(0, 200))
      }

      if (liveStats) {
        setStats((prev) => ({
          ...prev,
          ...liveStats
        }))
      }
    }

    socket.on('team:registered', onTeamRegistered)

    return () => {
      socket.off('team:registered', onTeamRegistered)
      socket.disconnect()
    }
  }, [])

  const progressLabel = useMemo(() => {
    if (!stats.totalProjects) {
      return '0%'
    }

    const progress = ((stats.totalTeams / stats.totalProjects) * 100).toFixed(0)
    return `${progress}%`
  }, [stats.totalProjects, stats.totalTeams])

  const handleDownload = async () => {
    try {
      setDownloading(true)
      await downloadTeamsExcel()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <PageShell>
      <section className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
          <h1 className="text-3xl font-black text-white md:text-4xl">
            Live Registration Dashboard
          </h1>
          <p className="mt-2 text-sm text-cyan-50/90 md:text-base">
            Public view of registered teams and allocated projects in real time.
          </p>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading ? 'Preparing Excel...' : 'Download Excel'}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Total Teams" value={stats.totalTeams} />
          <StatsCard
            title="Remaining Projects"
            value={stats.remainingProjects}
            subtitle={`${stats.totalProjects || 0} total projects`}
          />
          <StatsCard title="Registration Progress" value={progressLabel} />
          <StatsCard
            title="Latest Team"
            value={stats.latestTeam?.teamNumber || '-'}
            subtitle={stats.latestTeam?.teamName || 'Waiting for registrations'}
          />
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/30 bg-white/10 p-6 text-cyan-50">
            Loading dashboard...
          </div>
        ) : (
          <TeamsTable teams={teams} />
        )}
      </section>
    </PageShell>
  )
}
