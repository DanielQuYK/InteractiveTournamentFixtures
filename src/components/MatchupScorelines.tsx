import { useMemo, useState } from "react"
import { VENUES, fmtDate, koById } from "../lib/data"
import { useDialog } from "../lib/hooks"
import { groupSeed } from "../lib/stats"
import {
  MATCH_ORDER,
  probabilityInterval,
  type MatchupRecord,
  type SimulationRun,
} from "../lib/simulation"

const STAGE_NAME: Record<string, string> = {
  R1: "Round of 14 · Match 1",
  R2: "Round of 14 · Match 2",
  R3: "Round of 14 · Match 3",
  R4: "Round of 14 · Match 4",
  R5: "Round of 14 · Match 5",
  R6: "Round of 14 · Match 6",
  Q1: "Quarter-final 1",
  Q2: "Quarter-final 2",
  Q3: "Quarter-final 3",
  Q4: "Quarter-final 4",
  S1: "Semi-final 1",
  S2: "Semi-final 2",
  TP: "Third place",
  F: "Final",
}

const SMALL_SAMPLE = 30
const MAX_ROWS = 8

interface Props {
  run: SimulationRun
  matchId: string
  home: string
  away: string
  onClose: () => void
}

export function MatchupScorelines({
  run,
  matchId,
  home,
  away,
  onClose,
}: Props) {
  const dialogRef = useDialog<HTMLDivElement>(onClose)
  const [stage, setStage] = useState<string>("all")
  const record: MatchupRecord | undefined = run.matchups.find(
    (r) => r.key === [home, away].sort().join("|"),
  )
  const stageIds = record ? MATCH_ORDER.filter((id) => record.stages[id]) : []

  const summary = useMemo(() => {
    if (!record) return null
    const ids = stage === "all" ? stageIds : [stage]
    const scores: Record<string, number> = {}
    let meetings = 0
    let homeWins = 0
    let awayWins = 0
    // Stored from the alphabetically first team's side; show from this fixture's home side.
    const flip = record.teams[0] !== home
    for (const id of ids) {
      const s = record.stages[id]
      if (!s) continue
      meetings += s.count
      homeWins += s.wins[flip ? 1 : 0]
      awayWins += s.wins[flip ? 0 : 1]
      for (const [score, n] of Object.entries(s.scores)) {
        const [a, b] = score.split("-")
        const key = flip ? `${b}-${a}` : score
        scores[key] = (scores[key] ?? 0) + n
      }
    }
    const rows = Object.entries(scores).sort(
      (x, y) => y[1] - x[1] || x[0].localeCompare(y[0]),
    )
    return { meetings, homeWins, awayWins, rows }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, stage, home])

  const match = koById(matchId)
  const pct = (n: number, of: number) => ((n / of) * 100).toFixed(1)
  const totalMeetings = record
    ? stageIds.reduce((sum, id) => sum + record.stages[id].count, 0)
    : 0
  const top = summary?.rows[0]
  const tied = summary
    ? summary.rows.filter((r) => r[1] === top?.[1]).length
    : 0
  const range =
    top && summary ? probabilityInterval(top[1], summary.meetings) : null

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/30 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${home} v ${away} scorelines`}
        className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="liquid absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-stone-600"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>

        <div className="px-6 pb-3 pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
            Simulated scorelines
          </p>
          <h4 className="mt-1 text-xl font-semibold">
            {home}{" "}
            <span className="text-sm font-normal text-stone-600">
              ({groupSeed(home)})
            </span>{" "}
            <span className="text-stone-500">v</span> {away}{" "}
            <span className="text-sm font-normal text-stone-600">
              ({groupSeed(away)})
            </span>
          </h4>
          <p className="mt-1 text-xs text-stone-600">
            In this bracket: {STAGE_NAME[matchId]} · {fmtDate(match.date)},{" "}
            {match.time} · {VENUES[match.venue]}
          </p>
        </div>

        {!record || !summary ? (
          <p className="px-6 pb-6 text-sm text-stone-600">
            No simulated meetings of these teams were recorded.
          </p>
        ) : (
          <div className="space-y-5 px-6 pb-6">
            <p className="rounded-lg bg-stone-100 p-3 text-sm text-stone-700">
              These two teams met in{" "}
              <strong>{totalMeetings.toLocaleString()}</strong> of{" "}
              {run.count.toLocaleString()} simulations (
              {pct(totalMeetings, run.count)}%) — at any stage, whatever the
              rest of the bracket looked like.
              {totalMeetings < SMALL_SAMPLE && (
                <span className="mt-1 block font-medium text-amber-800">
                  Small sample: with only {totalMeetings} meetings, the
                  percentages below are unreliable.
                </span>
              )}
            </p>

            {stageIds.length > 1 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">
                  This pairing can meet at more than one stage
                </p>
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Stage"
                >
                  {[
                    ["all", `All stages (${totalMeetings.toLocaleString()})`],
                    ...stageIds.map((id) => [
                      id,
                      `${STAGE_NAME[id]} (${record.stages[id].count.toLocaleString()})`,
                    ]),
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setStage(id)}
                      aria-pressed={stage === id}
                      className={`liquid rounded-full border px-3 py-1.5 text-xs ${
                        stage === id
                          ? "border-emerald-800 bg-emerald-800 text-white"
                          : "border-stone-300 bg-white text-stone-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {stageIds.length === 1 && (
              <p className="text-xs text-stone-600">
                Only ever met at: {STAGE_NAME[stageIds[0]]}.
              </p>
            )}

            {top && range && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  {tied > 1
                    ? `Most common scoreline (${tied} tied)`
                    : "Most common scoreline"}
                </p>
                <p className="mt-1 text-4xl font-semibold tabular-nums text-emerald-900">
                  {top[0].replace("-", " – ")}
                </p>
                <p className="text-sm text-emerald-900">
                  {home} {top[0].split("-")[0]}, {away} {top[0].split("-")[1]} ·{" "}
                  <strong>{pct(top[1], summary.meetings)}%</strong> of{" "}
                  {summary.meetings.toLocaleString()} meetings
                </p>
                <p className="text-xs text-emerald-800">
                  95% CI {range.low.toFixed(1)}–{range.high.toFixed(1)}%
                </p>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">
                Most frequent scorelines ({home} – {away})
              </p>
              <ul className="space-y-1.5">
                {summary.rows.slice(0, MAX_ROWS).map(([score, n]) => {
                  const [a, b] = score.split("-").map(Number)
                  const colour =
                    a > b
                      ? "bg-emerald-600"
                      : a < b
                        ? "bg-rose-500"
                        : "bg-stone-400"
                  return (
                    <li key={score} className="flex items-center gap-3 text-sm">
                      <span className="w-14 shrink-0 font-semibold tabular-nums">
                        {a} – {b}
                      </span>
                      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                        <span
                          className={`block h-full min-w-1 rounded-full ${colour}`}
                          style={{
                            width: `${(n / summary.rows[0][1]) * 100}%`,
                          }}
                        />
                      </span>
                      <span className="w-24 shrink-0 text-right tabular-nums">
                        {pct(n, summary.meetings)}%{" "}
                        <span className="text-xs text-stone-600">
                          ({n.toLocaleString()})
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
              {summary.rows.length > MAX_ROWS && (
                <p className="mt-2 text-xs text-stone-600">
                  Plus {summary.rows.length - MAX_ROWS} rarer scorelines (
                  {pct(
                    summary.rows.slice(MAX_ROWS).reduce((t, r) => t + r[1], 0),
                    summary.meetings,
                  )}
                  % combined).
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">
                Who won
              </p>
              <div className="flex h-3 overflow-hidden rounded-full bg-stone-100">
                <span
                  className="bg-emerald-600"
                  style={{
                    width: `${(summary.homeWins / summary.meetings) * 100}%`,
                  }}
                />
                <span
                  className="bg-rose-500"
                  style={{
                    width: `${(summary.awayWins / summary.meetings) * 100}%`,
                  }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-stone-700">
                <span>
                  {home} {pct(summary.homeWins, summary.meetings)}%
                </span>
                <span>
                  {away} {pct(summary.awayWins, summary.meetings)}%
                </span>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-stone-600">
              Scorelines include extra time. A level scoreline means the match
              went to a shoot-out, whose winner is counted in “Who won”.
              Percentages are shares of simulated meetings of this pairing, not
              of all runs. Intervals cover simulation randomness only.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
