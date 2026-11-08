import { useMediaQuery, usePersistentState } from '../lib/hooks'
import { useMemo, useState, type ReactNode } from 'react'
import { ALL_KO_TEAMS } from '../lib/data'
import { EmptyComparison, TeamBtn } from './shared'
import { METRICS, type Metric, type TeamRec, groupInfo, groupSeed, teamRecords } from '../lib/stats'

export function TeamStats({ onTeam }: { onTeam: (t: string) => void }) {
  if (!teamRecords().some((r) => r.gp > 0)) {
    return (
      <div className="glass-surface max-w-2xl rounded-lg border border-stone-200 bg-white p-5 text-sm text-stone-700" role="note">
        <p className="font-semibold text-stone-900">No statistics yet</p>
        <p className="mt-1">No games have been played in this competition, so there is nothing to measure. Statistics appear as results are recorded.</p>
      </div>
    )
  }
  return <TeamStatsView onTeam={onTeam} />
}

function TeamStatsView({ onTeam }: { onTeam: (t: string) => void }) {
  const recs = useMemo(() => teamRecords().filter((r) => r.gp > 0), [])
  const [view, setView] = usePersistentState<'ranking' | 'metrics' | 'teams'>('stats-view', 'ranking')
  const [activeMetric, setActiveMetric] = usePersistentState('stats-metric', 'win')
  const [selectedMetrics, setSelectedMetrics] = usePersistentState<string[]>('stats-metrics', ['win', 'ppg'])
  const [selectedTeams, setSelectedTeams] = usePersistentState<string[]>('stats-teams', [])
  const [koOnly, setKoOnly] = usePersistentState('stats-ko-only', false)
  const [teamOrder, setTeamOrder] = usePersistentState<'alphabetical' | 'group'>('stats-order', 'alphabetical')
  const [descending, setDescending] = usePersistentState('stats-desc', false)
  const [knockoutFirst, setKnockoutFirst] = usePersistentState('stats-ko-first', false)
  const active = METRICS.find((m) => m.key === activeMetric)!
  const comparisonMetrics = METRICS.filter((m) => selectedMetrics.includes(m.key))
  const compareTeams = (a: TeamRec, b: TeamRec) => {
    if (knockoutFirst) {
      const knockoutDifference = Number(ALL_KO_TEAMS.has(b.team)) - Number(ALL_KO_TEAMS.has(a.team))
      if (knockoutDifference) return knockoutDifference
    }
    let result = 0
    if (teamOrder === 'alphabetical') {
      result = a.team.localeCompare(b.team)
    } else {
      const ai = groupInfo(a.team), bi = groupInfo(b.team)
      result = ai.group - bi.group || ai.position - bi.position || a.team.localeCompare(b.team)
    }
    return descending ? -result : result
  }
  const visibleTeams = recs
    .filter((r) => !koOnly || ALL_KO_TEAMS.has(r.team))
    .sort(compareTeams)
  const comparedTeams = selectedTeams
    .map((name) => recs.find((r) => r.team === name))
    .filter((r): r is TeamRec => Boolean(r))
    .filter((r) => !koOnly || ALL_KO_TEAMS.has(r.team))
    .sort(compareTeams)

  const toggleMetric = (key: string) => {
    setSelectedMetrics((current) => current.includes(key) ? current.filter((k) => k !== key) : [...current, key])
  }
  const toggleTeam = (name: string) => {
    setSelectedTeams((current) => current.includes(name) ? current.filter((t) => t !== name) : [...current, name])
  }

  return (
    <div>
      <div className="mb-5 max-w-3xl text-sm text-stone-600">
        <p>
          Team-level statistics, expressed per game, are derived from all completed matches. The figure in brackets is the number of games played,
          which should be considered when comparing teams with small samples. Individual player statistics are not available.
        </p>
        <p className="mt-2 text-xs text-stone-500">Cancelled fixtures and those involving the withdrawn team are excluded. Walk-overs are counted at their recorded score. Completed knockout matches are included.</p>
      </div>

      <div className="glass-surface mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 p-3">
        {([
          ['ranking', 'Statistic ranking'],
          ['metrics', 'Compare statistics'],
          ['teams', 'Compare teams'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`liquid rounded-full border px-4 py-1.5 text-sm ${
              view === key ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-stone-300 bg-white text-stone-700'
            }`}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto flex overflow-hidden rounded-full border border-stone-300 text-xs" role="group" aria-label="Team pool">
          <button onClick={() => setKoOnly(false)} className={`liquid px-3 py-1.5 ${!koOnly ? 'bg-emerald-800 text-white' : 'bg-white text-stone-700'}`}>All teams</button>
          <button onClick={() => setKoOnly(true)} className={`liquid px-3 py-1.5 ${koOnly ? 'bg-emerald-800 text-white' : 'bg-white text-stone-700'}`}>Knockout teams</button>
        </div>
      </div>

      {view === 'ranking' && (
        <>
          <StatChoice value={activeMetric} onChange={setActiveMetric} />
          <StatCard metric={active} recs={recs} koOnly={koOnly} onTeam={onTeam} />
        </>
      )}

      {view === 'metrics' && (
        <>
          <MultiMetricChoice selected={selectedMetrics} onToggle={toggleMetric} />
          {comparisonMetrics.length ? (
            <BalancedComparison items={comparisonMetrics} getKey={(metric) => metric.key}>
              {(metric) => (
                <StatCard key={metric.key} metric={metric} recs={recs} koOnly={koOnly} onTeam={onTeam} compact />
              )}
            </BalancedComparison>
          ) : (
            <EmptyComparison text="Choose one or more statistics above to build a comparison." />
          )}
        </>
      )}

      {view === 'teams' && (
        <>
          <div className="glass-surface mb-4 rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">Select teams</h3>
                <p className="text-xs text-stone-500">Select any number. The comparison layout adapts automatically.</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <label className="liquid flex items-center gap-1.5 rounded-full border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs text-stone-700">
                  <input
                    type="checkbox"
                    checked={knockoutFirst}
                    onChange={(e) => setKnockoutFirst(e.target.checked)}
                    className="accent-emerald-800"
                  />
                  Knockout teams first
                </label>
                <select
                  value={teamOrder}
                  onChange={(e) => setTeamOrder(e.target.value as 'alphabetical' | 'group')}
                  aria-label="Arrange teams by"
                  className="glass-control rounded-full border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs text-stone-700 outline-none focus:border-emerald-700"
                >
                  <option value="alphabetical">Alphabetical</option>
                  <option value="group">Group and position</option>
                </select>
                <button
                  onClick={() => setDescending((value) => !value)}
                  className="liquid flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 bg-stone-50 text-stone-700"
                  aria-label={descending ? 'Change to increasing order' : 'Change to decreasing order'}
                  title={descending ? 'Currently decreasing; change to increasing' : 'Currently increasing; change to decreasing'}
                >
                  <svg className={descending ? 'rotate-180' : ''} width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 12V2M3.5 5.5 7 2l3.5 3.5" />
                  </svg>
                </button>
                {selectedTeams.length > 0 && (
                  <button onClick={() => setSelectedTeams([])} className="liquid rounded px-2 py-1 text-xs font-medium text-emerald-800 hover:underline">Clear selection</button>
                )}
              </div>
            </div>
            <div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
              {visibleTeams.map((r) => {
                const selected = selectedTeams.includes(r.team)
                return (
                  <button
                    key={r.team}
                    onClick={() => toggleTeam(r.team)}
                    aria-pressed={selected}
                    className={`liquid rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      selected ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-stone-300 bg-stone-50 text-stone-700'
                    }`}
                  >
                    {r.team} <span className="font-normal opacity-90">({groupSeed(r.team)})</span>
                  </button>
                )
              })}
            </div>
          </div>
          <MultiMetricChoice selected={selectedMetrics} onToggle={toggleMetric} label="Statistics shown for each team" />
          {comparedTeams.length ? (
            <BalancedComparison items={comparedTeams} getKey={(r) => r.team} minCardWidth={300}>
              {(r) => (
                <TeamStatCard key={r.team} rec={r} metrics={comparisonMetrics} onTeam={onTeam} />
              )}
            </BalancedComparison>
          ) : (
            <EmptyComparison text="Select at least one team to begin the comparison." />
          )}
        </>
      )}
    </div>
  )
}

export function BalancedComparison<T>({
  items,
  getKey,
  children,
  minCardWidth = 340,
}: {
  items: T[]
  getKey: (item: T) => string
  children: (item: T) => ReactNode
  minCardWidth?: number
}) {
  // On phones every card gets the full width; from tablet up, at most two balanced rows.
  const narrow = useMediaQuery('(max-width: 767px)')
  const firstCount = items.length <= 3 ? items.length : Math.ceil(items.length / 2)
  const rows = narrow ? items.map((item) => [item]) : items.length <= 3 ? [items] : [items.slice(0, firstCount), items.slice(firstCount)]
  const minWidth = narrow ? 0 : Math.max(0, firstCount * minCardWidth + (firstCount - 1) * 20)
  return (
    <div className="overflow-x-auto pb-2">
      <div className="space-y-5" style={{ minWidth }}>
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid gap-5" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
            {row.map((item) => <div key={getKey(item)}>{children(item)}</div>)}
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatChoice({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Statistic">
      {METRICS.map((metric) => (
        <button
          key={metric.key}
          role="tab"
          aria-selected={value === metric.key}
          onClick={() => onChange(metric.key)}
          className={`liquid rounded-full border px-4 py-1.5 text-sm ${
            value === metric.key ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-stone-300 bg-white text-stone-700'
          }`}
        >
          {metric.title}
        </button>
      ))}
    </div>
  )
}

export function MultiMetricChoice({
  selected,
  onToggle,
  label = 'Choose statistics to compare',
}: {
  selected: string[]
  onToggle: (key: string) => void
  label?: string
}) {
  return (
    <div className="glass-surface mb-5 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">{label}</h3>
          <p className="text-xs text-stone-500">No selection limit. Selected statistics appear together below.</p>
        </div>
        <span className="shrink-0 text-xs text-stone-500">{selected.length} selected</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {METRICS.map((metric) => {
          const active = selected.includes(metric.key)
          return (
            <button
              key={metric.key}
              onClick={() => onToggle(metric.key)}
              aria-pressed={active}
              className={`liquid rounded-full border px-3 py-1.5 text-xs font-medium ${
                active ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-stone-300 bg-stone-50 text-stone-700'
              }`}
            >
              {metric.title}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function StatCard({
  metric,
  recs,
  koOnly,
  onTeam,
  compact = false,
}: {
  metric: Metric
  recs: TeamRec[]
  koOnly: boolean
  onTeam: (t: string) => void
  compact?: boolean
}) {
  const rows = useMemo(() => {
    const list = recs.filter((r) => !koOnly || ALL_KO_TEAMS.has(r.team))
    return list
      .map((r) => ({ r, v: metric.value(r) }))
      .sort((a, b) => (metric.higherIsBetter ? b.v - a.v : a.v - b.v) || b.r.gp - a.r.gp || a.r.team.localeCompare(b.r.team))
  }, [recs, koOnly, metric])
  const max = Math.max(...rows.map((x) => Math.abs(x.v)), 0.0001)
  return (
    <section className="glass-surface rounded-xl border border-stone-200 bg-white">
      <div className="border-b border-stone-100 p-4">
        <div>
          <h3 className="font-semibold">{metric.title}</h3>
          <p className="text-xs text-stone-500">{metric.desc}</p>
        </div>
      </div>
      <ol className={`${compact ? 'max-h-[24rem]' : 'max-h-[34rem]'} overflow-y-auto p-2`}>
        {rows.map(({ r, v }, i) => (
          <li key={r.team} className="liquid flex items-center gap-3 rounded-md px-2 py-1.5 text-sm">
            <span className="w-6 text-right text-xs text-stone-500 tabular-nums">{i + 1}</span>
            <span className="w-24 shrink-0 sm:w-32">
              <TeamBtn name={r.team} onTeam={onTeam} />
              <span className="ml-1 text-xs text-stone-500">({groupSeed(r.team)})</span>
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
              <span
                className={`block h-full min-w-2 rounded-full ${ALL_KO_TEAMS.has(r.team) ? 'bg-emerald-600' : 'bg-stone-400'}`}
                style={{ width: v === 0 ? 8 : `${Math.max(2, (Math.abs(v) / max) * 100)}%` }}
              />
            </span>
            <span className="w-20 shrink-0 text-right tabular-nums sm:w-24">
              <span className="font-semibold">{metric.fmt(v)}</span>
              <span className="ml-1 text-xs text-stone-500">({r.gp})</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="border-t border-stone-100 px-4 py-2 text-[11px] text-stone-500">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-600" /> Reached knockout
        <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-full bg-stone-400" /> Did not advance · (n) = games played
      </p>
    </section>
  )
}

export function TeamStatCard({ rec, metrics, onTeam }: { rec: TeamRec; metrics: Metric[]; onTeam: (t: string) => void }) {
  return (
    <section className="glass-surface overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="flex items-center justify-between bg-emerald-950 px-5 py-4 text-white">
        <div>
          <TeamBtn name={rec.team} onTeam={onTeam} className="text-lg text-white hover:text-emerald-200" />
          <span className="ml-2 text-xs text-emerald-200">({groupSeed(rec.team)})</span>
        </div>
        <span className="rounded-full bg-emerald-900 px-2.5 py-1 text-xs text-emerald-100">{rec.gp} games</span>
      </div>
      {metrics.length ? (
        <dl className="divide-y divide-stone-100">
          {metrics.map((metric) => (
            <div key={metric.key} className="liquid flex items-center justify-between gap-4 px-5 py-3">
              <div>
                <dt className="text-sm font-medium">{metric.title}</dt>
                <dd className="text-xs text-stone-500">{metric.desc}</dd>
              </div>
              <dd className="shrink-0 text-xl font-semibold tabular-nums">
                {metric.fmt(metric.value(rec))}
                <span className="ml-1 text-xs font-normal text-stone-500">({rec.gp})</span>
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="p-5 text-sm text-stone-500">Select at least one statistic to display.</p>
      )}
    </section>
  )
}
