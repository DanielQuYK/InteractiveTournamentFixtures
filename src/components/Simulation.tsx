import { useMemo, useRef, useState } from "react"
import { ALL_KO_TEAMS } from "../lib/data"
import { SimulationCharts } from "./SimulationCharts"
import { EmptyComparison } from "./shared"
import { groupSeed } from "../lib/stats"
import {
  FINISHES,
  SIM_METRICS,
  emptyAggregate,
  formatMetric,
  probabilityInterval,
  type SimAggregate,
  type SimulationRun,
  runOneSimulation,
  simulationStrengths,
} from "../lib/simulation"

export function Simulation() {
  const [count, setCount] = useState(1000)
  const [runs, setRuns] = useState<SimulationRun[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [sort, setSort] = useState("champion")
  const [query, setQuery] = useState("")
  const cancelled = useRef(false)
  const active = runs.find((run) => run.id === activeId) ?? runs[0]

  const start = async () => {
    const simulations = Math.max(1, Math.min(100000, Math.round(count || 1)))
    setCount(simulations)
    setRunning(true)
    setProgress(0)
    cancelled.current = false
    const teams = [...ALL_KO_TEAMS].sort()
    const aggregate = new Map<string, SimAggregate>(
      teams.map((team) => [team, emptyAggregate(team)]),
    )
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
    const metric = SIM_METRICS.find((m) => m.key === sort)!
    const value = (r: SimAggregate) => metric.value(r, active.count)
    return active.aggregates
      .filter((r) =>
        `${r.team} ${groupSeed(r.team)}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
      .sort((a, b) =>
        metric.lowerIsBetter ? value(a) - value(b) : value(b) - value(a),
      )
  }, [active, query, sort])

  const exportCsv = () => {
    if (!active) return
    const header = [
      "Team",
      "Simulations",
      ...SIM_METRICS.map((m) => m.label + (m.unit === "percent" ? " (%)" : "")),
      ...FINISHES.map((f) => f.full + " count"),
    ]
    const lines = active.aggregates.map((r) => [
      r.team,
      active.count,
      ...SIM_METRICS.map((m) => m.value(r, active.count).toFixed(4)),
      ...FINISHES.map((f) => r.finishes[f.key]),
    ])
    const csv = [header, ...lines].map((line) => line.join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `knockout-simulation-${active.count}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const top = active
    ? [...active.aggregates]
        .sort((a, b) => b.finishes.champion - a.finishes.champion)
        .slice(0, 3)
    : []

  return (
    <div>
      <div className="mb-6 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
          Monte Carlo knockout simulation
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          Simulate the final round
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Each simulation plays the official 14-team bracket from the Round of
          14 through the final and third-place play-off. Completed knockout
          results are treated as fixed. Remaining matches use smoothed scoring
          and conceding rates from the available team data.
        </p>
      </div>

      <section className="glass-surface mb-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">
              Number of simulations
            </span>
            <input
              type="number"
              min={1}
              max={100000}
              step={100}
              value={count}
              disabled={running}
              onChange={(e) => setCount(Number(e.target.value))}
              className="glass-control w-44 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm tabular-nums outline-none focus:border-emerald-700"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {[100, 1000, 10000, 50000].map((n) => (
              <button
                key={n}
                disabled={running}
                onClick={() => setCount(n)}
                className={`liquid rounded-full border px-3 py-2 text-xs font-medium ${
                  count === n
                    ? "border-emerald-800 bg-emerald-800 text-white"
                    : "border-stone-300 bg-white text-stone-700"
                }`}
              >
                {n.toLocaleString()}
              </button>
            ))}
          </div>
          {running ? (
            <button
              onClick={() => {
                cancelled.current = true
              }}
              className="liquid ml-auto rounded-lg border border-rose-300 bg-rose-50 px-5 py-2 text-sm font-semibold text-rose-700"
            >
              Stop simulation
            </button>
          ) : (
            <button
              onClick={start}
              className="liquid ml-auto rounded-lg bg-emerald-800 px-5 py-2 text-sm font-semibold text-white shadow-sm"
            >
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
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-stone-500">
          Storage remains compact: a run saves only aggregate wins, goals,
          matches and finishing counts for 14 teams—not individual simulated
          fixtures. Up to 12 run summaries are retained for this browser
          session.
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
                className="glass-control ml-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700"
              >
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.count.toLocaleString()} simulations ·{" "}
                    {run.createdAt.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={exportCsv}
              className="liquid rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700"
            >
              Export aggregate CSV
            </button>
          </div>

          <div
            className={`mb-5 rounded-lg border p-4 text-sm ${
              active.count < 1000
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-stone-200 bg-white text-stone-600"
            }`}
          >
            <p className="font-semibold">
              {active.count < 1000
                ? "Small sample — probabilities can fluctuate noticeably."
                : "Simulation sampling uncertainty"}
            </p>
            <p className="mt-1">
              95% Wilson intervals appear below finishing probabilities. At this
              sample size, the widest interval has a half-width of about{" "}
              {(
                ((1.96 *
                  Math.sqrt(
                    0.25 / active.count + 1.96 ** 2 / (4 * active.count ** 2),
                  )) /
                  (1 + 1.96 ** 2 / active.count)) *
                100
              ).toFixed(1)}{" "}
              percentage points. These intervals reflect random simulation
              sampling only—not uncertainty about team strength or the model’s
              assumptions.
            </p>
          </div>
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {top.map((r, index) => (
              <div
                key={r.team}
                className={`liquid rounded-xl border p-4 ${
                  index === 0
                    ? "border-amber-300 bg-amber-50"
                    : "border-stone-200 bg-white"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  #{index + 1} title probability
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {r.team}{" "}
                  <span className="text-xs font-normal text-stone-500">
                    ({groupSeed(r.team)})
                  </span>
                </p>
                <p
                  className={`mt-2 text-3xl font-semibold tabular-nums ${
                    index === 0 ? "text-amber-800" : "text-emerald-800"
                  }`}
                >
                  {((r.finishes.champion / active.count) * 100).toFixed(1)}%
                </p>
                <ProbabilityRange
                  hits={r.finishes.champion}
                  runs={active.count}
                />
              </div>
            ))}
          </div>

          <section className="glass-surface overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b border-stone-200 p-4">
              <div>
                <h3 className="font-semibold">Aggregate outcomes</h3>
                <p className="text-xs text-stone-500">
                  Percentages show the share of {active.count.toLocaleString()}{" "}
                  simulations ending in each position.
                </p>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter teams"
                className="glass-control ml-auto w-40 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-emerald-700"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1500px] text-sm">
                <thead className="bg-stone-100 text-xs uppercase tracking-wide text-stone-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Team</th>
                    {SIM_METRICS.map((metric) => (
                      <th key={metric.key} className="px-3 py-3 text-right">
                        <button
                          onClick={() => setSort(metric.key)}
                          className={`liquid whitespace-nowrap rounded px-1 py-0.5 ${
                            sort === metric.key
                              ? "font-bold text-emerald-800"
                              : "hover:text-stone-800"
                          }`}
                        >
                          {metric.short}
                          {sort === metric.key
                            ? metric.lowerIsBetter
                              ? " ↑"
                              : " ↓"
                            : ""}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.team}
                      className="liquid border-t border-stone-100"
                    >
                      <td className="px-4 py-3 font-semibold">
                        {r.team}{" "}
                        <span className="text-xs font-normal text-stone-500">
                          ({groupSeed(r.team)})
                        </span>
                      </td>
                      {SIM_METRICS.map((metric) => (
                        <td
                          key={metric.key}
                          className={`whitespace-nowrap px-3 py-3 text-right tabular-nums ${
                            metric.key === "champion"
                              ? "font-semibold text-emerald-800"
                              : ""
                          }`}
                        >
                          {formatMetric(metric, metric.value(r, active.count))}
                          {metric.finish && (
                            <>
                              <span className="ml-1 text-[10px] text-stone-600">
                                ({r.finishes[metric.finish]})
                              </span>
                              <ProbabilityRange
                                hits={r.finishes[metric.finish]}
                                runs={active.count}
                              />
                            </>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="mt-3 text-xs leading-relaxed text-stone-600">
            Wins and losses include extra time and shoot-outs. Average win rate
            is the mean of each simulation’s wins ÷ matches, not total wins ÷
            total matches. Goal difference is GF − GA per simulation; shoot-out
            kicks are excluded. All metrics cover the complete knockout path,
            including fixed official results, not just matches still to be
            played.
          </p>
          <SimulationCharts run={active} />
          <details className="glass-surface mt-5 rounded-xl border border-stone-200 bg-white p-4 text-sm">
            <summary className="cursor-pointer font-semibold">
              Model and data notes
            </summary>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-stone-600">
              <li>
                Goals are sampled from Poisson distributions using
                opponent-adjusted attack and defence ratings, not raw group
                totals alone.
              </li>
              <li>
                Extreme scorelines use diminishing weight: a 14–0 result remains
                strong evidence, but does not count as fourteen ordinary
                one-goal events.
              </li>
              <li>
                Ratings are adjusted iteratively for opponent quality and pulled
                toward the competition average when the sample is small or
                isolated within one group.
              </li>
              <li>
                Before cross-group knockout results exist, absolute group
                strength cannot be identified from results alone; the model
                therefore avoids assuming that a dominant record automatically
                means a dominant group.
              </li>
              <li>
                For the first-named team, expected goals are multiplied by 1.06;
                for the other team they are divided by 1.06. This is an assumed
                advantage, not one estimated from these results.
              </li>
              <li>
                Draws proceed to simulated extra time and then a
                strength-weighted shoot-out. Shoot-out kicks do not count as
                goals.
              </li>
              <li>
                Official knockout scores entered into the fixture data are fixed
                in every run; only unresolved matches are simulated.
              </li>
              <li>
                Finishing categories are mutually exclusive: Round of 14,
                quarter-final, fourth, third, runner-up and champion.
              </li>
            </ul>
            <div className="mt-5 space-y-3 border-t border-stone-200 pt-4 text-sm leading-relaxed text-stone-600">
              <h4 className="font-semibold text-stone-900">
                What the ratings actually mean
              </h4>
              <p>
                The model fits two relative indices per team: attack (higher
                means more scoring strength) and defensive vulnerability (lower
                means stronger defence). Both start at 1, the competition
                baseline. The baseline goal rate μ is the average number of
                effective goals per team per match across completed group and
                knockout fixtures. Cancelled matches are excluded; walk-overs
                are included at their recorded score.
              </p>
              <p>
                Effective goals equal the actual score up to five. Above five,
                they equal 5 + 0.45 × ln(1 + goals − 5). Thus 6 becomes
                approximately 5.31, 13 becomes 5.99, and 14 becomes 6.04. This
                compression affects rating estimation only—not the published
                score or fixed official result.
              </p>
              <p>
                For each team, attack evidence is effective goals scored divided
                by the opponent’s expected conceding rate; vulnerability
                evidence is effective goals conceded divided by the opponent’s
                expected scoring rate. Each denominator has a floor of 0.35. A
                rating update is (3 + total evidence) ÷ (3 + matches): three
                baseline pseudo-matches pull small samples toward 1. After each
                update, each set of indices is divided by its geometric mean.
                This repeats 14 times.
              </p>
              <div className="overflow-x-auto rounded-lg bg-stone-100 p-3 font-mono text-xs text-stone-700">
                <p>
                  λ home = clamp(μ × attack home × vulnerability away × 1.06)
                </p>
                <p>
                  λ away = clamp(μ × attack away × vulnerability home ÷ 1.06)
                </p>
                <p>clamp limits: 0.12 to 6 expected goals</p>
              </div>
              <p>
                Goals are drawn independently from Poisson distributions with
                those expected goals. A drawn match adds extra-time goals using
                λ ÷ 3. If still drawn, a shoot-out winner is sampled using λ
                home ÷ (λ home + λ away) as the first-named team’s win chance.
                All match winners then follow the real bracket, including byes
                and the third-place play-off.
              </p>
              <p className="font-medium text-stone-800">
                This is a heuristic scenario model, not a validated forecast.
                Compression, shrinkage, home advantage, extra time and shoot-out
                assumptions are not fitted or calibrated to this competition.
                More simulations reduce random sampling error, but cannot fix
                missing cross-group evidence, uncertain team strength or
                incorrect assumptions.
              </p>
            </div>
          </details>
        </>
      )}
    </div>
  )
}

interface ProbabilityRangeProps {
  hits: number
  runs: number
}

function ProbabilityRange({ hits, runs }: ProbabilityRangeProps) {
  const { low, high } = probabilityInterval(hits, runs)
  return (
    <span
      className="mt-1 block text-[10px] font-normal text-stone-600"
      title="95% Wilson interval for simulation sampling uncertainty, not model accuracy"
    >
      95% CI: {low.toFixed(1)}–{high.toFixed(1)}%
    </span>
  )
}
