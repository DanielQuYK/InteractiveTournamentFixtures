import { KO_MATCHES, ROUND_NAME, koPlayed } from '../lib/data'

const GROUPS: { label: () => string; rounds: string[] }[] = [
  { label: () => ROUND_NAME.R14, rounds: ['R14'] },
  { label: () => 'Quarter-finals', rounds: ['QF'] },
  { label: () => 'Semi-finals', rounds: ['SF'] },
  { label: () => 'Final and third place', rounds: ['TP', 'F'] },
  { label: () => 'Group third-place play-off', rounds: ['PO'] },
]

/** Knockout games with a result, in total and for each round, like the group-stage count. */
export function KnockoutTracker() {
  const played = KO_MATCHES.filter(koPlayed).length
  const total = KO_MATCHES.length
  const tbc = KO_MATCHES.filter((m) => m.scoreTbc && koPlayed(m)).length
  const rounds = GROUPS.map((g) => {
    const ms = KO_MATCHES.filter((m) => g.rounds.includes(m.round))
    return { label: g.label(), total: ms.length, played: ms.filter(koPlayed).length }
  }).filter((r) => r.total > 0)
  return (
    <div className="glass-surface mb-5 rounded-lg border border-stone-200 bg-white p-4" aria-label="Knockout games played">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-stone-800">Knockout games played</p>
        <p className="text-sm tabular-nums text-stone-700"><strong>{played}</strong> of {total}</p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100"
        role="progressbar"
        aria-label="Knockout games played"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={played}
      >
        <div className="h-full rounded-full bg-emerald-700" style={{ width: `${(played / total) * 100}%` }} />
      </div>
      <ul className="mt-3 flex flex-wrap gap-2 text-xs">
        {rounds.map((r) => (
          <li
            key={r.label}
            className={`rounded-full border px-2.5 py-1 ${
              r.played === r.total ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-stone-300 bg-stone-50 text-stone-700'
            }`}
          >
            {r.label}: <strong className="tabular-nums">{r.played}/{r.total}</strong>
          </li>
        ))}
      </ul>
      {tbc > 0 && (
        <p className="mt-2 text-xs text-stone-500">
          {tbc} of the games counted have a reported result whose scoreline is still to be confirmed.
        </p>
      )}
    </div>
  )
}
