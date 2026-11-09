import { useState } from "react"
import { VENUE_SHORT, fmtDate, koById, koPlayed, koWinner, matchCode, slotTeam, slotText, type KoMatch } from "../lib/data"
import { BYES, BYE_H, CARD_H, CARD_W, POS, TAG, colX } from "../lib/bracketLayout"
import { MATCH_ORDER, matchDependents, matchPrerequisites, pickStates, sanitizeSelection } from "../lib/simulation"
import { BracketToolbar, BracketViewport, useBracketZoom } from "./BracketViewer"

const label = (id: string) => `${TAG[id]} (${matchCode(koById(id))})`

/**
 * The knockout bracket with a tick box on every played match, for choosing which official results a
 * simulation treats as real. A match can be ticked only once everything that fed it is ticked, so the
 * teams in it are the real ones and the bracket stays consistent.
 */
export function ResultPicker({
  selected,
  onChange,
  disabled,
}: {
  selected: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}) {
  const zoom = useBracketZoom("pick")
  const [hover, setHover] = useState<string | null>(null)
  const set = new Set(selected)
  const states = new Map(pickStates(set).map((s) => [s.id, s]))
  const played = MATCH_ORDER.filter((id) => koPlayed(koById(id)))

  const toggle = (id: string) => {
    if (disabled) return
    if (set.has(id)) {
      // Un-ticking a match also un-ticks the later matches that depend on it
      const drop = new Set([id, ...matchDependents(id)])
      onChange(selected.filter((x) => !drop.has(x)))
    } else {
      onChange(sanitizeSelection([...selected, id]))
    }
  }
  // Tick a match together with every earlier game that led to it (only possible if all were played)
  const withEarlier = (id: string) => !disabled && onChange(sanitizeSelection([...selected, id, ...matchPrerequisites(id)]))

  // While pointing at a match that is not available, mark the games that still need ticking
  const needed = new Set(hover && !set.has(hover) ? matchPrerequisites(hover).filter((p) => !set.has(p)) : [])
  const hoverReason = hover ? states.get(hover)?.reason : ""

  return (
    <div>
      <p className="mb-3 text-sm text-stone-700">
        Tick the played matches whose official result should count as real; every other match is simulated. A match can be ticked only
        after everything that led to it: for example <strong>{label("S1")}</strong> needs both of its quarter-finals, plus the earlier games of
        both teams, including the games of the opponents they beat. You can tick one early game, or a whole side of the bracket.
        Point at a greyed-out match to see which games it still needs.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(sanitizeSelection(played))}
          className="liquid rounded-full border border-stone-300 bg-white px-3 py-1 hover:border-emerald-700 disabled:opacity-50"
        >
          Tick every played result
        </button>
        <button
          type="button"
          onClick={() => onChange([])}
          disabled={selected.length === 0 || disabled}
          className="liquid rounded-full border border-stone-300 bg-white px-3 py-1 hover:border-emerald-700 disabled:opacity-50"
        >
          Clear (simulate everything)
        </button>
        <span className="text-xs text-stone-600" role="status">
          {selected.length} real · {MATCH_ORDER.length - selected.length} simulated
        </span>
      </div>
      <p className="mb-2 min-h-[1.25rem] text-xs text-stone-600" aria-live="polite">
        {hover && hoverReason ? `${label(hover)}: ${hoverReason}.` : ""}
      </p>

      <BracketToolbar zoom={zoom} />
      <BracketViewport zoom={zoom}>
        {BYES.map((bye) => (
          <div
            key={bye.to + bye.slot}
            className="liquid absolute flex flex-col justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3"
            style={{ left: colX(0), top: bye.y - BYE_H / 2, width: CARD_W, height: BYE_H }}
          >
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold">{bye.pending ? bye.seed : bye.name}</span>
              <span className="rounded bg-emerald-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Bye</span>
            </div>
            <div className="mt-1 text-xs leading-snug text-stone-600">{bye.pending ? "Team to be confirmed" : bye.seed}</div>
          </div>
        ))}
        {MATCH_ORDER.map((id) => (
          <PickCard
            key={id}
            match={koById(id)}
            state={states.get(id)!}
            needed={needed.has(id)}
            disabled={disabled}
            onToggle={() => toggle(id)}
            onWithEarlier={() => withEarlier(id)}
            canWithEarlier={!states.get(id)!.checked && koPlayed(koById(id)) && matchPrerequisites(id).every((p) => koPlayed(koById(p)))}
            onHover={(on) => setHover(on ? id : null)}
          />
        ))}
      </BracketViewport>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-stone-600">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border-2 border-emerald-700 bg-emerald-100" /> Real result used</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-stone-300 bg-white" /> Simulated</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-stone-300 bg-stone-100 opacity-60" /> Not available yet</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm ring-2 ring-amber-400" /> Still needed</span>
      </div>
    </div>
  )
}

function PickCard({
  match, state, needed, disabled, onToggle, onWithEarlier, canWithEarlier, onHover,
}: {
  match: KoMatch
  state: { checked: boolean; enabled: boolean; reason: string }
  needed: boolean
  disabled?: boolean
  onToggle: () => void
  onWithEarlier: () => void
  canWithEarlier: boolean
  onHover: (on: boolean) => void
}) {
  const p = POS[match.id]
  const winner = koWinner(match)
  const home = slotTeam(match.home), away = slotTeam(match.away)
  const sides = [
    { slot: match.home, team: home, goals: match.score?.[0], pens: match.pens?.[0] },
    { slot: match.away, team: away, goals: match.score?.[1], pens: match.pens?.[1] },
  ]
  const unplayed = !koPlayed(match)
  return (
    <div>
      <div
        className="absolute whitespace-nowrap text-[11px] font-semibold uppercase tracking-widest text-stone-500"
        style={{ left: p.x + 2, top: p.y - CARD_H / 2 - 19 }}
      >
        {TAG[match.id]}
      </div>
      <button
        type="button"
        role="checkbox"
        aria-checked={state.checked}
        aria-disabled={!state.enabled}
        aria-label={`${label(match.id)}: ${slotText(match.home)} v ${slotText(match.away)}. ${state.checked ? "Real result used" : "Simulated"}${state.reason ? `. ${state.reason}` : ""}`}
        disabled={disabled}
        onClick={() => state.enabled && onToggle()}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onFocus={() => onHover(true)}
        onBlur={() => onHover(false)}
        className={`liquid absolute flex flex-col overflow-hidden rounded-lg border-2 text-left shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
          state.checked
            ? "border-emerald-700 bg-emerald-50"
            : state.enabled
              ? "border-stone-300 bg-white hover:border-emerald-600"
              : "border-stone-300 bg-stone-100 opacity-70"
        } ${needed ? "ring-4 ring-amber-400" : ""} ${state.enabled ? "cursor-pointer" : "cursor-not-allowed"}`}
        style={{ left: p.x, top: p.y - CARD_H / 2, width: CARD_W, height: CARD_H }}
      >
        <span className="flex items-center justify-between gap-2 bg-stone-100/80 px-3 py-1 text-[11px] text-stone-600">
          <span className="min-w-0 truncate">{fmtDate(match.date)} · {match.time} · {VENUE_SHORT[match.venue] ?? match.venue}</span>
          <span className="shrink-0 whitespace-nowrap rounded bg-stone-200 px-1.5 py-0.5 font-semibold text-stone-700">{matchCode(match)}</span>
        </span>
        <span className="flex flex-1 flex-col justify-center gap-0.5 px-3">
          {sides.map((side, i) => (
            <span key={i} className="flex items-center justify-between gap-2 text-sm">
              <span className={`truncate ${side.team && side.team === winner ? "font-semibold text-stone-900" : side.team ? "text-stone-700" : "text-stone-500"}`}>
                {side.team ?? slotText(side.slot)}
              </span>
              {!unplayed && side.goals !== undefined && (
                <span className="tabular-nums">
                  {side.goals}
                  {side.pens !== undefined && <span className="ml-1 text-xs text-stone-500">({side.pens})</span>}
                </span>
              )}
            </span>
          ))}
        </span>
        <span className={`flex items-center gap-1.5 px-3 pb-2 text-[11px] font-medium ${state.checked ? "text-emerald-800" : "text-stone-600"}`}>
          <span
            aria-hidden="true"
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
              state.checked ? "border-emerald-800 bg-emerald-800 text-white" : "border-stone-400 bg-white"
            }`}
          >
            {state.checked && (
              <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2.5 6.5l2.2 2.2L9.5 3.5" />
              </svg>
            )}
          </span>
          {state.checked ? "Real result used" : unplayed ? "Not played yet" : state.enabled ? "Simulated · click to use the real result" : state.reason}
        </span>
      </button>
      {canWithEarlier && !state.enabled && (
        <button
          type="button"
          disabled={disabled}
          onClick={onWithEarlier}
          title="Tick this match together with every earlier game that led to it" className="liquid absolute rounded-full border border-emerald-700 bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-50"
          style={{ left: p.x + CARD_W - 104, top: p.y - CARD_H / 2 - 24 }}
        >
          With earlier games
        </button>
      )}
    </div>
  )
}
