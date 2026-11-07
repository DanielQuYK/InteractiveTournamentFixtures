import { useMemo, useRef, useState } from "react"
import { ALL_KO_TEAMS, KO_MATCHES, koWinner } from "../lib/data"
import { SimulationCharts } from "./SimulationCharts"
import { CommonBracket } from "./CommonBracket"
import { AppliedResults } from "./AppliedResults"
import { SimulationParameters } from "./SimulationParameters"
import { usePersistentState } from "../lib/hooks"
import { useModelSettings } from "../lib/useModelSettings"
import { EmptyComparison } from "./shared"
import { groupSeed } from "../lib/stats"
import {
  FINISHES,
  SIM_METRICS,
  emptyAggregate,
  formatMetric,
  probabilityInterval,
  type BracketTally,
  type MatchupTally,
  type SimAggregate,
  type SimulationRun,
  type StartStage,
  fixedMatchIds,
  latestStartStage,
  runOneSimulation,
  simulationStrengths,
  startStageOptions,
} from "../lib/simulation"

/** Upper limit per run. Only compact aggregates are kept, so this affects time, not storage. */
const MAX_SIMULATIONS = 10_000_000

export function Simulation() {
  const [count, setCount] = usePersistentState("sim-count", 1000)
  const stageOptions = useMemo(() => startStageOptions(), [])
  const [storedStage, setStartStage] = usePersistentState<StartStage>("sim-stage", latestStartStage())
  // A remembered stage is used only while it is still available.
  const startStage = stageOptions.find((o) => o.stage === storedStage && o.enabled) ? storedStage : latestStartStage()
  const settings = useModelSettings()
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [runs, setRuns] = useState<SimulationRun[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [sort, setSort] = useState("champion")
  const [query, setQuery] = useState("")
  const cancelled = useRef(false)
  const active = runs.find((run) => run.id === activeId) ?? runs[0]

  const start = async () => {
    const simulations = Math.max(1, Math.min(MAX_SIMULATIONS, Math.round(count || 1)))
    setCount(simulations)
    setRunning(true)
    setProgress(0)
    setEtaSeconds(null)
    setNotice(null)
    cancelled.current = false
    const startedAt = performance.now()
    const teams = [...ALL_KO_TEAMS].sort()
    const aggregate = new Map<string, SimAggregate>(
      teams.map((team) => [team, emptyAggregate(team)]),
    )
    const brackets: BracketTally = new Map()
    const matchups: MatchupTally = new Map()
    // Rounds before the chosen stage use official results; ratings use only those.
    const strengths = simulationStrengths(fixedMatchIds(startStage), settings.params, settings.overrides)
    // Work in slices of about 40 ms, then yield to the browser. Progress is always
    // simulations done ÷ total, and the page stays responsive (and Stop works
    // promptly) however large the run is.
    let done = 0
    while (done < simulations) {
      const sliceEnds = performance.now() + 40
      while (done < simulations && performance.now() < sliceEnds) {
        // Check the clock every 64 runs rather than after every one.
        for (let k = 0; k < 64 && done < simulations; k++) {
          runOneSimulation(strengths, aggregate, brackets, matchups)
          done++
        }
      }
      setProgress(done / simulations)
      const elapsed = (performance.now() - startedAt) / 1000
      if (done > 0 && elapsed > 1) setEtaSeconds((elapsed / (done / simulations)) - elapsed)
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      if (cancelled.current) {
        setRunning(false)
        setNotice(`Stopped after ${done.toLocaleString()} of ${simulations.toLocaleString()} simulations. No results were saved.`)
        return
      }
    }
    const run: SimulationRun = {
      id: Date.now(),
      createdAt: new Date(),
      startStage,
      customised: settings.customised,
      params: settings.params,
      overrides: settings.overrides,
      count: simulations,
      aggregates: [...aggregate.values()],
      brackets: [...brackets.values()],
      matchups: [...matchups.values()],
    }
    setRuns((current) => [run, ...current].slice(0, 12))
    setActiveId(run.id)
    setRunning(false)
    const seconds = (performance.now() - startedAt) / 1000
    setNotice(`Finished ${simulations.toLocaleString()} simulations in ${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)} s.`)
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
        <fieldset disabled={running} className="mb-6">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Simulate from which stage?
          </legend>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label="Starting stage">
            {stageOptions.map((option) => {
              const selected = startStage === option.stage
              const fixedWinners = [...fixedMatchIds(option.stage)]
                .map((id) => koWinner(KO_MATCHES.find((m) => m.id === id)!))
                .filter(Boolean)
              return (
                <button
                  key={option.stage}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!option.enabled}
                  onClick={() => setStartStage(option.stage)}
                  className={`liquid rounded-xl border p-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                    selected ? "border-emerald-800 bg-emerald-50 ring-2 ring-emerald-700/30" : "border-stone-300 bg-white"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <strong>{option.label}</strong>
                    {option.recommended && (
                      <span className="rounded-full bg-emerald-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Latest
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-xs text-stone-600">{option.description}</span>
                  {option.enabled && option.stage !== "R14" && fixedWinners.length > 0 && (
                    <span className="mt-1.5 block text-xs text-stone-700">Already through: {fixedWinners.join(", ")}</span>
                  )}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-stone-600">
            The latest stage is recommended because it uses every result entered so far. Starting earlier ignores
            those results, both when playing the bracket and when rating the teams.
          </p>
        </fieldset>
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">
              Number of simulations
            </span>
            <input
              type="number"
              min={1}
              max={MAX_SIMULATIONS}
              step={1000}
              value={count}
              disabled={running}
              onChange={(e) => setCount(Number(e.target.value))}
              className="glass-control w-44 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm tabular-nums outline-none focus:border-emerald-700"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {[100, 1000, 10000, 100000, 1000000, 10000000].map((n) => (
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
              <span>
                {Math.round(progress * 100)}%
                {etaSeconds !== null && ` · about ${etaSeconds < 90 ? `${Math.max(1, Math.round(etaSeconds))} s` : `${Math.round(etaSeconds / 60)} min`} left`}
              </span>
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
          matches and finishing counts for 14 teams, plus compact counts of
          distinct brackets and scorelines—not individual simulated fixtures.
          Up to 12 run summaries are retained for this browser session. Runs
          of up to 10,000,000 simulations are allowed; a million typically
          takes around 15–30 seconds and ten million several minutes,
          depending on your device. You can stop a run at any time.
        </p>
      </section>

      {notice && (
        <p role="status" className="glass-surface mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          {notice}
        </p>
      )}

      <SimulationParameters stage={startStage} settings={settings} />

      {!active ? (
        <EmptyComparison text="Choose the number of simulations and run the model to generate probabilities." />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <label className="text-sm text-stone-600">
              Run
              <span className="relative ml-2 inline-flex">
                <select
                  value={active.id}
                  onChange={(e) => setActiveId(Number(e.target.value))}
                  className="glass-control appearance-none rounded-lg border border-stone-300 bg-white py-2.5 pl-3 pr-10 text-sm outline-none focus:border-emerald-700"
                >
                  {runs.map((run) => (
                    <option key={run.id} value={run.id}>
                      {run.count.toLocaleString()} simulations · from {run.startStage}{run.customised ? " · custom settings" : ""} ·{" "}
                      {run.createdAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </option>
                  ))}
                </select>
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-600"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m3 5 4 4 4-4" />
                </svg>
              </span>
            </label>
            <button
              onClick={exportCsv}
              className="liquid rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700"
            >
              Export aggregate CSV
            </button>
          </div>

          <section className="glass-surface mb-5 rounded-xl border border-stone-200 bg-white p-4">
            <h3 className="mb-2 font-semibold">
              Results applied in this run (from {active.startStage})
              {active.customised && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Custom model settings</span>}
            </h3>
            <AppliedResults stage={active.startStage} />
          </section>
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
            <div className="border-b border-stone-200 bg-stone-50 px-4 py-3 text-xs leading-relaxed text-stone-600">
              <p>
                <strong className="text-stone-800">
                  How to read these percentages:
                </strong>{" "}
                20.0% (200) means the team finished in that position in 200 of
                1,000 simulations. Each team receives exactly one finishing
                position per simulation, so its six finishing percentages add up
                to approximately 100% after rounding.
              </p>
              <p className="mt-2">
                <strong className="text-stone-800">
                  95% CI means 95% confidence interval.
                </strong>{" "}
                A range such as 17.6–22.6% reflects uncertainty in the model’s
                finishing probability due to the finite number of simulations.
                If we repeatedly ran the same number of independent simulations
                with the same model and calculated intervals this way, about 95%
                of those intervals would contain the model’s underlying
                probability for that team and position. It is not a range of
                possible finishing places, nor does it mean the team has a 95%
                chance of achieving that finish.
              </p>
              <p className="mt-2">
                More simulations usually narrow the interval. These ranges cover
                simulation sampling error only—not uncertain team ratings,
                missing data or whether the model accurately predicts the real
                tournament.
              </p>
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
            Wins and losses include matches decided by penalty shoot-outs. Average win rate
            is the mean of each simulation’s wins ÷ matches, not total wins ÷
            total matches. Goal difference is GF − GA per simulation; shoot-out
            kicks are excluded. All metrics cover the complete knockout path,
            including fixed official results, not just matches still to be
            played.
          </p>
          <SimulationCharts run={active} />
          <CommonBracket run={active} />
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
                HKSSF rules: matches are 35 minutes each half, and a drawn
                knockout match goes straight to a penalty shoot-out with no
                extra time. The shoot-out winner is chosen with a mild tilt
                towards the stronger side, and shoot-out kicks do not count as
                goals. Teams need at least 7 players to start or continue a
                match; this has no effect on the model.
              </li>
              <li>
                The starting stage decides which knockout results are treated as
                played. Rounds before it use the official winners and scores in
                every run, and only those results feed the ratings; later
                matches are simulated.
              </li>
              <li>
                Knockout results connect different groups, so each counts 1.5
                times as much as a group game when fitting attack and defence.
                This weight is a judgement, not a fitted value.
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
                those expected goals. A drawn match goes straight to a shoot-out
                (no extra time), whose winner is sampled using λ home ÷ (λ home
                + λ away) as the first-named team’s win chance.
                All match winners then follow the real bracket, including byes
                and the third-place play-off.
              </p>
              <p className="font-medium text-stone-800">
                This is a heuristic scenario model, not a validated forecast.
                Compression, shrinkage, home advantage and shoot-out
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
