import { usePersistentState } from '../lib/hooks'
import { activateOnKey } from '../lib/hooks'
import { useMemo, useState } from 'react'
import { GROUPS, GROUP_MATCHES, PENALTIES, activeDivision, REMARKS, VENUE_SHORT, WITHDRAWN, fmtDate, standings, timeMinutes } from '../lib/data'
import { type Detail, DataNotice, TeamBtn, remarkText } from './shared'
import { penaltyNotes, tieNotes, validateQualifiers } from '../lib/validation'

/* ---------- Group stage ---------- */

export function GroupStage({ onTeam, onMatch }: { onTeam: (t: string) => void; onMatch: (d: Detail) => void }) {
  const [sel, setSel] = usePersistentState<number | 'all'>('group-filter', 'all')
  const list = sel === 'all' ? GROUPS : [sel]
  const dataIssues = useMemo(() => validateQualifiers(), [])
  return (
    <div>
      <DataNotice issues={dataIssues} title="Qualification check" />
      <div className="mb-6 flex flex-wrap gap-2">
        {(['all', ...GROUPS] as const).map((g) => (
          <button
            key={g}
            onClick={() => setSel(g)}
            className={`liquid rounded-full border px-4 py-1.5 text-sm transition-colors ${
              sel === g ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-stone-300 bg-white hover:border-emerald-700'
            }`}
          >
            {g === 'all' ? 'All groups' : `Group ${g}`}
          </button>
        ))}
      </div>

      <div className="glass-surface mb-8 rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-600">
        <p className="font-medium text-stone-800">Notes</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          <li>
            The top two teams in each group (shaded) advance to the final round
            {activeDivision().lineupConfirmed ? '' : '; until the organisers announce the line-up the shading shows the current top two only'}.
            Ranking: points, then results between teams level on points, goal difference and goals scored.
          </li>
          <li>Remarks: {Object.entries(REMARKS).map(([k, v]) => `${k} = ${v}`).join('; ')}.</li>
          {Object.entries(WITHDRAWN).map(([team, note]) => (
            <li key={team}>
              {team} (Group {GROUP_MATCHES.find((m) => m.home === team || m.away === team)?.group}): {note.charAt(0).toLowerCase() + note.slice(1)}; their fixtures are recorded as cancelled and are excluded from the standings.
            </li>
          ))}
          {Object.entries(PENALTIES).map(([team, pts]) => (
            <li key={team}>
              {team} (Group {GROUP_MATCHES.find((m) => m.home === team || m.away === team)?.group}) were disqualified from a fixture and a deduction of {pts} points applies.
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-10">
        {list.map((g) => (
          <GroupBlock key={g} group={g} onTeam={onTeam} onMatch={onMatch} />
        ))}
      </div>
    </div>
  )
}

export function GroupBlock({ group, onTeam, onMatch }: { group: number; onTeam: (t: string) => void; onMatch: (d: Detail) => void }) {
  const table = useMemo(() => standings(group), [group])
  const matches = GROUP_MATCHES.filter((m) => m.group === group).sort(
    (a, b) => a.date.localeCompare(b.date) || timeMinutes(a.time) - timeMinutes(b.time),
  )
  const withdrawn = [...new Set(matches.flatMap((m) => [m.home, m.away]))].filter((t) => WITHDRAWN[t])
  return (
    <section>
      <h2 className="mb-3 flex items-baseline gap-3 text-lg font-semibold">
        Group {group}
        {withdrawn.map((w) => (
          <span key={w} className="text-xs font-normal text-stone-500">{w} withdrew</span>
        ))}
      </h2>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="min-w-0">
        <div className="glass-surface overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full min-w-[340px] text-sm">
            <thead className="bg-stone-100 text-xs uppercase tracking-wide text-stone-600">
              <tr>
                <th className="py-2 pl-3 text-left">#</th>
                <th className="py-2 text-left">Team</th>
                {['P', 'W', 'D', 'L', 'GF', 'GA', 'GD'].map((h) => <th key={h} className="px-1.5 py-2 text-center">{h}</th>)}
                <th className="py-2 pr-3 text-center">Pts</th>
              </tr>
            </thead>
            <tbody>
              {table.map((r, i) => (
                <tr key={r.team} className={`liquid border-t border-stone-100 ${i < 2 ? 'bg-emerald-50' : ''}`}>
                  <td className="py-2 pl-3 text-stone-500">{i + 1}</td>
                  <td className="py-2">
                    <TeamBtn name={r.team} onTeam={onTeam} />
                    {r.penalty > 0 && <span className="ml-1.5 text-xs text-stone-500">(−{PENALTIES[r.team]})</span>}
                  </td>
                  {[r.p, r.w, r.d, r.l, r.gf, r.ga, r.gd > 0 ? `+${r.gd}` : r.gd].map((v, k) => (
                    <td key={k} className="px-1.5 py-2 text-center tabular-nums">{v}</td>
                  ))}
                  <td className="py-2 pr-3 text-center font-semibold tabular-nums">{r.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          {(tieNotes(group).length > 0 || penaltyNotes(group).length > 0) && (
            <ul className="mt-2 space-y-1 px-1 text-xs leading-relaxed text-stone-600">
              {[...tieNotes(group), ...penaltyNotes(group)].map((n) => <li key={n}>{n}</li>)}
            </ul>
          )}
        </div>

        <div className="glass-surface overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-stone-100 text-xs uppercase tracking-wide text-stone-600">
              <tr>
                <th className="py-2 pl-3 text-left">Kick-off</th>
                <th className="py-2 text-right">Home</th>
                <th className="px-2 py-2 text-center">Score</th>
                <th className="py-2 text-left">Away</th>
                <th className="py-2 pr-3 text-left">Venue / remarks</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.game + m.date + m.home} onClick={() => onMatch({ kind: 'group', m })} {...activateOnKey(() => onMatch({ kind: 'group', m }), false)} aria-label={`${m.home} v ${m.away}, group ${m.group} game ${m.game}. Open match details`} className="liquid cursor-pointer border-t border-stone-100 align-top">
                  <td className="whitespace-nowrap py-2 pl-3 text-stone-600">
                    <div>{fmtDate(m.date)}</div>
                    <div className="text-xs text-stone-500">{m.time}</div>
                  </td>
                  <td className="py-2 text-right"><TeamBtn name={m.home} onTeam={onTeam} /></td>
                  <td className="px-2 py-2 text-center font-semibold tabular-nums">
                    {m.hs === null ? <span className="font-normal text-stone-500">–</span> : `${m.hs} : ${m.as}`}
                  </td>
                  <td className="py-2"><TeamBtn name={m.away} onTeam={onTeam} /></td>
                  <td className="py-2 pr-3 text-xs text-stone-500">
                    <div>{VENUE_SHORT[m.venue]}</div>
                    {m.remark && <div className="font-medium text-amber-700">{remarkText(m.remark)}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

