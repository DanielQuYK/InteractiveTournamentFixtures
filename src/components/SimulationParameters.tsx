import { useMemo, useState } from "react"
import { ALL_KO_TEAMS } from "../lib/data"
import { groupSeed } from "../lib/stats"
import {
  COMPRESS_FACTOR,
  COMPRESS_FROM,
  EVIDENCE_FLOOR,
  EXTRA_TIME_SHARE,
  HOME_ADVANTAGE,
  KNOCKOUT_RATING_WEIGHT,
  LAMBDA_MAX,
  LAMBDA_MIN,
  PRIOR_MATCHES,
  RATING_ITERATIONS,
  fixedMatchIds,
  simulationStrengths,
  type StartStage,
} from "../lib/simulation"

interface ParameterRow {
  name: string
  value: string
  meaning: string
  reason: string
  range: string
}

function globalParameters(average: number): ParameterRow[] {
  return [
    {
      name: "Baseline goals per team per match (μ)",
      value: average.toFixed(2),
      meaning: "The goal rate of an average team against an average defence. Every expected-goals figure is built from it.",
      reason: "Calculated from all matches counted, using effective (compressed) goals. It is not chosen by hand.",
      range: "Typically 1.5–3.5 in schools football",
    },
    {
      name: "Home (first-named) advantage",
      value: `×${HOME_ADVANTAGE}`,
      meaning: "Multiplies the first-named team's expected goals and divides the other team's.",
      reason: "Assumed. Too few home and away results exist to estimate it, and many venues are shared.",
      range: "1.00 (none) to about 1.20",
    },
    {
      name: "Baseline pseudo-matches",
      value: String(PRIOR_MATCHES),
      meaning: "Each team's rating is blended with this many average matches, so a few results cannot swing it far.",
      reason: "Teams have between 4 and 5 games, so a small prior stops one-off scorelines dominating.",
      range: "0 (trust the data fully) to about 6",
    },
    {
      name: "Knockout result weight",
      value: `×${KNOCKOUT_RATING_WEIGHT}`,
      meaning: "How much more a knockout result counts than one group game when rating teams.",
      reason: "Judgement. Knockout games are the only ones between different groups, so they show how groups compare.",
      range: "1.0 (equal) to about 2.5",
    },
    {
      name: "Large-score compression",
      value: `above ${COMPRESS_FROM} goals × ${COMPRESS_FACTOR}`,
      meaning: `Goals beyond ${COMPRESS_FROM} count as 5 + ${COMPRESS_FACTOR} × ln(1 + extra), so 14 becomes about 6.0.`,
      reason: "Stops one lopsided game (such as a 14–0) overstating a team. Applies to rating only, never to shown scores.",
      range: "0.2 (strong) to 1.0 (no compression)",
    },
    {
      name: "Rating iterations",
      value: String(RATING_ITERATIONS),
      meaning: "How many times opponent adjustment is repeated until ratings settle.",
      reason: "Ratings stop changing noticeably well before 14 rounds.",
      range: "5–30",
    },
    {
      name: "Opponent-strength floor",
      value: String(EVIDENCE_FLOOR),
      meaning: "Smallest opponent factor used, so scoring against a very strong defence cannot be over-credited.",
      reason: "Numerical safeguard against extreme values.",
      range: "0.2–0.6",
    },
    {
      name: "Expected goals limits",
      value: `${LAMBDA_MIN} to ${LAMBDA_MAX}`,
      meaning: "Lowest and highest expected goals any team can have in one simulated match.",
      reason: "Keeps unusual mismatches realistic and avoids unstable draws.",
      range: "Lower 0.05–0.3, upper 4–8",
    },
    {
      name: "Extra time",
      value: `${(EXTRA_TIME_SHARE * 100).toFixed(0)}% of normal goal rate`,
      meaning: "A drawn match adds extra-time goals at one third of the usual expected goals.",
      reason: "Assumed from two short periods; the competition rules were not supplied.",
      range: "20–50%",
    },
    {
      name: "Shoot-out winner",
      value: "Weighted by expected goals",
      meaning: "If still level, the first-named team wins with probability λ home ÷ (λ home + λ away).",
      reason: "Assumed. Shoot-outs are close to chance, so the tilt is mild.",
      range: "50% (pure chance) to the expected-goals ratio",
    },
  ]
}

const fmt = (n: number) => n.toFixed(2)

export function SimulationParameters({ stage }: { stage: StartStage }) {
  const [koOnly, setKoOnly] = useState(true)
  const [query, setQuery] = useState("")
  const strengths = useMemo(() => simulationStrengths(fixedMatchIds(stage)), [stage])
  const rows = useMemo(() => {
    const entries = [...strengths.records.entries()].map(([team, r]) => ({
      team,
      attack: r.attack / strengths.average,
      weakness: r.defence / strengths.average,
      detail: strengths.details.get(team)!,
    }))
    const attackRank = [...entries].sort((a, b) => b.attack - a.attack).map((e) => e.team)
    const defenceRank = [...entries].sort((a, b) => a.weakness - b.weakness).map((e) => e.team)
    return entries
      .map((e) => ({ ...e, attackRank: attackRank.indexOf(e.team) + 1, defenceRank: defenceRank.indexOf(e.team) + 1 }))
      .filter((e) => !koOnly || ALL_KO_TEAMS.has(e.team))
      .filter((e) => `${e.team} ${groupSeed(e.team)}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.attack - a.attack)
  }, [strengths, koOnly, query])
  const total = strengths.records.size
  const all = [...strengths.records.values()]
  const attackRange = [Math.min(...all.map((r) => r.attack)), Math.max(...all.map((r) => r.attack))].map((v) => v / strengths.average)
  const weakRange = [Math.min(...all.map((r) => r.defence)), Math.max(...all.map((r) => r.defence))].map((v) => v / strengths.average)

  return (
    <details className="glass-surface mb-6 rounded-xl border border-stone-200 bg-white p-4 text-sm sm:p-5">
      <summary className="cursor-pointer text-base font-semibold">Model parameters and team ratings</summary>
      <div className="mt-4 space-y-6">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
          <p className="flex-1 text-xs leading-relaxed text-stone-700">
            Values shown are those the simulation would use with the starting stage selected above. Editing is not available yet; the controls
            below are shown for reference and are disabled.
          </p>
          <button
            type="button"
            disabled
            title="Editing parameters is not available yet"
            className="rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600 opacity-70"
          >
            Edit parameters (coming soon)
          </button>
        </div>

        <section>
          <h4 className="mb-2 font-semibold">Global settings</h4>
          <div className="overflow-x-auto rounded-lg border border-stone-200">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="bg-stone-100 uppercase tracking-wide text-stone-600">
                <tr>
                  <th className="px-3 py-2">Parameter</th>
                  <th className="px-3 py-2">Value</th>
                  <th className="px-3 py-2">What it means</th>
                  <th className="px-3 py-2">Why this value</th>
                  <th className="px-3 py-2">Sensible range</th>
                </tr>
              </thead>
              <tbody>
                {globalParameters(strengths.average).map((p) => (
                  <tr key={p.name} className="liquid border-t border-stone-100 align-top">
                    <td className="px-3 py-2 font-semibold">{p.name}</td>
                    <td className="px-3 py-2">
                      <input
                        disabled
                        aria-label={`${p.name} (editing disabled)`}
                        value={p.value}
                        readOnly
                        className="w-40 cursor-not-allowed rounded border border-stone-200 bg-stone-100 px-2 py-1 text-stone-700"
                      />
                    </td>
                    <td className="px-3 py-2 text-stone-700">{p.meaning}</td>
                    <td className="px-3 py-2 text-stone-700">{p.reason}</td>
                    <td className="px-3 py-2 text-stone-700">{p.range}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h4 className="font-semibold">Team ratings</h4>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="flex overflow-hidden rounded-full border border-stone-300 text-xs" role="group" aria-label="Team pool">
                <button onClick={() => setKoOnly(true)} className={`liquid px-3 py-1.5 ${koOnly ? "bg-emerald-800 text-white" : "bg-white text-stone-700"}`}>
                  Knockout teams
                </button>
                <button onClick={() => setKoOnly(false)} className={`liquid px-3 py-1.5 ${!koOnly ? "bg-emerald-800 text-white" : "bg-white text-stone-700"}`}>
                  All {total} teams
                </button>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter teams"
                className="glass-control w-36 rounded-lg border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs outline-none focus:border-emerald-700"
              />
            </div>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-stone-700">
            <strong>Attack</strong> is how many goals a team scores compared with an average team: 1.00 is average, 1.40 means 40% more.{" "}
            <strong>Defensive weakness</strong> is how many goals it concedes compared with an average team, so <em>lower is better</em>: 0.70
            means 30% fewer goals conceded. Across all {total} teams, attack ranges {fmt(attackRange[0])}–{fmt(attackRange[1])} and weakness{" "}
            {fmt(weakRange[0])}–{fmt(weakRange[1])}.
          </p>
          <div className="overflow-x-auto rounded-lg border border-stone-200">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="bg-stone-100 uppercase tracking-wide text-stone-600">
                <tr>
                  <th className="px-3 py-2">Team</th>
                  <th className="px-3 py-2 text-right">Attack</th>
                  <th className="px-3 py-2 text-right">Weakness</th>
                  <th className="px-3 py-2 text-right">Matches (KO)</th>
                  <th className="px-3 py-2 text-right">Goals per match</th>
                  <th className="px-3 py-2">Why these values</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const d = r.detail
                  const shrink = PRIOR_MATCHES / (PRIOR_MATCHES + d.weight)
                  const strongerOpposition = d.opponentDefence < 0.95
                  return (
                    <tr key={r.team} className="liquid border-t border-stone-100 align-top">
                      <td className="px-3 py-2 font-semibold">
                        {r.team} <span className="font-normal text-stone-600">({groupSeed(r.team)})</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                        <strong>{fmt(r.attack)}</strong>
                        <span className="block text-stone-600">#{r.attackRank} of {total}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                        <strong>{fmt(r.weakness)}</strong>
                        <span className="block text-stone-600">#{r.defenceRank} of {total}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                        {d.matches} ({d.knockoutMatches})
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                        {fmt(d.goalsFor / d.matches)} – {fmt(d.goalsAgainst / d.matches)}
                      </td>
                      <td className="px-3 py-2 text-stone-700">
                        Scored {fmt(d.goalsFor / d.matches)} per match ({fmt(d.effectiveFor / d.matches)} after compressing large scores) against
                        opponents whose defences averaged {fmt(d.opponentDefence)}× the norm, {strongerOpposition ? "tougher" : d.opponentDefence > 1.05 ? "easier" : "typical"} than
                        average. Conceded {fmt(d.goalsAgainst / d.matches)} per match against attacks averaging {fmt(d.opponentAttack)}×.
                        {d.knockoutMatches > 0 && ` Includes ${d.knockoutMatches} knockout result${d.knockoutMatches > 1 ? "s" : ""}, weighted ×${KNOCKOUT_RATING_WEIGHT}.`}{" "}
                        About {(shrink * 100).toFixed(0)}% of the rating is the average baseline, because there are only {d.matches} matches.
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </details>
  )
}
