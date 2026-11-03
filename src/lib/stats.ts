import { GROUP_MATCHES, KO_MATCHES, slotTeam, standings } from './data'

export interface TeamRec { team: string; gp: number; w: number; d: number; l: number; gf: number; ga: number; pts: number; cs: number }

export function groupInfo(team: string) {
  const group = GROUP_MATCHES.find((m) => m.home === team || m.away === team)?.group
  if (!group) return { group: 99, position: 99 }
  const position = standings(group).findIndex((row) => row.team === team) + 1
  return { group, position: position || 99 }
}

export function groupSeed(team: string) {
  const { group, position } = groupInfo(team)
  if (group === 99) return ''
  return `G${group}#${position === 99 ? '–' : position}`
}

export function teamRecords(): TeamRec[] {
  const map = new Map<string, TeamRec>()
  const get = (t: string) => {
    if (!map.has(t)) map.set(t, { team: t, gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, cs: 0 })
    return map.get(t)!
  }
  const add = (t: string, f: number, c: number) => {
    const r = get(t)
    r.gp++; r.gf += f; r.ga += c
    if (f > c) { r.w++; r.pts += 3 } else if (f === c) { r.d++; r.pts++ } else r.l++
    if (c === 0) r.cs++
  }
  for (const m of GROUP_MATCHES) {
    if (m.hs === null || m.as === null) continue
    add(m.home, m.hs, m.as)
    add(m.away, m.as, m.hs)
  }
  for (const m of KO_MATCHES) {
    const h = slotTeam(m.home), a = slotTeam(m.away)
    if (!m.score || !h || !a) continue
    add(h, m.score[0], m.score[1])
    add(a, m.score[1], m.score[0])
  }
  return [...map.values()]
}

export interface Metric { key: string; title: string; desc: string; value: (r: TeamRec) => number; fmt: (v: number) => string; higherIsBetter: boolean }
export const pct = (v: number) => `${(v * 100).toFixed(0)}%`
export const dec = (v: number) => v.toFixed(2)
export const METRICS: Metric[] = [
  { key: 'win', title: 'Win rate', desc: 'Share of games won', value: (r) => r.w / r.gp, fmt: pct, higherIsBetter: true },
  { key: 'unbeaten', title: 'Unbeaten rate', desc: 'Share of games won or drawn (not lost)', value: (r) => (r.w + r.d) / r.gp, fmt: pct, higherIsBetter: true },
  { key: 'ppg', title: 'Points earned per game', desc: '3 for a win, 1 for a draw, before any disciplinary deduction', value: (r) => r.pts / r.gp, fmt: dec, higherIsBetter: true },
  { key: 'gf', title: 'Goals scored per game', desc: 'Average goals scored', value: (r) => r.gf / r.gp, fmt: dec, higherIsBetter: true },
  { key: 'ga', title: 'Goals conceded per game', desc: 'Average goals conceded (lower is better)', value: (r) => r.ga / r.gp, fmt: dec, higherIsBetter: false },
  { key: 'gd', title: 'Goal difference per game', desc: 'Average goals scored minus goals conceded', value: (r) => (r.gf - r.ga) / r.gp, fmt: (v) => (v > 0 ? '+' : '') + dec(v), higherIsBetter: true },
  { key: 'cs', title: 'Clean-sheet rate', desc: 'Share of games without conceding', value: (r) => r.cs / r.gp, fmt: pct, higherIsBetter: true },
]

