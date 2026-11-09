import { useEffect, useMemo, useState } from "react"
import { ALL_KO_TEAMS } from "../lib/data"
import {
  DEFAULT_PARAMS,
  PARAM_SPECS,
  RATING_MAX,
  RATING_MIN,
  type ParamSpec,
} from "../lib/modelParams"
import { groupSeed } from "../lib/stats"
import type { ModelSettings } from "../lib/useModelSettings"
import { fixedMatchIds, simulationStrengths, type StartStage } from "../lib/simulation"

const fmt = (n: number) => n.toFixed(2)

interface NumberFieldProps {
  label: string
  value: number | null
  min: number
  max: number
  step: number
  prefix?: string
  integer?: boolean
  /** Text shown when the field is empty (an unset optional value). */
  placeholder?: string
  /** True when blank is allowed and means "not set". */
  optional?: boolean
  disabled: boolean
  onCommit: (value: number | null) => void
}

/** A numeric input that accepts typing freely and applies a valid, in-range value when you finish. */
function NumberField({ label, value, min, max, step, prefix, integer, placeholder, optional, disabled, onCommit }: NumberFieldProps) {
  const shown = value === null ? "" : String(value)
  const [draft, setDraft] = useState(shown)
  const [invalid, setInvalid] = useState(false)
  useEffect(() => {
    setDraft(shown)
    setInvalid(false)
  }, [shown])

  const commit = () => {
    const text = draft.trim()
    if (text === "") {
      if (optional) onCommit(null)
      else setDraft(shown)
      setInvalid(false)
      return
    }
    const parsed = Number(text)
    if (!Number.isFinite(parsed)) {
      setInvalid(true)
      setDraft(shown)
      return
    }
    let next = Math.min(max, Math.max(min, parsed))
    if (integer) next = Math.round(next)
    setInvalid(parsed < min || parsed > max)
    onCommit(next)
    setDraft(String(next))
  }

  return (
    <span className="inline-flex flex-col">
      <span className="inline-flex items-center gap-1">
        {prefix && <span className="text-stone-600">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          aria-label={label}
          aria-invalid={invalid}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur()
            if (e.key === "Escape") {
              setDraft(shown)
              setInvalid(false)
            }
          }}
          className={`glass-control w-24 rounded border px-2 py-1 tabular-nums outline-none focus:border-emerald-700 ${
            disabled ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-700" : "border-stone-300 bg-white"
          } ${invalid ? "border-rose-500" : ""}`}
        />
      </span>
      {invalid && (
        <span className="mt-0.5 text-[10px] text-rose-700" role="alert">
          Allowed {min}–{max}; adjusted
        </span>
      )}
    </span>
  )
}

export function SimulationParameters({ stage, fixedIds, settings }: { stage: StartStage; fixedIds?: string[]; settings: ModelSettings }) {
  const [editing, setEditing] = useState(false)
  const [koOnly, setKoOnly] = useState(true)
  const [query, setQuery] = useState("")
  const { params, overrides } = settings
  const knockoutResults = fixedMatchIds(stage, fixedIds).size
  const strengths = useMemo(
    () => simulationStrengths(fixedMatchIds(stage, fixedIds), params, overrides),
    [stage, fixedIds, params, overrides],
  )
  const editedCount = settings.editedKeys.length + Object.values(overrides).reduce((n, o) => n + Number(o.attack !== undefined) + Number(o.weakness !== undefined), 0)

  const rows = useMemo(() => {
    const entries = [...strengths.records.entries()].map(([team, r]) => ({
      team,
      attack: r.attack / strengths.average,
      weakness: r.defence / strengths.average,
      fitted: strengths.fitted.get(team)!,
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

  const paramField = (spec: ParamSpec) => {
    const isBaseline = spec.key === "baselineOverride"
    const current = params[spec.key] as number | null
    const edited = settings.editedKeys.includes(spec.key)
    return (
      <tr key={spec.key} className="liquid border-t border-stone-100 align-top">
        <td className="px-3 py-2 font-semibold">
          {spec.label}
          {edited && <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">Edited</span>}
        </td>
        <td className="px-3 py-2">
          <div className="flex flex-wrap items-start gap-2">
            <NumberField
              label={spec.label}
              value={current}
              min={spec.min}
              max={spec.max}
              step={spec.step}
              prefix={spec.prefix}
              integer={spec.integer}
              optional={isBaseline}
              placeholder={isBaseline ? `auto ${fmt(strengths.calculatedAverage)}` : undefined}
              disabled={!editing}
              onCommit={(v) => {
                if (v === null || v === (DEFAULT_PARAMS[spec.key] as number | null)) settings.resetParam(spec.key)
                else settings.setParam(spec.key, v as never)
              }}
            />
            {editing && edited && (
              <button
                type="button"
                onClick={() => settings.resetParam(spec.key)}
                className="liquid rounded border border-stone-300 bg-white px-2 py-1 text-[11px] text-stone-700"
                aria-label={`Reset ${spec.label} to ${DEFAULT_PARAMS[spec.key] ?? "calculated"}`}
              >
                Reset
              </button>
            )}
          </div>
          <span className="mt-1 block text-[10px] text-stone-600">
            Default: {DEFAULT_PARAMS[spec.key] === null ? `calculated (${fmt(strengths.calculatedAverage)})` : String(DEFAULT_PARAMS[spec.key])}
            {spec.key === "knockoutWeight" && !knockoutResults && " · not used from this stage"}
          </span>
        </td>
        <td className="px-3 py-2 text-stone-700">{spec.meaning}</td>
        <td className="px-3 py-2 text-stone-700">{spec.reason}</td>
        <td className="px-3 py-2 text-stone-700">{spec.range}</td>
      </tr>
    )
  }

  return (
    <details className="glass-surface mb-6 rounded-xl border border-stone-200 bg-white p-4 text-sm sm:p-5">
      <summary className="cursor-pointer text-base font-semibold">
        Model parameters and team ratings
        {editedCount > 0 && (
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
            {editedCount} edited
          </span>
        )}
      </summary>
      <div className="mt-4 space-y-6">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
          <p className="min-w-[16rem] flex-1 text-xs leading-relaxed text-stone-700">
            <strong>
              {knockoutResults
                ? `Calculated from group-stage matches plus ${knockoutResults} official knockout result${knockoutResults > 1 ? "s" : ""}.`
                : "Calculated from group-stage matches only; no knockout result is used."}
            </strong>{" "}
            Edits apply to the next run and to the win probabilities in the Knockout tab. Existing runs keep the settings they used. Edits are
            remembered for this browser session.
          </p>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-pressed={editing}
            className={`liquid rounded-lg border px-3 py-2 text-xs font-semibold ${
              editing ? "border-emerald-800 bg-emerald-800 text-white" : "border-stone-300 bg-white text-stone-800"
            }`}
          >
            {editing ? "Done editing" : "Edit parameters"}
          </button>
          <button
            type="button"
            disabled={editedCount === 0}
            onClick={() => {
              if (window.confirm("Reset every parameter and team rating to its default?")) settings.resetAll()
            }}
            className="liquid rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 disabled:opacity-40"
          >
            Reset all to defaults
          </button>
        </div>

        <section>
          <h4 className="mb-2 font-semibold">Global settings</h4>
          <div className="overflow-x-auto rounded-lg border border-stone-200">
            <table className="w-full min-w-[860px] text-left text-xs">
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
                {PARAM_SPECS.map(paramField)}
                <tr className="border-t border-stone-100 align-top">
                  <td className="px-3 py-2 font-semibold">Match length and ties</td>
                  <td className="px-3 py-2">
                    <input
                      disabled
                      readOnly
                      aria-label="Match length and ties (fixed by the rules)"
                      value="35 + 35 min, then penalties"
                      className="w-48 cursor-not-allowed rounded border border-stone-200 bg-stone-100 px-2 py-1 text-stone-700"
                    />
                  </td>
                  <td className="px-3 py-2 text-stone-700">A drawn knockout match goes straight to a penalty shoot-out. There is no extra time.</td>
                  <td className="px-3 py-2 text-stone-700">HKSSF rule. Group games are the same length, so goal rates carry over without adjustment.</td>
                  <td className="px-3 py-2 text-stone-700">Fixed by the rules</td>
                </tr>
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
            {fmt(weakRange[0])}–{fmt(weakRange[1])}. When editing, you can set either value from {RATING_MIN} to {RATING_MAX}; an edited value
            replaces the calculated one for simulations.
          </p>
          <div className="overflow-x-auto rounded-lg border border-stone-200">
            <table className="w-full min-w-[1040px] text-left text-xs">
              <thead className="bg-stone-100 uppercase tracking-wide text-stone-600">
                <tr>
                  <th className="px-3 py-2">Team</th>
                  <th className="px-3 py-2">Attack</th>
                  <th className="px-3 py-2">Weakness</th>
                  <th className="px-3 py-2 text-right">Matches (KO)</th>
                  <th className="px-3 py-2 text-right">Goals per match</th>
                  <th className="px-3 py-2">Why these values</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const d = r.detail
                  const shrink = params.priorMatches / (params.priorMatches + d.weight)
                  const strongerOpposition = d.opponentDefence < 0.95
                  const edit = overrides[r.team]
                  return (
                    <tr key={r.team} className="liquid border-t border-stone-100 align-top">
                      <td className="px-3 py-2 font-semibold">
                        {r.team} <span className="font-normal text-stone-600">({groupSeed(r.team)})</span>
                        {edit && <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">Edited</span>}
                        {editing && edit && (
                          <button
                            type="button"
                            onClick={() => settings.resetRating(r.team)}
                            className="liquid ml-2 rounded border border-stone-300 bg-white px-1.5 py-0.5 text-[10px] font-normal text-stone-700"
                            aria-label={`Reset ${r.team} ratings to calculated values`}
                          >
                            Reset
                          </button>
                        )}
                      </td>
                      {(["attack", "weakness"] as const).map((field) => {
                        const value = r[field]
                        const fitted = r.fitted[field]
                        const isEdited = edit?.[field] !== undefined
                        return (
                          <td key={field} className="whitespace-nowrap px-3 py-2 tabular-nums">
                            <NumberField
                              label={`${r.team} ${field}`}
                              value={Number(value.toFixed(2))}
                              min={RATING_MIN}
                              max={RATING_MAX}
                              step={0.01}
                              disabled={!editing}
                              onCommit={(v) => {
                                if (v === null) return
                                if (Math.abs(v - fitted) < 0.005) settings.resetRating(r.team, field)
                                else settings.setRating(r.team, field, v)
                              }}
                            />
                            <span className="mt-0.5 block text-stone-600">
                              #{field === "attack" ? r.attackRank : r.defenceRank} of {total}
                              {isEdited && ` · calculated ${fmt(fitted)}`}
                            </span>
                          </td>
                        )
                      })}
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                        {d.matches} ({d.knockoutMatches})
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                        {fmt(d.goalsFor / d.matches)} – {fmt(d.goalsAgainst / d.matches)}
                      </td>
                      <td className="px-3 py-2 text-stone-700">
                        Calculated from {fmt(d.goalsFor / d.matches)} goals scored per match ({fmt(d.effectiveFor / d.matches)} after compressing large scores)
                        against opponents whose defences averaged {fmt(d.opponentDefence)}× the norm,{" "}
                        {strongerOpposition ? "tougher than average" : d.opponentDefence > 1.05 ? "easier than average" : "about average"}. Conceded {fmt(d.goalsAgainst / d.matches)} per
                        match against attacks averaging {fmt(d.opponentAttack)}×.
                        {d.knockoutMatches > 0 && ` Includes ${d.knockoutMatches} knockout result${d.knockoutMatches > 1 ? "s" : ""}, weighted ×${params.knockoutWeight}.`}{" "}
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
