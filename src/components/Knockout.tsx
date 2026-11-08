import { usePersistentState } from "../lib/hooks"
import { activateOnKey, usePrefersReducedMotion } from "../lib/hooks"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  ALL_KO_TEAMS,
  ROUND_NAME,
  activeDivision,
  KO_MATCHES,
  VENUES,
  fmtDate,
  koById,
  koPlayed,
  koWinner,
  slotTeam,
  slotText,
  type KoMatch,
  type Slot,
} from "../lib/data"
import { type Detail, DataNotice, TeamBtn } from "./shared"
import { validateResults } from "../lib/validation"
import { KnockoutTracker } from "./KnockoutTracker"
import { BracketTip, BracketToolbar, BracketViewport, useBracketZoom } from "./BracketViewer"
import { BYES, BYE_H, CARD_H, CARD_W, POS, TAG, colX } from "../lib/bracketLayout"
import { groupSeed } from "../lib/stats"

export * from "../lib/bracketLayout"

export interface KnockoutTeamState {
  team: string
  target: KoMatch
  eliminated: boolean
  champion: boolean
  status: string
}

export function knockoutTeamState(team: string): KnockoutTeamState {
  const involved = KO_MATCHES.filter(
    (m) => slotTeam(m.home) === team || slotTeam(m.away) === team,
  )
  const completed = involved.filter((m) => koPlayed(m))
  const upcoming = involved.find((m) => !koPlayed(m))
  const last = completed.at(-1)
  const entry =
    involved[0] ??
    KO_MATCHES.find(
      (m) =>
        (m.home.kind === "team" && m.home.team === team) ||
        (m.away.kind === "team" && m.away.team === team),
    )!
  const target = upcoming ?? last ?? entry
  const eliminated = !upcoming && Boolean(last) && koWinner(last!) !== team
  const champion = !upcoming && last?.id === "F" && koWinner(last) === team
  const prefix = eliminated
    ? "Out"
    : champion
      ? "Champion"
      : upcoming && completed.length
        ? "Next"
        : upcoming
          ? "Current"
          : "Last"
  return {
    team,
    target,
    eliminated,
    champion,
    status: champion ? "Champion" : `${prefix}: ${TAG[target.id]}`,
  }
}

export function KnockoutTeamSearch({
  onSelect,
  states,
}: {
  onSelect: (state: KnockoutTeamState) => void
  /** Optional override, e.g. a simulated bracket; defaults to the real tournament. */
  states?: KnockoutTeamState[]
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const teams = useMemo(
    () =>
      states ??
      [...ALL_KO_TEAMS].sort((a, b) => a.localeCompare(b)).map(knockoutTeamState),
    [states],
  )
  const filtered = teams.filter((state) =>
    `${state.team} ${groupSeed(state.team)}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  const choose = (state: KnockoutTeamState) => {
    setQuery(state.team)
    setOpen(false)
    onSelect(state)
  }

  return (
    <div ref={root} className="relative z-20 mb-4 max-w-xl">
      <label
        htmlFor="knockout-team-search"
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500"
      >
        Find a team in the bracket
      </label>
      <div
        className={`glass-control flex items-center rounded-xl border bg-white shadow-sm transition-colors ${
          open
            ? "border-emerald-700 ring-2 ring-emerald-100"
            : "border-stone-300"
        }`}
      >
        <svg
          className="ml-3 shrink-0 text-stone-500"
          width="17"
          height="17"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        >
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14" />
        </svg>
        <input
          id="knockout-team-search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filtered.length === 1) choose(filtered[0])
            if (e.key === "Escape") setOpen(false)
          }}
          placeholder="Search or choose from all 14 teams"
          role="combobox"
          aria-expanded={open}
          aria-controls="knockout-team-results"
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-stone-500"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("")
              setOpen(true)
            }}
            className="liquid mr-2 flex h-7 w-7 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Clear team search"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div
          id="knockout-team-results"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 max-h-80 overflow-y-auto rounded-xl border border-stone-200 bg-white p-2 shadow-xl"
        >
          {filtered.length ? (
            filtered.map((state) => (
              <button
                key={state.team}
                role="option"
                aria-selected={query === state.team}
                onClick={() => choose(state)}
                className={`liquid mb-1 flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left last:mb-0 ${
                  state.eliminated
                    ? "border-stone-200 bg-stone-100 text-stone-600"
                    : state.champion
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-transparent bg-white text-stone-800 hover:border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                <span>
                  <span className="font-semibold">{state.team}</span>
                  <span className="ml-1.5 text-xs opacity-90">
                    ({groupSeed(state.team)})
                  </span>
                </span>
                <span className="shrink-0 text-xs font-medium opacity-90">
                  {state.status}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-6 text-center text-sm text-stone-500">
              No team matches “{query}”.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function KnockoutIntro() {
  const division = activeDivision()
  const bracket = KO_MATCHES.filter((m) => m.round !== "TP" && m.round !== "PO")
  const places = bracket.flatMap((m) => [m.home, m.away]).filter((x) => x.kind === "team" || x.kind === "pending").length
  const first = bracket[0]
  const firstRound = bracket.filter((m) => m.round === first.round).length
  const byes = BYES.length
  const byeNames = BYES.filter((b) => !b.pending).map((b) => b.name)
  const playoff = KO_MATCHES.find((m) => m.round === "PO")
  return (
    <>
      {!division.lineupConfirmed && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900" role="note">
          <strong>Knockout line-up not yet set.</strong> The organisers have published the dates and venues of the final round
          but have not yet drawn which teams play where. Places are shown as group positions to be confirmed, and no team
          names are assumed until the groups finish and the draw is released.
        </p>
      )}
      <p>
        {places} teams contest a single-elimination final round.
        {byes > 0
          ? ` ${byes} group winners${byeNames.length ? `, ${byeNames.join(" and ")},` : ""} receive a bye directly into the quarter-finals, so the first round is a ${ROUND_NAME.R14} (${places} → ${places - firstRound}).`
          : ` The first round is the ${first.round === "R14" ? ROUND_NAME.R14 : ROUND_NAME[first.round].toLowerCase()}.`}{" "}
        The first-named team is the home team. Dashed connectors lead to the third-place play-off between the two semi-final losers.
        {playoff && " A separate play-off between the two group third-placed teams is shown below the third-place match; it does not affect the title bracket."}
      </p>
    </>
  )
}

export function Knockout(props: { onTeam: (t: string) => void; onMatch: (d: Detail) => void }) {
  if (KO_MATCHES.length === 0) {
    return (
      <div className="glass-surface max-w-2xl rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900" role="note">
        <p className="font-semibold">Final round not announced yet</p>
        <p className="mt-1">
          The organisers have published the group fixtures for {activeDivision().title} but not the final-round bracket, so
          there are no knockout matches, dates or seeds to show. This tab fills in once the bracket is released; no line-up is
          assumed in the meantime.
        </p>
      </div>
    )
  }
  return <KnockoutBracket {...props} />
}

function KnockoutBracket({
  onTeam,
  onMatch,
}: {
  onTeam: (t: string) => void
  onMatch: (d: Detail) => void
}) {
  const zoom = useBracketZoom("ko")
  const resultIssues = useMemo(() => validateResults(), [])
  return (
    <div>
      <DataNotice issues={resultIssues} title="Results check" />
      <KnockoutTracker />
      <div className="mb-5 max-w-3xl space-y-2 text-sm text-stone-600">
        <KnockoutIntro />
      </div>

      <KnockoutTeamSearch
        onSelect={(state) => zoom.go({ kind: "match", id: state.target.id })}
      />

      <BracketToolbar zoom={zoom} />

      <BracketViewport zoom={zoom}>
        {BYES.map((b) => (
          <div
            key={b.to + b.slot}
            className="liquid absolute rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3"
            style={{
              left: colX(0),
              top: b.y - BYE_H / 2,
              width: CARD_W,
              height: BYE_H,
            }}
          >
            <div className="flex h-full flex-col justify-center">
              <div className="flex items-center justify-between">
                {b.pending ? (
                  <span className="text-base font-semibold text-stone-700">{b.seed || "To be confirmed"}</span>
                ) : (
                  <TeamBtn name={b.name} onTeam={onTeam} className="text-base" />
                )}
                <span className="rounded bg-emerald-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Bye
                </span>
              </div>
              <div className="mt-1 text-xs leading-snug text-stone-600">
                {b.pending ? "Team to be confirmed" : b.seed}
              </div>
              <div className="text-xs leading-snug text-stone-600">
                Direct to quarter-final
              </div>
            </div>
          </div>
        ))}

        {KO_MATCHES.map((m) => (
          <div key={m.id}>
            <div
              className={`absolute whitespace-nowrap text-[11px] font-semibold uppercase tracking-widest ${
                m.id === "F" ? "text-amber-700" : "text-stone-500"
              }`}
              style={{
                left: POS[m.id].x + 2,
                top: POS[m.id].y - CARD_H / 2 - 19,
              }}
            >
              {TAG[m.id]}
            </div>
            <MatchCard
              m={m}
              onTeam={onTeam}
              onMatch={onMatch}
              onZoom={() => zoom.go({ kind: "match", id: m.id })}
            />
          </div>
        ))}
      </BracketViewport>
      <BracketTip />
    </div>
  )
}

export function SlotRow({
  s,
  m,
  onTeam,
}: {
  s: Slot
  m: KoMatch
  onTeam: (t: string) => void
}) {
  const t = slotTeam(s)
  const isHome = m.home === s
  const score = m.score ? m.score[isHome ? 0 : 1] : null
  const winner = koWinner(m)
  const won = Boolean(t && winner === t)
  const lost = Boolean(t && winner && winner !== t)
  // Played matches fill the whole row: strong green for the winner, red for the loser.
  const tone = won
    ? "border-l-4 border-emerald-600 bg-emerald-100 font-semibold text-emerald-950"
    : lost
      ? "border-l-4 border-rose-500 bg-rose-100 text-rose-900"
      : "border-l-4 border-transparent"
  const star = m.scoreTbc ? "*" : ""
  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-1.5 ${tone}`}>
      {t ? (
        <TeamBtn name={t} onTeam={onTeam} className="text-sm" />
      ) : (
        <span className="truncate text-sm italic text-stone-500">
          {slotText(s)}
        </span>
      )}
      <span className="whitespace-nowrap text-sm font-semibold tabular-nums">
        {score !== null && `${score}${star}`}
        {m.pens && (
          <span className="ml-1 text-xs font-normal">
            ({m.pens[isHome ? 0 : 1]}){star}
          </span>
        )}
      </span>
    </div>
  )
}

export function MatchCard({
  m,
  onTeam,
  onMatch,
  onZoom,
}: {
  m: KoMatch
  onTeam: (t: string) => void
  onMatch: (d: Detail) => void
  onZoom: () => void
}) {
  const p = POS[m.id]
  return (
    <div
      onClick={() => onMatch({ kind: "ko", id: m.id })}
      {...activateOnKey(() => onMatch({ kind: "ko", id: m.id }))}
      aria-label={`${TAG[m.id]}: open match details`}
      className={`liquid absolute cursor-pointer overflow-hidden rounded-lg border bg-white shadow-sm ${
        m.round === "F"
          ? "border-amber-400"
          : m.round === "TP"
            ? "border-dashed border-stone-400"
            : "border-stone-300"
      }`}
      style={{
        left: p.x,
        top: p.y - CARD_H / 2,
        width: CARD_W,
        height: CARD_H,
      }}
    >
      <div className="flex items-center justify-between bg-stone-100 px-3 py-1 text-[11px] text-stone-600">
        <span>
          {fmtDate(m.date)} · {m.time}
        </span>
        <span className="flex items-center gap-1.5">
          {m.scoreTbc && (
            <span className="whitespace-nowrap font-semibold text-amber-700" title="Score to be confirmed and double-checked">
              TBC*
            </span>
          )}
          <span className="font-medium">
            {m.id === "TP" ? "3rd" : m.id === "F" ? "Final" : m.id}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onZoom()
            }}
            aria-label="Zoom to this match"
            title="Zoom to this match"
            className="rounded p-0.5 text-stone-500 hover:text-emerald-800"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" />
            </svg>
          </button>
        </span>
      </div>
      <SlotRow s={m.home} m={m} onTeam={onTeam} />
      <div className="mx-3 border-t border-stone-100" />
      <SlotRow s={m.away} m={m} onTeam={onTeam} />
      <div className="border-t border-stone-100 px-3 py-1 text-[11px] leading-tight text-stone-600">
        {VENUES[m.venue]}
      </div>
    </div>
  )
}
