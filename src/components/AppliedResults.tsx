import { KO_MATCHES, ROUND_NAME, koWinner, slotTeam } from "../lib/data"
import { TBC_REMARK } from "../lib/matchText"
import { fixedMatchIds, type StartStage } from "../lib/simulation"


/** The official results a simulation treats as already played, with winners in green and losers in red. */
export function AppliedResults({ stage, fixedIds }: { stage: StartStage; fixedIds?: string[] }) {
  const ids = fixedMatchIds(stage, fixedIds)
  const matches = KO_MATCHES.filter((m) => ids.has(m.id))
  if (!matches.length) {
    return (
      <p className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
        No official results are applied: every match is simulated from scratch.
      </p>
    )
  }
  const unconfirmed = matches.some((m) => m.scoreTbc)
  return (
    <div>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label="Official results applied to this simulation">
        {matches.map((m) => {
          const winner = koWinner(m)
          const star = m.scoreTbc ? "*" : ""
          const sides = [
            { team: slotTeam(m.home)!, goals: m.score?.[0], pens: m.pens?.[0] },
            { team: slotTeam(m.away)!, goals: m.score?.[1], pens: m.pens?.[1] },
          ]
          return (
            <li key={m.id} className="liquid overflow-hidden rounded-lg border border-stone-300 bg-white text-sm">
              <p className="bg-stone-100 px-3 py-1 text-[11px] font-medium text-stone-600">
                {ROUND_NAME[m.round]} · {m.label.split(" – ")[1] ?? m.label}
              </p>
              {sides.map((side) => {
                const won = side.team === winner
                return (
                  <div
                    key={side.team}
                    className={`flex items-center justify-between gap-2 border-l-4 px-3 py-1.5 ${
                      won
                        ? "border-emerald-600 bg-emerald-100 font-semibold text-emerald-950"
                        : "border-rose-500 bg-rose-100 text-rose-900"
                    }`}
                  >
                    <span>{side.team}</span>
                    <span className="whitespace-nowrap tabular-nums">
                      {side.goals !== undefined && `${side.goals}${star}`}
                      {side.pens !== undefined && <span className="ml-1 text-xs font-normal">({side.pens}){star}</span>}
                    </span>
                  </div>
                )
              })}
            </li>
          )
        })}
      </ul>
      {unconfirmed && <p className="mt-2 text-xs font-medium text-amber-800">{TBC_REMARK}</p>}
    </div>
  )
}
