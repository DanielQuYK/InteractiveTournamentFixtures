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
}
const VENUE_SHORT_NAMES: Record<string, string> = {
  HV: 'Happy Valley No. 4',
  AB: 'Aberdeen Sports Ground',
  CB: 'Causeway Bay',
  SKP: 'So Kon Po',
  KT: 'Kai Tak',
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

// group|game|dd-mm|time|home|away|venue|score|remark
const RAW = `
1|1|27-09|9:30 AM|HKUGA|WESLEY|HV|1:0|
1|2|27-09|10:45 AM|LHYMSS|LSTLKK|HV|1:1|
1|3|10-10|2:45 PM|LSTLKK|HKUGA|HV|0:2|
1|4|10-10|4:00 PM|WESLEY|LHYMSS|HV|0:1|
1|5|18-10|9:30 AM|HKUGA|LHYMSS|HV|1:1|A (23/9)
1|6|18-10|10:45 AM|LSTLKK|WESLEY|HV|3:1|A (18/9), A (23/9)
2|1|28-09|4:15 PM|SKHLMC|CCHK|AB|-|C
2|2|29-09|3:00 PM|SPCC|ISFA|CB|1:5|
2|3|11-10|9:30 AM|ISFA|SKHLMC|HV|0:3|DQ* (-3 pts)
2|4|11-10|10:45 AM|CCHK|SPCC|HV|-|C
2|6|14-10|4:15 PM|ISFA|CCHK|SKP|-|C
2|5|20-10|4:15 PM|SKHLMC|SPCC|CB|1:1|
3|1|19-09|1:30 PM|HKTKP|KCC|HV|1:2|
3|2|19-09|2:45 PM|ABLMCC|KC|HV|0:2|W
3|4|29-09|3:00 PM|HKTKP|ABLMCC|HV|1:2|
3|3|29-09|4:15 PM|KCC|CFSS|CB|4:0|
3|5|04-10|9:30 AM|KC|HKTKP|HV|2:0|
3|6|04-10|10:45 AM|CFSS|ABLMCC|HV|3:0|
3|7|13-10|3:00 PM|ABLMCC|KCC|HV|0:4|
3|8|13-10|4:15 PM|KC|CFSS|HV|2:5|
3|9|20-10|3:00 PM|KCC|KC|HV|2:0|
3|10|20-10|4:15 PM|CFSS|HKTKP|HV|7:1|
4|1|19-09|4:00 PM|SPETER|HW|HV|3:3|
4|3|29-09|4:15 PM|HW|MSCHK|HV|0:0|
4|4|30-09|3:00 PM|SPETER|CSS|AB|3:6|
4|5|05-10|4:15 PM|QC|SPETER|AB|8:1|
4|6|06-10|3:00 PM|MSCHK|CSS|HV|0:0|
4|7|13-10|3:00 PM|CSS|HW|CB|0:2|
4|8|13-10|4:15 PM|QC|MSCHK|CB|2:2|
4|2|17-10|4:00 PM|CSS|QC|HV|1:3|
4|9|24-10|1:30 PM|HW|QC|CB|3:0|
4|10|24-10|2:45 PM|MSCHK|SPETER|CB|1:0|
5|1|20-09|10:45 AM|LCD|CANADIAN|HV|0:14|
5|2|22-09|3:00 PM|SKWGSS|CWCC|CB|4:0|
5|3|30-09|4:15 PM|CANADIAN|IKTMC|AB|6:0|
5|4|30-09|3:00 PM|LCD|SKWGSS|SKP|0:2|
5|5|06-10|4:15 PM|CWCC|LCD|HV|1:6|
5|6|07-10|3:00 PM|IKTMC|SKWGSS|AB|1:1|
5|7|14-10|3:00 PM|SKWGSS|CANADIAN|AB|0:4|
5|8|14-10|4:15 PM|CWCC|IKTMC|AB|0:2|
5|9|24-10|4:00 PM|CANADIAN|CWCC|CB|2:0|W
5|10|24-10|1:30 PM|IKTMC|LCD|HV|13:1|
6|1|22-09|3:00 PM|CGHC|BWFL|HV|0:2|W
6|2|22-09|4:15 PM|KWSC|RC|HV|3:2|
6|3|30-09|4:15 PM|BWFL|SJA|SKP|2:3|
6|4|03-10|1:30 PM|CGHC|KWSC|HV|2:4|
6|5|07-10|4:15 PM|RC|CGHC|AB|2:0|
6|6|07-10|3:00 PM|SJA|KWSC|SKP|0:2|W
6|7|14-10|3:00 PM|KWSC|BWFL|SKP|9:0|
6|8|20-10|3:00 PM|RC|SJA|CB|1:2|
6|9|24-10|2:45 PM|BWFL|RC|HV|2:2|
6|10|24-10|4:00 PM|SJA|CGHC|HV|4:0|
7|1|22-09|4:15 PM|HS|SKHTSK|CB|1:1|
7|2|23-09|3:00 PM|ISS|AICH|AB|3:2|
7|3|03-10|2:45 PM|SKHTSK|CCSC|HV|1:0|
7|4|03-10|4:00 PM|HS|ISS|HV|1:3|
7|5|07-10|4:15 PM|AICH|HS|SKP|4:3|
7|6|10-10|1:30 PM|CCSC|ISS|HV|0:10|
7|7|17-10|1:30 PM|ISS|SKHTSK|HV|1:3|
7|8|17-10|2:45 PM|AICH|CCSC|HV|1:4|
7|9|25-10|9:30 AM|SKHTSK|AICH|HV|2:3|
7|10|25-10|10:45 AM|CCSC|HS|HV|2:2|
`
function parseTime(t: string) {
  const [hm, ap] = t.split(' ')
  let [h, m] = hm.split(':').map(Number)
  if (ap === 'PM' && h !== 12) h += 12
  return h * 60 + m
}
export const timeMinutes = parseTime

export const GROUP_MATCHES: GroupMatch[] = RAW.trim()
  .split('\n')
  .map((l) => {
    const [g, game, d, time, home, away, venue, score, remark] = l.split('|')
    const [dd, mm] = d.split('-')
    const [hs, as] = score === '-' ? [null, null] : score.split(':').map(Number)
    return {
      group: +g,
      game: +game,
      date: `2026-${mm}-${dd}`,
      time,
      home,
      away,
      venue,
      hs,
      as,
      remark,
    }
  })

export const WITHDRAWN: Record<string, string> = {
  CCHK: 'Withdrew on 22 September 2026',
}
// Points deducted following disqualification
export const PENALTIES: Record<string, number> = { ISFA: 3 }

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

export function standings(group: number): Standing[] {
  const map = new Map<string, Standing>()
  const get = (t: string) => {
    if (!map.has(t))
      map.set(t, { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, penalty: PENALTIES[t] ?? 0 })
    return map.get(t)!
  }
  for (const m of GROUP_MATCHES.filter((m) => m.group === group)) {
    if (WITHDRAWN[m.home] || WITHDRAWN[m.away]) continue
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
  return rows.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || x.team.localeCompare(y.team))
}

export const GROUPS = [1, 2, 3, 4, 5, 6, 7]

import { KO_RESULTS } from './results'

// ---------------- Knockout ----------------
export type Slot =
  | { kind: 'team'; team: string; seed: string }
  | { kind: 'winner'; of: string }
  | { kind: 'loser'; of: string }

export interface KoMatch {
  id: string
  label: string
  round: 'R14' | 'QF' | 'SF' | 'TP' | 'F'
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

const T = (team: string, seed: string): Slot => ({ kind: 'team', team, seed })
const W = (of: string): Slot => ({ kind: 'winner', of })
const L = (of: string): Slot => ({ kind: 'loser', of })

export const ROUND_NAME: Record<KoMatch['round'], string> = {
  R14: 'Round of 14',
  QF: 'Quarter-final',
  SF: 'Semi-final',
  TP: 'Third-place play-off',
  F: 'Final',
}

export const KO_MATCHES: KoMatch[] = [
  { id: 'R1', label: 'Round of 14 – Match 1', round: 'R14', date: '2026-11-03', time: '3:00 PM', venue: 'CB', home: T('IKTMC', '2nd, Group 5'), away: T('QC', '2nd, Group 4') },
  { id: 'R2', label: 'Round of 14 – Match 2', round: 'R14', date: '2026-11-03', time: '4:15 PM', venue: 'CB', home: T('KCC', '1st, Group 3'), away: T('LHYMSS', '2nd, Group 1') },
  { id: 'R3', label: 'Round of 14 – Match 3', round: 'R14', date: '2026-11-03', time: '3:00 PM', venue: 'HV', home: T('SJA', '2nd, Group 6'), away: T('ISS', '1st, Group 7') },
  { id: 'R4', label: 'Round of 14 – Match 4', round: 'R14', date: '2026-11-03', time: '4:15 PM', venue: 'HV', home: T('KWSC', '1st, Group 6'), away: T('CFSS', '2nd, Group 3') },
  { id: 'R5', label: 'Round of 14 – Match 5', round: 'R14', date: '2026-11-04', time: '3:00 PM', venue: 'AB', home: T('HW', '1st, Group 4'), away: T('SKHTSK', '2nd, Group 7') },
  { id: 'R6', label: 'Round of 14 – Match 6', round: 'R14', date: '2026-11-04', time: '4:15 PM', venue: 'AB', home: T('HKUGA', '1st, Group 1'), away: T('SPCC', '2nd, Group 2') },
  { id: 'Q1', label: 'Quarter-final 1', round: 'QF', date: '2026-11-07', time: '1:30 PM', venue: 'HV', home: T('SKHLMC', '1st, Group 2 – bye'), away: W('R1') },
  { id: 'Q2', label: 'Quarter-final 2', round: 'QF', date: '2026-11-07', time: '2:45 PM', venue: 'HV', home: W('R2'), away: W('R3') },
  { id: 'Q3', label: 'Quarter-final 3', round: 'QF', date: '2026-11-08', time: '9:30 AM', venue: 'HV', home: W('R4'), away: W('R5') },
  { id: 'Q4', label: 'Quarter-final 4', round: 'QF', date: '2026-11-08', time: '10:45 AM', venue: 'HV', home: W('R6'), away: T('CANADIAN', '1st, Group 5 – bye') },
  { id: 'S1', label: 'Semi-final 1', round: 'SF', date: '2026-11-18', time: '3:00 PM', venue: 'AB', home: W('Q1'), away: W('Q2') },
  { id: 'S2', label: 'Semi-final 2', round: 'SF', date: '2026-11-18', time: '3:00 PM', venue: 'SKP', home: W('Q3'), away: W('Q4') },
  { id: 'TP', label: 'Third-place play-off', round: 'TP', date: '2026-12-02', time: '3:00 PM', venue: 'AB', home: L('S1'), away: L('S2') },
  { id: 'F', label: 'Final', round: 'F', date: '2026-12-07', time: '2:15 PM', venue: 'KT', home: W('S1'), away: W('S2') },
]

// Apply recorded results (see results.ts)
for (const m of KO_MATCHES) {
  const r = KO_RESULTS[m.id]
  if (r) {
    m.score = r.score
    m.pens = r.pens
    m.winnerTeam = r.winner
    m.scoreTbc = r.scoreTbc
  }
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
  const src = koById(s.of)
  return s.kind === 'winner' ? koWinner(src) : koLoser(src)
}
export function slotText(s: Slot): string {
  const t = slotTeam(s)
  if (t) return t
  if (s.kind === 'team') return s.team
  const src = koById(s.of)
  const verb = s.kind === 'winner' ? 'Winner' : 'Loser'
  return `${verb} of ${src.round === 'R14' ? 'R14-' + s.of.slice(1) : s.of}`
}

export function fmtDate(iso: string, long = false) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', long
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    : { weekday: 'short', day: 'numeric', month: 'short' })
}

export const ALL_KO_TEAMS = new Set(
  KO_MATCHES.flatMap((m) => [m.home, m.away]).filter((s) => s.kind === 'team').map((s) => (s as { team: string }).team),
)
