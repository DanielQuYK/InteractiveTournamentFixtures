import { useState } from "react"
import { koById, koPlayed, matchCode, slotText, slotTeam } from "../lib/data"
import { TAG } from "../lib/bracketLayout"
import { MATCH_ORDER, type ScenarioCondition } from "../lib/simulation"
import { describeCondition, possibleParticipants, type ExpandedScenario } from "../lib/scenario"

const matchName = (id: string) => `${TAG[id]} (${matchCode(koById(id))})`

/** A short account of who plays, using real teams where known. */
function pairing(id: string) {
  const m = koById(id)
  const h = slotTeam(m.home), a = slotTeam(m.away)
  return `${h ?? slotText(m.home)} v ${a ?? slotText(m.away)}`
}

/**
 * Lets the user dictate results that must happen in every counted simulation: who wins a match and,
 * optionally, the scoreline. Works for matches not yet played and for ones already played.
 */
export function ScenarioPanel({
  conditions,
  onChange,
  expanded,
  disabled,
}: {
  conditions: ScenarioCondition[]
  onChange: (next: ScenarioCondition[]) => void
  expanded: ExpandedScenario
  disabled?: boolean
}) {
  const [id, setId] = useState<string>("")
  const [winner, setWinner] = useState("")
  const [wg, setWg] = useState("")
  const [lg, setLg] = useState("")
  // An example taken from this competition's next game with both teams known
  const next = MATCH_ORDER.map(koById).find((m) => !koPlayed(m) && slotTeam(m.home) && slotTeam(m.away))
  const example = next ? `${slotTeam(next.home)} beat ${slotTeam(next.away)}` : "one team beat another"
  const options = id ? possibleParticipants(id) : []
  const hasScore = wg !== "" || lg !== ""
  const wgN = Number(wg), lgN = Number(lg)
  const scoreError = hasScore
    ? wg === "" || lg === ""
      ? "Enter both goal counts, or leave both empty."
      : !Number.isInteger(wgN) || !Number.isInteger(lgN) || wgN < 0 || lgN < 0 || wgN > 30 || lgN > 30
        ? "Goals must be whole numbers from 0 to 30."
        : wgN < lgN
          ? "The winner cannot score fewer goals than the loser."
          : ""
    : ""
  const canAdd = Boolean(id && winner && !scoreError)

  const add = () => {
    if (!canAdd) return
    const next: ScenarioCondition = { id, winner, ...(hasScore ? { goals: [wgN, lgN] as [number, number] } : {}) }
    onChange([...conditions.filter((c) => c.id !== id), next])
    setId("")
    setWinner("")
    setWg("")
    setLg("")
  }
  const explicitIds = new Set(conditions.map((c) => c.id))
  const implied = expanded.conditions.filter((c) => c.implied && !explicitIds.has(c.id))

  return (
    <div>
      <p className="mb-3 text-sm text-stone-700">
        Optionally make results happen in <strong>every</strong> simulated tournament, for example “{example}”, to see what
        follows. You can set games still to come, or games already played to see what would have happened had they gone the other
        way. To win a match a team must win its way there, so those earlier results are added automatically. Games that depended on a
        result you change are simulated again instead of using their real result.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500">
          Match
          <select
            value={id}
            disabled={disabled}
            onChange={(e) => { setId(e.target.value); setWinner("") }}
            className="glass-control mt-1 block w-64 max-w-full rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm font-normal normal-case tracking-normal text-stone-900 outline-none focus:border-emerald-700"
          >
            <option value="">Choose a match…</option>
            {MATCH_ORDER.map((m) => (
              <option key={m} value={m}>
                {matchCode(koById(m))} · {pairing(m)}{koPlayed(koById(m)) ? " (played)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500">
          Winner
          <select
            value={winner}
            disabled={disabled || !id}
            onChange={(e) => setWinner(e.target.value)}
            className="glass-control mt-1 block w-44 rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm font-normal normal-case tracking-normal text-stone-900 outline-none focus:border-emerald-700 disabled:opacity-50"
          >
            <option value="">Choose a team…</option>
            {options.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <fieldset disabled={disabled || !id} className="flex items-end gap-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500">
            Winner’s goals
            <input
              type="number" min={0} max={30} inputMode="numeric" value={wg} onChange={(e) => setWg(e.target.value)} placeholder="any"
              className="glass-control mt-1 block w-20 rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm font-normal text-stone-900 outline-none focus:border-emerald-700 disabled:opacity-50"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500">
            Loser’s goals
            <input
              type="number" min={0} max={30} inputMode="numeric" value={lg} onChange={(e) => setLg(e.target.value)} placeholder="any"
              className="glass-control mt-1 block w-20 rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm font-normal text-stone-900 outline-none focus:border-emerald-700 disabled:opacity-50"
            />
          </label>
        </fieldset>
        <button
          type="button"
          onClick={add}
          disabled={!canAdd || disabled}
          className="liquid rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Add condition
        </button>
      </div>
      <p className="mt-1.5 text-xs text-stone-600" aria-live="polite">
        {scoreError || "Leave the goals empty to allow any scoreline. Equal goals mean the winner won the penalty shoot-out."}
      </p>

      {conditions.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Conditions that must happen</h4>
            <button type="button" disabled={disabled} onClick={() => onChange([])} className="text-xs font-medium text-emerald-800 underline">
              Remove all
            </button>
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {conditions.map((c) => {
              const e = expanded.conditions.find((x) => x.id === c.id)
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5">
                  <span className="font-medium">{describeCondition(c)}</span>
                  <span className="text-xs text-stone-600">{pairing(c.id)}</span>
                  {e?.reverses && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Changes the real result</span>
                  )}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(conditions.filter((x) => x.id !== c.id))}
                    aria-label={`Remove condition ${describeCondition(c)}`}
                    className="ml-auto rounded-full border border-stone-300 bg-white px-2 text-xs hover:border-rose-500"
                  >
                    Remove
                  </button>
                </li>
              )
            })}
            {implied.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-stone-300 bg-white px-3 py-1.5 text-stone-700">
                <span>{describeCondition(c)}</span>
                <span className="text-xs text-stone-500">needed to reach the match above</span>
                {c.reverses && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Changes the real result</span>
                )}
              </li>
            ))}
          </ul>
          {expanded.reversed.length > 0 && (
            <p className="mt-2 text-xs text-amber-900">
              Changed real results: {expanded.reversed.map(matchName).join("; ")}. Those games, and every later game that depended on them,
              are simulated instead of using their real result, and are not used when rating the teams.
            </p>
          )}
        </div>
      )}
      {expanded.conflicts.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900" role="alert">
          {expanded.conflicts.map((c) => <li key={c}>{c}</li>)}
        </ul>
      )}
    </div>
  )
}
