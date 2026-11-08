import { DIVISIONS, divisionById } from './divisions'
import type { DivisionConfig, KoRound, KoSlotSpec } from './divisions/types'
import { liveArray, liveRecord, liveSet } from './live'

/**
 * Joins the last three words with non-breaking spaces so a name such as
 * "Aberdeen Sports Ground" or "... No. 4" can never leave a lone word on its own line.
 */
export const noOrphan = (text: string) => {
  const words = text.split(' ')
  if (words.length < 3) return words.join('\u00A0')
  return [...words.slice(0, -3), words.slice(-3).join('\u00A0')].join(' ')
}

const VENUE_NAMES: Record<string, string> = {
  HV: 'Happy Valley Recreation Ground No. 4',
  AB: 'Aberdeen Sports Ground (Artificial Turf)',
  CB: 'Causeway Bay Sports Ground',
  SKP: 'So Kon Po Recreation Ground',
  KT: 'Kai Tak Youth Sports Ground',
  KBP: 'Kowloon Bay Park 11-a-side',
  SKM: 'Shek Kip Mei Park Stage III',
  PK1: 'Po Kong Village Road Park No. 1',
  THT: 'Tai Hang Tung Recreation Playground No. 2',
  LF: 'Lok Fu Recreation Ground',
  KTP: 'Kowloon Tsai Park No. 3',
  BS: 'Boundary Street Recreation Ground',
}
const VENUE_SHORT_NAMES: Record<string, string> = {
  HV: 'Happy Valley No. 4',
  AB: 'Aberdeen Sports Ground',
  CB: 'Causeway Bay',
  SKP: 'So Kon Po',
  KT: 'Kai Tak',
  KBP: 'Kowloon Bay Park',
  SKM: 'Shek Kip Mei',
  PK1: 'Po Kong No. 1',
  THT: 'Tai Hang Tung No. 2',
  LF: 'Lok Fu',
  KTP: 'Kowloon Tsai No. 3',
  BS: 'Boundary Street',
}

export const VENUES: Record<string, string> = Object.fromEntries(
  Object.entries(VENUE_NAMES).map(([k, v]) => [k, noOrphan(v)]),
)
export const VENUE_SHORT: Record<string, string> = Object.fromEntries(
  Object.entries(VENUE_SHORT_NAMES).map(([k, v]) => [k, noOrphan(v)]),
)

export const REMARKS: Record<string, string> = {
  A: 'Amended',
  C: 'Cancelled',
  P: 'Postponed',
  R: 'Replay',
  W: 'Walk-over',
  DW: 'Double walk-over',
  DQ: 'Disqualified',
}

export interface GroupMatch {
  group: number
  game: number
  date: string // ISO
  time: string
  home: string
  away: string
  venue: string
  hs: number | null
  as: number | null
  remark: string
}

function parseTime(t: string) {
  const [hm, ap] = t.split(' ')
  let [h, m] = hm.split(':').map(Number)
  if (ap === 'PM' && h !== 12) h += 12
  return h * 60 + m
}
export const timeMinutes = parseTime

// ---------------- Slots and fixtures ----------------
export type Slot =
  | { kind: 'team'; team: string; seed: string }
  | { kind: 'winner'; of: string }
  | { kind: 'loser'; of: string }
  /** A seed (for example "1st in a group") whose team has not been decided yet. */
  | { kind: 'pending'; seed: string }

export type KoRoundCode = KoRound

export interface KoMatch {
  id: string
  label: string
  round: KoRoundCode
  date: string
  time: string
  venue: string
  home: Slot
  away: Slot
  /** Enter once played: [home, away] and optional penalty shoot-out [home, away] */
  score?: [number, number]
  pens?: [number, number]
  /** Winner confirmed before the scoreline is (e.g. decided on penalties, scoreline to be confirmed). */
  winnerTeam?: string
  scoreTbc?: boolean
}

export interface Standing {
  team: string
  p: number
  w: number
  d: number
  l: number
  gf: number
  ga: number
  gd: number
  pts: number
  penalty: number
}

// ---------------- Divisions ----------------
interface Runtime {
  config: DivisionConfig
  groupMatches: GroupMatch[]
  groups: number[]
  koMatches: KoMatch[]
  koTeams: Set<string>
  roundNames: Record<KoRoundCode, string>
}

function toSlot(spec: KoSlotSpec): Slot {
  if (spec.t === 'team') return { kind: 'team', team: spec.team, seed: spec.seed }
  if (spec.t === 'w') return { kind: 'winner', of: spec.of }
  if (spec.t === 'l') return { kind: 'loser', of: spec.of }
  return { kind: 'pending', seed: spec.seed }
}

function build(config: DivisionConfig): Runtime {
  const groupMatches: GroupMatch[] = config.groupsRaw
    .trim()
    .split('\n')
    .map((l) => {
      const [g, game, d, time, home, away, venue, score, remark] = l.split('|')
      const [dd, mm] = d.split('-')
      const parts = score && score.includes(':') ? score.split(':').map(Number) : [null, null]
      return {
        group: +g,
        game: +game,
        date: `2026-${mm}-${dd}`,
        time,
        home,
        away,
        venue,
        hs: parts[0] as number | null,
        as: parts[1] as number | null,
        remark: remark ?? '',
      }
    })
  const koMatches: KoMatch[] = config.koMatches.map((spec) => ({
    id: spec.id,
    label: spec.label,
    round: spec.round,
    date: spec.date,
    time: spec.time,
    venue: spec.venue,
    home: toSlot(spec.home),
    away: toSlot(spec.away),
  }))
  // Apply recorded results (see results.ts)
  for (const m of koMatches) {
    const r = config.results[m.id]
    if (r) {
      m.score = r.score
      m.pens = r.pens
      m.winnerTeam = r.winner
      m.scoreTbc = r.scoreTbc
    }
  }
  const koTeams = new Set(
    koMatches
      .flatMap((m) => [m.home, m.away])
      .filter((s): s is Extract<Slot, { kind: 'team' }> => s.kind === 'team')
      .map((s) => s.team),
  )
  return {
    config,
    groupMatches,
    groups: [...new Set(groupMatches.map((m) => m.group))].sort((a, b) => a - b),
    koMatches,
    koTeams,
    roundNames: {
      R14: config.firstRoundName,
      QF: 'Quarter-final',
      SF: 'Semi-final',
      TP: 'Third-place play-off',
      F: 'Final',
      PO: 'Group third-place play-off',
    },
  }
}

const runtimes = new Map<string, Runtime>()
let activeId = 'd3h'

function runtime(): Runtime {
  let r = runtimes.get(activeId)
  if (!r) {
    const config = divisionById(activeId) ?? DIVISIONS[0]
    r = build(config)
    runtimes.set(config.id, r)
  }
  return r
}

/** Selects the division all data helpers and views read from. Call before rendering that division. */
export function setActiveDivision(id: string) {
  if (!divisionById(id)) throw new Error(`Unknown division "${id}"`)
  activeId = id
}
export const activeDivisionId = () => activeId

/** Memoises a derived value separately for each division. */
export function perDivision<T>(build: () => T): () => T {
  const cache = new Map<string, T>()
  return () => {
    if (!cache.has(activeId)) cache.set(activeId, build())
    return cache.get(activeId)!
  }
}
export const activeDivision = () => runtime().config

/** Data for the active division. These behave like ordinary arrays, records and sets. */
export const GROUP_MATCHES: GroupMatch[] = liveArray(() => runtime().groupMatches)
export const GROUPS: number[] = liveArray(() => runtime().groups)
export const KO_MATCHES: KoMatch[] = liveArray(() => runtime().koMatches)
export const ALL_KO_TEAMS: Set<string> = liveSet(() => runtime().koTeams)
export const WITHDRAWN: Record<string, string> = liveRecord(() => runtime().config.withdrawn)
// Points deducted following disqualification
export const PENALTIES: Record<string, number> = liveRecord(() => runtime().config.penalties)
export const ROUND_NAME: Record<KoRoundCode, string> = liveRecord(() => runtime().roundNames) as Record<KoRoundCode, string>

/**
 * Standings for one group. Teams level on points are separated by their results against each other
 * (points, goal difference, goals scored), then by overall goal difference, goals scored and name.
 */
export function standings(group: number): Standing[] {
  const map = new Map<string, Standing>()
  const get = (t: string) => {
    if (!map.has(t))
      map.set(t, { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, penalty: PENALTIES[t] ?? 0 })
    return map.get(t)!
  }
  const played = GROUP_MATCHES.filter((m) => m.group === group && !WITHDRAWN[m.home] && !WITHDRAWN[m.away])
  for (const m of played) {
    const h = get(m.home)
    const a = get(m.away)
    if (m.hs === null || m.as === null) continue
    h.p++; a.p++
    h.gf += m.hs; h.ga += m.as; a.gf += m.as; a.ga += m.hs
    if (m.hs > m.as) { h.w++; a.l++; h.pts += 3 }
    else if (m.hs < m.as) { a.w++; h.l++; a.pts += 3 }
    else { h.d++; a.d++; h.pts++; a.pts++ }
  }
  const rows = [...map.values()]
  rows.forEach((r) => { r.gd = r.gf - r.ga; r.pts -= r.penalty })

  // Head-to-head mini-table among the teams tied on points
  const mini = (tied: Set<string>) => {
    const table = new Map<string, { pts: number; gd: number; gf: number }>([...tied].map((t) => [t, { pts: 0, gd: 0, gf: 0 }]))
    for (const m of played) {
      if (!tied.has(m.home) || !tied.has(m.away) || m.hs === null || m.as === null) continue
      const h = table.get(m.home)!, a = table.get(m.away)!
      h.gf += m.hs; a.gf += m.as; h.gd += m.hs - m.as; a.gd += m.as - m.hs
      if (m.hs > m.as) h.pts += 3
      else if (m.hs < m.as) a.pts += 3
      else { h.pts++; a.pts++ }
    }
    return table
  }
  const byPoints = new Map<number, Standing[]>()
  rows.forEach((r) => byPoints.set(r.pts, [...(byPoints.get(r.pts) ?? []), r]))
  const ordered: Standing[] = []
  for (const pts of [...byPoints.keys()].sort((a, b) => b - a)) {
    const tied = byPoints.get(pts)!
    const table = tied.length > 1 ? mini(new Set(tied.map((t) => t.team))) : null
    tied.sort((x, y) => {
      if (table) {
        const a = table.get(x.team)!, b = table.get(y.team)!
        if (b.pts !== a.pts) return b.pts - a.pts
        if (b.gd !== a.gd) return b.gd - a.gd
        if (b.gf !== a.gf) return b.gf - a.gf
      }
      return y.gd - x.gd || y.gf - x.gf || x.team.localeCompare(y.team)
    })
    ordered.push(...tied)
  }
  return ordered
}

/** True when every fixture in the group that can still be played has a result (cancelled and withdrawn games excluded). */
export function groupComplete(group: number): boolean {
  return GROUP_MATCHES.filter((m) => m.group === group && !WITHDRAWN[m.home] && !WITHDRAWN[m.away] && m.remark !== 'C').every(
    (m) => m.hs !== null,
  )
}

export const koById = (id: string) => KO_MATCHES.find((m) => m.id === id)!

export function koWinner(m: KoMatch): string | null {
  const hn = slotTeam(m.home), an = slotTeam(m.away)
  if (!hn || !an) return null
  if (m.winnerTeam) return m.winnerTeam === hn || m.winnerTeam === an ? m.winnerTeam : null
  if (!m.score) return null
  const [h, a] = m.score
  if (h !== a) return h > a ? hn : an
  if (m.pens) return m.pens[0] > m.pens[1] ? hn : an
  return null
}
/** True once a winner is known, even if the scoreline is still to be confirmed. */
export const koPlayed = (m: KoMatch) => koWinner(m) !== null

export function koLoser(m: KoMatch): string | null {
  const w = koWinner(m)
  if (!w) return null
  return w === slotTeam(m.home) ? slotTeam(m.away) : slotTeam(m.home)
}
/** Resolved team name for a slot, or null if not yet determined. */
export function slotTeam(s: Slot): string | null {
  if (s.kind === 'team') return s.team
  if (s.kind === 'pending') return null
  const src = koById(s.of)
  return s.kind === 'winner' ? koWinner(src) : koLoser(src)
}

/** Short name of a match for use in labels, e.g. "R14-3", "Q1" or "S2". */
export function matchShort(m: KoMatch): string {
  if (m.round === 'R14') {
    const n = /(\d+)/.exec(ROUND_NAME.R14)?.[1]
    return n ? `R${n}-${m.id.slice(1)}` : m.label
  }
  return m.id
}

export function slotText(s: Slot): string {
  const t = slotTeam(s)
  if (t) return t
  if (s.kind === 'team') return s.team
  if (s.kind === 'pending') return s.seed.replace(' – bye', '')
  const src = koById(s.of)
  const verb = s.kind === 'winner' ? 'Winner' : 'Loser'
  return `${verb} of ${matchShort(src)}`
}

export function fmtDate(iso: string, long = false) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', long
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    : { weekday: 'short', day: 'numeric', month: 'short' })
}
