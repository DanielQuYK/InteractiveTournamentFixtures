import { useId, useMemo, useState } from "react"
import { koById, slotTeam } from "../lib/data"
import { GRID_SIZE, predictFixture } from "../lib/prediction"
import { simulationStrengths } from "../lib/simulation"
import { useModelSettings } from "../lib/useModelSettings"

const pct = (p: number) => `${(p * 100).toFixed(1)}%`
const cellText = (p: number) => (p === 0 ? "0%" : p < 0.001 ? "<0.1%" : pct(p))

interface BarProps {
  homeLabel: string
  awayLabel: string
  home: number
  draw: number
  away: number
}

/** Green = first-named (home) side wins, grey = level at full time (penalties), red = away side wins. */
export function WinProbabilityBar({ homeLabel, awayLabel, home, draw, away }: BarProps) {
  return (
    <div role="group" aria-label={`Full-time win probability: ${homeLabel} ${pct(home)}, draw ${pct(draw)}, ${awayLabel} ${pct(away)}`}>
      <div className="mb-1.5 grid grid-cols-[1fr_auto_1fr] items-end gap-2 text-sm">
        <div className="min-w-0">
          <p className="truncate text-xs text-stone-600">{homeLabel} win</p>
          <p className="text-lg font-semibold tabular-nums text-emerald-800">{pct(home)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-stone-600">Draw (Penalties)</p>
          <p className="text-lg font-semibold tabular-nums text-stone-700">{pct(draw)}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="truncate text-xs text-stone-600">{awayLabel} win</p>
          <p className="text-lg font-semibold tabular-nums text-rose-700">{pct(away)}</p>
        </div>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-stone-100">
        <span className="bg-emerald-600" style={{ width: `${home * 100}%` }} />
        <span className="bg-stone-400" style={{ width: `${draw * 100}%` }} />
        <span className="bg-rose-500" style={{ width: `${away * 100}%` }} />
      </div>
    </div>
  )
}

interface GridProps {
  grid: number[][]
  homeLabel: string
  awayLabel: string
}

/** Score probability grid: rows are the home side's goals, columns the away side's. */
export function ResultGrid({ grid, homeLabel, awayLabel }: GridProps) {
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
              return (
                <span
                  key={a}
                  role="cell"
                  title={`${homeLabel} ${h} – ${a} ${awayLabel}: ${cellText(p)}`}
                  className="flex h-9 items-center justify-center rounded-md font-semibold tabular-nums"
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

/** A bar that expands to show full-time win probability and the result grid for an unplayed fixture. */
export function PredictionToggle({ matchId }: { matchId: string }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const match = koById(matchId)
  const homeLabel = slotTeam(match.home) ?? ""
  const awayLabel = slotTeam(match.away) ?? ""
  const settings = useModelSettings()
  const prediction = useMemo(
    () => (open ? predictFixture(matchId, simulationStrengths(undefined, settings.params, settings.overrides)) : null),
    [open, matchId, settings.params, settings.overrides],
  )

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
          <div className="space-y-5 px-6 pb-5">
            <section>
              <h5 className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-stone-600">
                Full-time win probability
              </h5>
              <WinProbabilityBar
                homeLabel={homeLabel}
                awayLabel={awayLabel}
                home={prediction.home}
                draw={prediction.draw}
                away={prediction.away}
              />
            </section>
            <section>
              <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">Result probability</h5>
              <ResultGrid grid={prediction.grid} homeLabel={homeLabel} awayLabel={awayLabel} />
            </section>
            <p className="text-xs leading-relaxed text-stone-600">
              A model estimate from the group and knockout results so far, using the same team ratings as the Simulation tab{settings.customised ? " (including your edits)" : ""}. Matches are 35
              minutes each half; a draw at full time goes straight to a penalty shoot-out, with no extra time. The grid shows scores up to
              {` ${GRID_SIZE}`} goals each.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
