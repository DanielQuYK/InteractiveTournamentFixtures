import { useMemo } from 'react'
import { usePersistentState } from '../lib/hooks'
import { activeDivision, ROUND_NAME } from '../lib/data'
import { LEADERBOARD_METRICS, leaderboard, type LeaderRow, type LeaderboardMode } from '../lib/leaderboard'
import { TeamBtn } from './shared'

const MODES: { id: LeaderboardMode; name: string; blurb: string }[] = [
  { id: 'stage', name: 'By stage reached', blurb: 'Places decided only by how far each team got. Teams out at the same stage are tied.' },
  { id: 'full', name: 'Full ranking', blurb: 'Same, but teams out at the same stage are separated by their group-stage record.' },
]

const signed = (n: number) => (n > 0 ? `+${n}` : String(n))

/** A total with the part earned in knockout games beside it, e.g. "12 (3)". */
function Cell({ t, sign = false, ko }: { t: { total: number; knockout: number }; sign?: boolean; ko: boolean }) {
  const fmt = (n: number) => (sign ? signed(n) : String(n))
  return (
    <>
      {fmt(t.total)}
      {ko && t.knockout !== 0 || (ko && !sign && t.knockout === 0) ? (
        <span className="ml-1 text-xs text-stone-500">({fmt(t.knockout)})</span>
      ) : null}
    </>
  )
}

export function Leaderboard({ onTeam }: { onTeam: (t: string) => void }) {
  const [mode, setMode] = usePersistentState<LeaderboardMode>('leaderboard-mode', 'stage')
  const division = activeDivision()
  const board = useMemo(() => leaderboard(mode), [mode])
  const anyPlayed = board.rows.some((r) => r.played > 0)
  const current = MODES.find((m) => m.id === mode)!

  // Section headings appear whenever the tier changes
  const sections: { tier: string; rows: LeaderRow[] }[] = []
  for (const r of board.rows) {
    const last = sections[sections.length - 1]
    if (last && last.tier === r.tier) last.rows.push(r)
    else sections.push({ tier: r.tier, rows: [r] })
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Leaderboard type">
        {MODES.map((m) => (
          <button
            key={m.id}
            aria-pressed={mode === m.id}
            onClick={() => setMode(m.id)}
            className={`liquid rounded-full border px-4 py-1.5 text-sm transition-colors ${
              mode === m.id ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-stone-300 bg-white hover:border-emerald-700'
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      <div className="glass-surface mb-6 rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-600">
        <p className="font-medium text-stone-800">How this leaderboard works</p>
        <p className="mt-1">{current.blurb}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            <strong>Knockout outcome first.</strong> Champion, runner-up, third and fourth are decided by the final and the
            third-place play-off. A team knocked out earlier takes a place just below the teams that got further, so everyone
            who went out in the same round shares the same block of places.
            {division.koMatches.some((m) => m.round === 'PO') &&
              ' The play-off between the two group third-placed teams decides the next two places after the semi-finalists.'}
            {' '}Teams that missed the final round come after everyone who reached it.
          </li>
          {mode === 'full' ? (
            <>
              <li>
                <strong>Then record, only to split a tied block</strong> (never to overrule a knockout result), in this order:
                <ol className="mt-1 list-[lower-alpha] space-y-0.5 pl-5">
                  {LEADERBOARD_METRICS.map((m) => (
                    <li key={m.key}><span className="font-medium text-stone-800">{m.label}.</span> {m.note}</li>
                  ))}
                </ol>
              </li>
              <li>
                <strong>Totals when everyone played the same number of games, averages otherwise.</strong> If every team in a tied
                block played the same number of games (for example Division One: 5 games for teams out in the groups), totals are
                compared directly. If not (a bye, or groups of different sizes), points, goal difference and goals scored are
                divided by games played. The last column shows which was used.
              </li>
              <li>Teams still level on all three share a place (marked “=”).</li>
            </>
          ) : (
            <li>No tie-break is applied: tied teams are marked “=” and listed alphabetically.</li>
          )}
        </ol>
        <p className="mt-2">
          <strong>Reading the numbers.</strong> Each figure is the total over all games played; a bracketed value is the part of
          it earned in knockout games, for example “14 (3)”. Neither measure accounts for how strong a group was, and a team
          that went out early may simply have met a tough opponent, so treat the order inside a tied block as a convention rather
          than a result.
        </p>
        {board.knockoutKnown ? (
          board.notes.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {board.notes.map((n) => <li key={n}>{n}</li>)}
            </ul>
          )
        ) : (
          <p className="mt-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
            {division.koMatches.length
              ? 'The final-round line-up has not been set, so no team has reached or missed the knockout yet.'
              : 'No final-round bracket has been published.'}{' '}
            Places below are provisional and ordered by group-stage record alone ({LEADERBOARD_METRICS.map((m) => m.label.toLowerCase()).join(', then ')}); averages per game are used where teams have played different numbers of games.
          </p>
        )}
      </div>

      {!board.knockoutKnown && mode === 'stage' ? (
        <div className="glass-surface max-w-2xl rounded-lg border border-stone-200 bg-white p-5 text-sm text-stone-700" role="note">
          <p className="font-semibold text-stone-900">Stage ranking starts with the knockout</p>
          <p className="mt-1">
            Teams can only be placed by the stage they exit once the final-round line-up is set. Switch to “Full ranking” to see a
            provisional table from the group stage.
          </p>
        </div>
      ) : !anyPlayed && !board.knockoutKnown ? (
        <div className="glass-surface max-w-2xl rounded-lg border border-stone-200 bg-white p-5 text-sm text-stone-700" role="note">
          <p className="font-semibold text-stone-900">No games played yet</p>
          <p className="mt-1">Every team is level. The leaderboard fills in as results are recorded.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((s) => (
            <section key={s.tier} aria-label={s.tier}>
              {board.knockoutKnown && <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">{s.tier}</h2>}
              <div className="glass-surface overflow-x-auto rounded-lg border border-stone-200 bg-white">
                <table className="w-full min-w-[680px] text-sm">
                  <thead className="bg-stone-100 text-xs uppercase tracking-wide text-stone-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Rank</th>
                      <th className="px-3 py-2 text-left">Team</th>
                      <th className="px-3 py-2 text-left">Stage</th>
                      <th className="px-3 py-2 text-right" title="Games played (knockout games in brackets)">P</th>
                      <th className="px-3 py-2 text-right" title="Points (knockout points-equivalent in brackets)">Pts</th>
                      <th className="px-3 py-2 text-right" title="Goals scored">GF</th>
                      <th className="px-3 py-2 text-right" title="Goals conceded">GA</th>
                      <th className="px-3 py-2 text-right" title="Goal difference (goals scored minus conceded)">GD</th>
                      {mode === 'full' && <th className="px-3 py-2 text-left" title="How tied teams were compared">Compared</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {s.rows.map((r) => (
                      <tr key={r.team} className="liquid border-t border-stone-100">
                        <td className="whitespace-nowrap px-3 py-2 font-semibold tabular-nums">{r.withdrawn ? '–' : r.rank}</td>
                        <td className="px-3 py-2"><TeamBtn name={r.team} onTeam={onTeam} /></td>
                        <td className="px-3 py-2">
                          <span className="block font-medium text-stone-800">{r.status}</span>
                          <span className="block text-xs text-stone-500">{r.detail}</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums"><Cell t={r.games} ko={r.games.knockout > 0} /></td>
                        <td className="px-3 py-2 text-right tabular-nums"><Cell t={r.pts} ko={r.games.knockout > 0} /></td>
                        <td className="px-3 py-2 text-right tabular-nums"><Cell t={r.gf} ko={r.games.knockout > 0} /></td>
                        <td className="px-3 py-2 text-right tabular-nums"><Cell t={r.ga} ko={r.games.knockout > 0} /></td>
                        <td className="px-3 py-2 text-right tabular-nums"><Cell t={r.gd} sign ko={r.games.knockout > 0} /></td>
                        {mode === 'full' && <td className="px-3 py-2 text-xs text-stone-500">{r.basis === 'totals' ? 'Totals' : r.basis === 'per game' ? 'Per game' : ''}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
      {board.knockoutKnown && (
        <p className="mt-4 text-xs text-stone-500">
          Ranges such as “1–8” show the best and worst place a team can still finish in; they narrow as {ROUND_NAME.F.toLowerCase()}
          {' '}and other knockout games are played.
        </p>
      )}
    </div>
  )
}
