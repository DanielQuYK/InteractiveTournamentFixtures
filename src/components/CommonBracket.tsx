import { useMemo, useState } from "react"
import { koById } from "../lib/data"
import { activateOnKey } from "../lib/hooks"
import { groupSeed } from "../lib/stats"
import { fixedMatchIds } from "../lib/simulation"
import {
  MATCH_ORDER,
  MIN_BRACKET_RUNS,
  bracketParticipants,
  probabilityInterval,
  type SimulationRun,
} from "../lib/simulation"
import {
  BYES,
  BYE_H,
  CARD_H,
  CARD_W,
  POS,
  TAG,
  colX,
} from "../lib/bracketLayout"
import { fmtDate, VENUE_SHORT } from "../lib/data"
import { BracketTip, BracketToolbar, BracketViewport, useBracketZoom } from "./BracketViewer"
import { KnockoutTeamSearch, type KnockoutTeamState } from "./Knockout"
import { MatchupScorelines } from "./MatchupScorelines"

const TOP_CHOICES = 5
type MatchId = (typeof MATCH_ORDER)[number]

export function CommonBracket({ run }: { run: SimulationRun }) {
  const [rank, setRank] = useState(0)
  const [openMatch, setOpenMatch] = useState<MatchId | null>(null)
  const zoom = useBracketZoom("sim")
  const ranked = useMemo(
    () => [...run.brackets].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)),
    [run],
  )

  // Share of all runs in which each team won each match slot (reach and win).
  const slotShare = useMemo(() => {
    const totals = MATCH_ORDER.map(() => new Map<string, number>())
    for (const record of run.brackets) {
      record.key.split("|").forEach((winner, i) => {
        totals[i].set(winner, (totals[i].get(winner) ?? 0) + record.count)
      })
    }
    return totals
  }, [run])

  const selected = ranked[Math.min(rank, ranked.length - 1)]
  const winners = useMemo(() => selected?.key.split("|") ?? [], [selected])
  const participants = useMemo(() => (selected ? bracketParticipants(winners) : []), [selected, winners])

  // Where each team's run ends in the selected bracket, for the team search.
  const teamStates = useMemo<KnockoutTeamState[]>(() => {
    if (!selected) return []
    const teams = new Set(participants.flat())
    return [...teams].sort((a, b) => a.localeCompare(b)).map((team) => {
      let last = 0
      participants.forEach((pair, i) => {
        if (pair.includes(team)) last = i
      })
      const id = MATCH_ORDER[last]
      const won = winners[last] === team
      const champion = id === "F" && won
      const status = champion
        ? "Champion"
        : id === "F"
          ? "Runner-up"
          : id === "TP"
            ? won ? "Third place" : "Fourth place"
            : `Out: ${TAG[id]}`
      return { team, target: koById(id), eliminated: !champion, champion, status }
    })
  }, [selected, participants, winners])

  if (run.count < MIN_BRACKET_RUNS) {
    return (
      <section className="glass-surface mt-6 rounded-xl border border-stone-200 bg-white p-4 sm:p-6">
        <h3 className="text-lg font-semibold">Most common bracket</h3>
        <p className="mt-2 text-sm text-stone-600">
          This view needs a run of at least {MIN_BRACKET_RUNS.toLocaleString()} simulations. A full bracket has 14
          winners, so with fewer runs almost every bracket appears only once and “most common” would be meaningless.
          This run has {run.count.toLocaleString()}.
        </p>
      </section>
    )
  }

  const range = probabilityInterval(selected.count, run.count)
  const champion = winners[MATCH_ORDER.indexOf("F")]
  const margin = (i: number) => selected.marginSum[i] / selected.count
  const share = (i: number) => ((slotShare[i].get(winners[i]) ?? 0) / run.count) * 100
  const open = openMatch ? MATCH_ORDER.indexOf(openMatch) : -1
  const fixed = fixedMatchIds(run.startStage)

  return (
    <section className="glass-surface mt-6 rounded-xl border border-stone-200 bg-white p-4 sm:p-6">
      <h3 className="text-lg font-semibold">Most common bracket</h3>
      <p className="mt-1 text-sm text-stone-600">
        The complete set of 14 match winners that occurred most often across {run.count.toLocaleString()} simulations.
        Scorelines are ignored when counting; each match shows the average goal margin instead.
      </p>

      <div className="my-4 flex flex-wrap gap-2" role="group" aria-label="Choose a common bracket">
        {ranked.slice(0, TOP_CHOICES).map((record, i) => {
          const finalWinner = record.key.split("|")[MATCH_ORDER.indexOf("F")]
          return (
            <button
              key={record.key}
              onClick={() => setRank(i)}
              aria-pressed={rank === i}
              className={`liquid rounded-lg border px-3 py-2 text-left text-sm ${
                rank === i ? "border-emerald-800 bg-emerald-800 text-white" : "border-stone-300 bg-white text-stone-700"
              }`}
            >
              <span className="block font-semibold">#{i + 1} · {finalWinner} champion</span>
              <span className="block text-xs opacity-90">
                {record.count.toLocaleString()} of {run.count.toLocaleString()} runs ·{" "}
                {((record.count / run.count) * 100).toFixed(1)}%
              </span>
            </button>
          )
        })}
      </div>

      <div className="glass-surface mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <p>
          <strong>
            This exact bracket occurred in {selected.count.toLocaleString()} of {run.count.toLocaleString()} runs (
            {((selected.count / run.count) * 100).toFixed(1)}%, 95% CI {range.low.toFixed(1)}–{range.high.toFixed(1)}%).
          </strong>{" "}
          {run.brackets.length.toLocaleString()} different brackets occurred. Even the most common one is usually a small
          share of runs, because one bracket needs 14 separate results to line up.
        </p>
        <p className="mt-1">
          In this bracket, <strong>{champion}</strong> ({groupSeed(champion)}) wins the title. This is the most frequent
          complete scenario, not necessarily the single most likely champion; see the title probabilities above for that.
        </p>
      </div>

      <KnockoutTeamSearch
        states={teamStates}
        onSelect={(state) => zoom.go({ kind: "match", id: state.target.id })}
      />
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
              <span className="rounded bg-emerald-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Bye
              </span>
            </div>
            <div className="mt-1 text-xs leading-snug text-stone-600">{bye.seed}</div>
            <div className="text-xs leading-snug text-stone-600">Direct to quarter-final</div>
          </div>
        ))}

        {MATCH_ORDER.map((id, i) => (
          <div key={id}>
            <div
              className={`absolute whitespace-nowrap text-[11px] font-semibold uppercase tracking-widest ${
                id === "F" ? "text-amber-700" : "text-stone-500"
              }`}
              style={{ left: POS[id].x + 2, top: POS[id].y - CARD_H / 2 - 19 }}
            >
              {TAG[id]}
            </div>
            <SimulatedMatchCard
              id={id}
              teams={participants[i]}
              winner={winners[i]}
              margin={margin(i)}
              share={share(i)}
              official={fixed.has(id)}
              onOpen={() => setOpenMatch(id)}
              onZoom={() => zoom.go({ kind: "match", id })}
            />
          </div>
        ))}
      </BracketViewport>
      <BracketTip />

      {openMatch && open >= 0 && (
        <MatchupScorelines
          run={run}
          matchId={openMatch}
          home={participants[open][0]}
          away={participants[open][1]}
          onClose={() => setOpenMatch(null)}
        />
      )}

      <p className="mt-3 text-xs text-stone-600">
        Select any match to see its most common scoreline across every simulation in which these two teams met.
      </p>
      <div className="glass-surface mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-stone-200 p-3 text-xs leading-relaxed text-stone-600">
        <span className="flex items-center gap-1.5">
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800">+1.0</span> winner’s average margin
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded bg-rose-100 px-1.5 py-0.5 font-semibold text-rose-700">-1.0</span> losing side’s average margin
        </span>
        <span>
          Averages cover the {selected.count.toLocaleString()} runs that produced exactly this bracket; a win on penalties counts as 0.0. “In xx% of runs” is how often that team won that match across every run.
        </span>
      </div>
    </section>
  )
}

interface SimulatedMatchCardProps {
  id: MatchId
  teams: [string, string]
  winner: string
  margin: number
  share: number
  /** True when this match is an official result applied in every run. */
  official: boolean
  onOpen: () => void
  onZoom: () => void
}

function SimulatedMatchCard({ id, teams, winner, margin, share, official, onOpen, onZoom }: SimulatedMatchCardProps) {
  const match = koById(id)
  const p = POS[id]
  return (
    <div
      onClick={onOpen}
      {...activateOnKey(onOpen)}
      aria-label={`${TAG[id]}: ${teams[0]} v ${teams[1]}. Show simulated scorelines`}
      className={`liquid absolute flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-white shadow-sm ${
        id === "F" ? "border-amber-400" : id === "TP" ? "border-dashed border-stone-400" : "border-stone-300"
      }`}
      style={{ left: p.x, top: p.y - CARD_H / 2, width: CARD_W, height: CARD_H }}
    >
      <div className="flex items-center justify-between bg-stone-100 px-3 py-1 text-[11px] text-stone-600">
        <span>{fmtDate(match.date)} · {match.time}</span>
        <span className="flex items-center gap-1.5">
          <span className="font-medium">{id === "TP" ? "3rd" : id === "F" ? "Final" : id}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onZoom()
            }}
            aria-label="Zoom to this match"
            title="Zoom to this match"
            className="rounded p-0.5 text-stone-500 hover:text-emerald-800"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" />
            </svg>
          </button>
        </span>
      </div>
      {teams.map((team, index) => {
        const won = team === winner
        const star = official && match.scoreTbc ? "*" : ""
        const goals = official && match.score ? match.score[index] : null
        const pens = official && match.pens ? match.pens[index] : null
        return (
          <div
            key={team}
            className={`flex flex-1 items-center justify-between gap-2 border-b border-white border-l-4 px-3 text-sm ${
              won
                ? "border-l-emerald-600 bg-emerald-100 font-semibold text-emerald-950"
                : "border-l-rose-500 bg-rose-100 text-rose-900"
            }`}
          >
            <span className="truncate">
              {team} <span className="text-[11px] font-normal opacity-80">({groupSeed(team)})</span>
            </span>
            <span
              className={`shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
                won ? "bg-emerald-200 text-emerald-900" : "bg-rose-200 text-rose-800"
              }`}
            >
              {goals !== null ? (
                <>
                  {goals}
                  {star}
                  {pens !== null && <span className="ml-1 font-normal">({pens}){star}</span>}
                </>
              ) : (
                <>
                  {won ? "+" : "-"}
                  {margin.toFixed(1)}
                </>
              )}
            </span>
          </div>
        )
      })}
      <div className="flex items-center justify-between gap-3 px-3 py-1 text-[11px] leading-tight text-stone-600">
        {/* The venue may wrap to a second row; it is never cut off. */}
        <span className="min-w-0 flex-1">{VENUE_SHORT[match.venue]}</span>
        <span className="shrink-0 whitespace-nowrap text-right">
          {official ? (
            <span className="font-semibold text-emerald-800">
              <span className="block">Official</span>
              <span className="block">result{match.scoreTbc ? "*" : ""}</span>
            </span>
          ) : (
            <>
              <span className="block">{winner} won in</span>
              <span className="block">{share.toFixed(1)}% of runs</span>
            </>
          )}
        </span>
      </div>
    </div>
  )
}
