import { useMemo, useRef, useState } from 'react'
import { EmptyComparison } from './shared'
import { groupSeed } from '../lib/stats'
import { FINISHES, type FinishKey, type SimAggregate, type SimulationRun, runOneSimulation, simulationStrengths } from '../lib/simulation'

export function Simulation() {
  const [count, setCount] = useState(1000)
  const [runs, setRuns] = useState<SimulationRun[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [sort, setSort] = useState<FinishKey | 'wins' | 'gf' | 'ga'>('champion')
  const [query, setQuery] = useState('')
  const cancelled = useRef(false)
  const active = runs.find((run) => run.id === activeId) ?? runs[0]

  const start = async () => {
    const simulations = Math.max(1, Math.min(100000, Math.round(count || 1)))
    setCount(simulations)
    setRunning(true)
    setProgress(0)
    cancelled.current = false
    const teams = [...ALL_KO_TEAMS].sort()
    const aggregate = new Map<string, SimAggregate>(teams.map((team) => [
      team,
      {
        team,
        matches: 0,
        wins: 0,
        gf: 0,
        ga: 0,
        finishes: { r14: 0, qf: 0, fourth: 0, third: 0, runnerUp: 0, champion: 0 },
      },
    ]))
    const strengths = simulationStrengths()
    // Use approximately 100 equal visual steps regardless of run size. A fixed
    // batch made small runs jump abruptly and large runs appear out of sync.
    const batchSize = Math.max(1, Math.ceil(simulations / 100))
    for (let i = 0; i < simulations; i += batchSize) {
      const end = Math.min(simulations, i + batchSize)
      for (let j = i; j < end; j++) runOneSimulation(strengths, aggregate)
      setProgress(end / simulations)
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      if (cancelled.current) {
        setRunning(false)
        return
      }
    }
    const run: SimulationRun = {
      id: Date.now(),
      createdAt: new Date(),
      count: simulations,
      aggregates: [...aggregate.values()],
    }
    setRuns((current) => [run, ...current].slice(0, 12))
    setActiveId(run.id)
    setRunning(false)
  }

  const rows = useMemo(() => {
    if (!active) return []
    const value = (r: SimAggregate) => {
      if (sort === 'wins') return r.wins / active.count
      if (sort === 'gf') return r.gf / active.count
      if (sort === 'ga') return r.ga / active.count
      return r.finishes[sort] / active.count
    }
    return active.aggregates
      .filter((r) => `${r.team} ${groupSeed(r.team)}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => sort === 'ga' ? value(a) - value(b) : value(b) - value(a))
  }, [active, query, sort])

  const exportCsv = () => {
    if (!active) return
    const header = ['Team', 'Simulations', 'Avg wins', 'Avg goals scored', 'Avg goals conceded', ...FINISHES.map((f) => f.full)]
    const lines = active.aggregates.map((r) => [
      r.team,
      active.count,
      (r.wins / active.count).toFixed(4),
      (r.gf / active.count).toFixed(4),
      (r.ga / active.count).toFixed(4),
      ...FINISHES.map((f) => r.finishes[f.key]),
    ])
    const csv = [header, ...lines].map((line) => line.join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `knockout-simulation-${active.count}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const top = active
    ? [...active.aggregates].sort((a, b) => b.finishes.champion - a.finishes.champion).slice(0, 3)
    : []

  return (
    <div>
      <div className="mb-6 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Monte Carlo knockout simulation</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Simulate the final round</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Each simulation plays the official 14-team bracket from the Round of 14 through the final and third-place play-off.
          Completed knockout results are treated as fixed. Remaining matches use smoothed scoring and conceding rates from the available team data.
        </p>
      </div>

      <section className="glass-surface mb-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">Number of simulations</span>
            <input
              type="number"
              min={1}
              max={100000}
              step={100}
              value={count}
              disabled={running}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-44 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm tabular-nums outline-none focus:border-emerald-700"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {[100, 1000, 10000, 50000].map((n) => (
              <button
                key={n}
                disabled={running}
                onClick={() => setCount(n)}
                className={`liquid rounded-full border px-3 py-2 text-xs font-medium ${count === n ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-stone-300 bg-white text-stone-700'}`}
              >
                {n.toLocaleString()}
              </button>
            ))}
          </div>
          {running ? (
            <button onClick={() => { cancelled.current = true }} className="ml-auto rounded-lg border border-rose-300 bg-rose-50 px-5 py-2 text-sm font-semibold text-rose-700">
              Stop simulation
            </button>
          ) : (
            <button onClick={start} className="liquid ml-auto rounded-lg bg-emerald-800 px-5 py-2 text-sm font-semibold text-white shadow-sm">
              Run simulation
            </button>
          )}
        </div>
        {running && (
          <div className="mt-5">
            <div className="mb-1 flex justify-between text-xs text-stone-500">
              <span>Running tournament simulations…</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-stone-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-stone-500">
          Storage remains compact: a run saves only aggregate wins, goals, matches and finishing counts for 14 teams—not individual simulated fixtures.
          Up to 12 run summaries are retained for this browser session.
        </p>
      </section>

      {!active ? (
        <EmptyComparison text="Choose the number of simulations and run the model to generate probabilities." />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <label className="text-sm text-stone-600">
              Run
              <select
                value={active.id}
                onChange={(e) => setActiveId(Number(e.target.value))}
                className="ml-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700"
              >
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.count.toLocaleString()} simulations · {run.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={exportCsv} className="liquid rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700">
              Export aggregate CSV
            </button>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {top.map((r, index) => (
              <div key={r.team} className={`liquid rounded-xl border p-4 ${index === 0 ? 'border-amber-300 bg-amber-50' : 'border-stone-200 bg-white'}`}>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">#{index + 1} title probability</p>
                <p className="mt-1 text-lg font-semibold">{r.team} <span className="text-xs font-normal text-stone-500">({groupSeed(r.team)})</span></p>
                <p className={`mt-2 text-3xl font-semibold tabular-nums ${index === 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                  {((r.finishes.champion / active.count) * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>

          <section className="glass-surface overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b border-stone-200 p-4">
              <div>
                <h3 className="font-semibold">Aggregate outcomes</h3>
                <p className="text-xs text-stone-500">Percentages show the share of {active.count.toLocaleString()} simulations ending in each position.</p>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter teams"
                className="ml-auto w-40 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-emerald-700"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-sm">
                <thead className="bg-stone-100 text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Team</th>
                    {[
                      ['wins', 'Wins / sim'],
                      ['gf', 'GF / sim'],
                      ['ga', 'GA / sim'],
                      ...FINISHES.map((f) => [f.key, f.short]),
                    ].map(([key, label]) => (
                      <th key={key} className="px-3 py-3 text-right">
                        <button onClick={() => setSort(key as typeof sort)} className={`liquid rounded px-1 py-0.5 ${sort === key ? 'font-bold text-emerald-800' : 'hover:text-stone-800'}`}>
                          {label}{sort === key ? ' ↓' : ''}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.team} className="liquid border-t border-stone-100">
                      <td className="px-4 py-3 font-semibold">{r.team} <span className="text-xs font-normal text-stone-500">({groupSeed(r.team)})</span></td>
                      <td className="px-3 py-3 text-right tabular-nums">{(r.wins / active.count).toFixed(2)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{(r.gf / active.count).toFixed(2)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{(r.ga / active.count).toFixed(2)}</td>
                      {FINISHES.map((finish) => (
                        <td key={finish.key} className={`px-3 py-3 text-right tabular-nums ${finish.key === 'champion' ? 'font-semibold text-emerald-800' : ''}`}>
                          {((r.finishes[finish.key] / active.count) * 100).toFixed(1)}%
                          <span className="ml-1 text-[10px] text-stone-400">({r.finishes[finish.key]})</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <details className="glass-surface mt-5 rounded-xl border border-stone-200 bg-white p-4 text-sm">
            <summary className="cursor-pointer font-semibold">Model and data notes</summary>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-stone-600">
              <li>Goals are sampled from Poisson distributions using opponent-adjusted attack and defence ratings, not raw group totals alone.</li>
              <li>Extreme scorelines use diminishing weight: a 14–0 result remains strong evidence, but does not count as fourteen ordinary one-goal events.</li>
              <li>Ratings are adjusted iteratively for opponent quality and pulled toward the competition average when the sample is small or isolated within one group.</li>
              <li>Before cross-group knockout results exist, absolute group strength cannot be identified from results alone; the model therefore avoids assuming that a dominant record automatically means a dominant group.</li>
              <li>A modest 6% first-named-team advantage is applied. Expected goals are constrained to avoid unstable extremes from small samples.</li>
              <li>Draws proceed to simulated extra time and then a strength-weighted shoot-out. Shoot-out kicks do not count as goals.</li>
              <li>Official knockout scores entered into the fixture data are fixed in every run; only unresolved matches are simulated.</li>
              <li>Finishing categories are mutually exclusive: Round of 14, quarter-final, fourth, third, runner-up and champion.</li>
            </ul>
          </details>
        </>
      )}
    </div>
  )
}

