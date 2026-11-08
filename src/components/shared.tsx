import { koById, slotTeam, slotText, type GroupMatch, type Slot } from '../lib/data'

export type Tab = 'group' | 'knockout' | 'leaderboard' | 'stats' | 'simulation'
export type Detail = { kind: 'ko'; id: string } | { kind: 'group'; m: GroupMatch }

/* ---------- shared ---------- */

export function TeamBtn({ name, onTeam, className = '' }: { name: string; onTeam: (t: string) => void; className?: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onTeam(name) }}
      className={`text-left font-semibold underline-offset-4 decoration-emerald-600/40 hover:text-emerald-700 hover:underline focus-visible:outline-2 focus-visible:outline-emerald-600 ${className}`}
    >
      {name}
    </button>
  )
}

export function remarkText(r: string) {
  if (!r) return ''
  return r
    .replace(/DQ\*\s*\(-3 pts\)/, 'Disqualified (3-point deduction)')
    .replace(/^W$/, 'Walk-over')
    .replace(/^C$/, 'Cancelled')
    .replace(/A \(([^)]+)\)/g, 'Amended ($1)')
}


export function describeSource(s: Slot): string {
  const t = slotTeam(s)
  if (t) return t
  if (s.kind === 'team') return s.team
  if (s.kind === 'pending') return s.seed
  const src = koById(s.of)
  const a = slotTeam(src.home) ?? slotText(src.home)
  const b = slotTeam(src.away) ?? slotText(src.away)
  const verb = s.kind === 'winner' ? 'Winner' : 'Loser'
  return `${verb} of ${src.label} (${a} v ${b})`
}


export function EmptyComparison({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center text-sm text-stone-500">
      {text}
    </div>
  )
}


/** Shown only when data checks find a problem, so inconsistencies are never silent. */
export function DataNotice({ issues, title }: { issues: string[]; title: string }) {
  if (!issues.length) return null
  return (
    <div role="alert" className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">{title}: {issues.length} {issues.length === 1 ? 'issue' : 'issues'} found</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-5">
        {issues.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </div>
  )
}
