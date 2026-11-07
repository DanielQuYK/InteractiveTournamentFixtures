import { useId, useMemo, useState } from "react"
import { koById, slotTeam } from "../lib/data"
import { GRID_SIZE, actualResult, predictFixture, type ActualResult, type FullTimePrediction } from "../lib/prediction"
import { playedBefore, strengthsBefore } from "../lib/simulation"
import { useModelSettings } from "../lib/useModelSettings"

/** A steady highlight (not an animation) for what actually happened. */
const GLOW = "ring-2 ring-amber-400 ring-offset-1 shadow-[0_0_12px_rgba(245,158,11,0.8)]"

const pct = (p: number) => `${(p * 100).toFixed(1)}%`
const cellText = (p: number) => (p === 0 ? "0%" : p < 0.001 ? "<0.1%" : pct(p))

interface BarProps {
  homeLabel: string
  awayLabel: string
  home: number
  draw: number
  away: number
  /** The full-time outcome that actually happened, highlighted when the match has been played. */
  actual?: ActualResult | null
}

const ActualTag = () => (
  <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
    Result
  </span>
)

/** Green = first-named (home) side wins, grey = level at full time (Penalties), red = away side wins. */
export function WinProbabilityBar({ homeLabel, awayLabel, home, draw, away, actual }: BarProps) {
  const winner = (side: "home" | "draw" | "away") => actual?.side === side
  return (
    <div role="group" aria-label={`Full-time win probability: ${homeLabel} ${pct(home)}, draw ${pct(draw)}, ${awayLabel} ${pct(away)}`}>
      <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-end gap-2 text-sm">
        <div className={`min-w-0 rounded-lg px-2 py-1 ${winner("home") ? `bg-emerald-50 ${GLOW}` : ""}`}>
          <p className="truncate text-xs text-stone-600">
            {homeLabel} win{winner("home") && <ActualTag />}
          </p>
          <p className="text-lg font-semibold tabular-nums text-emerald-800">{pct(home)}</p>
        </div>
        <div className={`rounded-lg px-2 py-1 text-center ${winner("draw") ? `bg-stone-100 ${GLOW}` : ""}`}>
          <p className="text-xs text-stone-600">
            Draw (Penalties){winner("draw") && <ActualTag />}
          </p>
          <p className="text-lg font-semibold tabular-nums text-stone-700">{pct(draw)}</p>
        </div>
        <div className={`min-w-0 rounded-lg px-2 py-1 text-right ${winner("away") ? `bg-rose-50 ${GLOW}` : ""}`}>
          <p className="truncate text-xs text-stone-600">
            {awayLabel} win{winner("away") && <ActualTag />}
          </p>
          <p className="text-lg font-semibold tabular-nums text-rose-700">{pct(away)}</p>
        </div>
      </div>
      <div className="flex h-3 gap-0.5 rounded-full">
        <span className={`rounded-l-full bg-emerald-600 ${winner("home") ? GLOW : ""}`} style={{ width: `${home * 100}%` }} />
        <span className={`bg-stone-400 ${winner("draw") ? GLOW : ""}`} style={{ width: `${draw * 100}%` }} />
        <span className={`rounded-r-full bg-rose-500 ${winner("away") ? GLOW : ""}`} style={{ width: `${away * 100}%` }} />
      </div>
      {actual?.side === "draw" && (
        <p className="mt-2 text-xs font-medium text-stone-700">
          Level at full time{actual.pens ? ` (${actual.pens[0]}–${actual.pens[1]} on penalties)` : ""}: {actual.winner} won the shoot-out.
        </p>
      )}
    </div>
  )
}

interface ShootoutProps {
  homeLabel: string
  awayLabel: string
  prediction: FullTimePrediction
  actual: ActualResult | null
}

/**
 * Chance each side wins a penalty shoot-out if the match is level after 70 minutes. Played matches
 * that were settled in normal time show it greyed out; matches that did go to penalties highlight
 * the winner; matches not yet played show it plainly.
 */
export function ShootoutBar({ homeLabel, awayLabel, prediction, actual }: ShootoutProps) {
  const home = prediction.penaltyHome
  const away = 1 - home
  const wentToPenalties = actual?.side === "draw"
  const unused = Boolean(actual) && !wentToPenalties
  const winnerSide = wentToPenalties ? (actual?.winner === homeLabel ? "home" : "away") : null
  return (
    <div
      className={unused ? "opacity-50 grayscale" : ""}
      role="group"
      aria-label={`Penalty shoot-out win probability: ${homeLabel} ${pct(home)}, ${awayLabel} ${pct(away)}${unused ? " (not needed, decided in normal time)" : ""}`}
    >
      <div className="mb-2 grid grid-cols-2 items-end gap-2 text-sm">
        <div className={`min-w-0 rounded-lg px-2 py-1 ${winnerSide === "home" ? `bg-emerald-50 ${GLOW}` : ""}`}>
          <p className="truncate text-xs text-stone-600">
            {homeLabel} wins shoot-out{winnerSide === "home" && <ActualTag />}
          </p>
          <p className="text-lg font-semibold tabular-nums text-emerald-800">{pct(home)}</p>
        </div>
        <div className={`min-w-0 rounded-lg px-2 py-1 text-right ${winnerSide === "away" ? `bg-rose-50 ${GLOW}` : ""}`}>
          <p className="truncate text-xs text-stone-600">
            {awayLabel} wins shoot-out{winnerSide === "away" && <ActualTag />}
          </p>
          <p className="text-lg font-semibold tabular-nums text-rose-700">{pct(away)}</p>
        </div>
      </div>
      <div className="flex h-3 gap-0.5 rounded-full">
        <span className={`rounded-l-full bg-emerald-600 ${winnerSide === "home" ? GLOW : ""}`} style={{ width: `${home * 100}%` }} />
        <span className={`rounded-r-full bg-rose-500 ${winnerSide === "away" ? GLOW : ""}`} style={{ width: `${away * 100}%` }} />
      </div>
    </div>
  )
}

interface GridProps {
  grid: number[][]
  /** The scoreline that actually happened (home goals, away goals), highlighted when within the grid. */
  actual?: [number, number] | null
  homeLabel: string
  awayLabel: string
}

/** Score probability grid: rows are the home side's goals, columns the away side's. */
export function ResultGrid({ grid, homeLabel, awayLabel, actual }: GridProps) {
  const max = Math.max(...grid.flat(), 1e-9)
  const goals = Array.from({ length: GRID_SIZE + 1 }, (_, i) => i)
  return (
    <div>
      <div className="grid grid-cols-[1.25rem_repeat(6,minmax(0,1fr))] gap-1.5 text-xs" role="table" aria-label="Result probability by score">
        {[...goals].reverse().map((h) => (
          <div key={h} className="contents" role="row">
            <span className="flex items-center justify-center text-stone-600" role="rowheader">{h}</span>
            {goals.map((a) => {
              const p = grid[h][a]
              const strength = p / max
              const happened = actual?.[0] === h && actual?.[1] === a
              return (
                <span
                  key={a}
                  role="cell"
                  title={`${homeLabel} ${h} – ${a} ${awayLabel}: ${cellText(p)}${happened ? " (actual result)" : ""}`}
                  className={`flex h-9 items-center justify-center rounded-md font-semibold tabular-nums ${happened ? `relative z-10 ${GLOW}` : ""}`}
                  style={{
                    backgroundColor: `rgba(4, 120, 87, ${0.08 + strength * 0.85})`,
                    color: strength > 0.45 ? "#ffffff" : "#064e3b",
                  }}
                >
                  {cellText(p)}
                </span>
              )
            })}
          </div>
        ))}
        <span />
        {goals.map((a) => (
          <span key={a} className="text-center text-stone-600">{a}</span>
        ))}
      </div>
      <ul className="mt-3 space-y-1.5 text-xs text-stone-700">
        <li className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 14V2M4 6l4-4 4 4" />
          </svg>
          Goals ({homeLabel})
        </li>
        <li className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 8h12M10 4l4 4-4 4" />
          </svg>
          Goals ({awayLabel})
        </li>
      </ul>
    </div>
  )
}

interface BodyProps {
  homeLabel: string
  awayLabel: string
  prediction: FullTimePrediction
  actual: ActualResult | null
  /** How many knockout results the probabilities were allowed to use (those before kick-off). */
  knockoutResultsUsed: number
  customised?: boolean
}

/** Win bar, result grid and the data-window note, shared by the Knockout and Simulation tabs. */
export function PredictionBody({ homeLabel, awayLabel, prediction, actual, knockoutResultsUsed, customised }: BodyProps) {
  const outside = actual?.score && (actual.score[0] > GRID_SIZE || actual.score[1] > GRID_SIZE)
  return (
    <div className="space-y-5">
      <section>
        <h5 className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-stone-600">Full-time win probability</h5>
        <WinProbabilityBar
          homeLabel={homeLabel}
          awayLabel={awayLabel}
          home={prediction.home}
          draw={prediction.draw}
          away={prediction.away}
          actual={actual}
        />
      </section>
      <section>
        <h5 className="mb-1 text-center text-xs font-semibold uppercase tracking-wide text-stone-600">
          Penalty shoot-out win probability
        </h5>
        <p className="mb-2 text-center text-xs text-stone-600">
          If level after 70 minutes ({pct(prediction.draw)} chance), the match goes straight to penalties.
          {actual && actual.side !== "draw" && " This match was decided in normal time, so no shoot-out was needed."}
          {actual?.side === "draw" && actual.pens && ` It went to penalties: ${actual.winner} won ${Math.max(...actual.pens)}–${Math.min(...actual.pens)}.`}
        </p>
        <ShootoutBar homeLabel={homeLabel} awayLabel={awayLabel} prediction={prediction} actual={actual} />
        <p className="mt-2 text-center text-xs text-stone-600">
          Overall chance to advance, shoot-out included: {homeLabel} {pct(prediction.homeAdvances)} · {awayLabel} {pct(1 - prediction.homeAdvances)}
        </p>
      </section>
      <section>
        <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">Result probability</h5>
        <ResultGrid grid={prediction.grid} homeLabel={homeLabel} awayLabel={awayLabel} actual={actual?.score ?? null} />
        {outside && actual?.score && (
          <p className="mt-2 text-xs font-medium text-stone-700">
            The actual score, {actual.score[0]}–{actual.score[1]}, is beyond the {GRID_SIZE}-goal grid.
          </p>
        )}
      </section>
      <p className="text-xs leading-relaxed text-stone-600">
        {actual
          ? "Calculated only from information available before kick-off, so nothing from this match or later ones is used: "
          : "Calculated from the information available now: "}
        group-stage results plus {knockoutResultsUsed} knockout result{knockoutResultsUsed === 1 ? "" : "s"} from earlier days (nothing from the match day itself), with the same team ratings
        as the Simulation tab{customised ? " (including your edits)" : ""}. Matches are 35 minutes each half; a draw at full time goes straight to a
        penalty shoot-out, with no extra time. Shoot-out odds are a modelling judgement (a mild tilt towards the side expected to score more), not a measured rate. The grid shows scores up to {GRID_SIZE} goals each.
        {actual ? " The highlighted outcome and score are what actually happened." : ""}
      </p>
    </div>
  )
}

/** A bar that expands to show full-time win probability and the result grid for a fixture with both teams confirmed. */
export function PredictionToggle({ matchId }: { matchId: string }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const match = koById(matchId)
  const homeLabel = slotTeam(match.home) ?? ""
  const awayLabel = slotTeam(match.away) ?? ""
  const settings = useModelSettings()
  const prediction = useMemo(
    () => (open ? predictFixture(matchId, strengthsBefore(matchId, settings.params, settings.overrides)) : null),
    [open, matchId, settings.params, settings.overrides],
  )
  const used = useMemo(() => playedBefore(matchId).size, [matchId])
  const actual = actualResult(matchId)

  return (
    <div className="border-t border-stone-200">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="liquid flex w-full items-center justify-between gap-3 px-6 py-3 text-left text-sm font-semibold text-stone-800"
      >
        <span>Win and result probability</span>
        <svg
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 7l5 5 5-5" />
        </svg>
      </button>
      <div id={panelId} hidden={!open}>
        {prediction && (
          <div className="px-6 pb-5">
            <PredictionBody
              homeLabel={homeLabel}
              awayLabel={awayLabel}
              prediction={prediction}
              actual={actual}
              knockoutResultsUsed={used}
              customised={settings.customised}
            />
          </div>
        )}
      </div>
    </div>
  )
}
