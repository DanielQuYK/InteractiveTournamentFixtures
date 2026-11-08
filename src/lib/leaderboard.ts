import {
  ALL_KO_TEAMS, GROUPS, GROUP_MATCHES, KO_MATCHES, ROUND_NAME, WITHDRAWN, activeDivision, groupComplete, koPlayed, koWinner, slotTeam,
  standings, type KoMatch,
} from './data'

/*
 * Leaderboards for the active competition.
 *
 * Every team gets the best and worst place it can still finish in. Once a team is out, that range is
 * fixed by how far it got (for example, every quarter-final loser shares places 5-8). Teams still in
 * the competition keep a range until they are knocked out or the final is played.
 *
 * "stage": teams that went out at the same stage are tied, and are not separated.
 * "full":  teams that went out at the same stage are separated by their group-stage record, because
 *          knockout results can't tell them apart. See LEADERBOARD_METRICS for the order used.
 */

export type LeaderboardMode = 'stage' | 'full'

export const LEADERBOARD_METRICS = [
  { key: 'pos', label: 'Group finish (only when teams played different numbers of games)', note: 'How far up its own group a team finished: its place divided by the number of teams in the group (2nd of 5 = 0.4, 2nd of 3 = 0.67, last = 1.0), lower is better. This stops a team that merely finished last in a small group looking better than a mid-table team from a larger one.' },
  {
    key: 'pts',
    label: 'Points',
    note: 'Group-stage points (after any disciplinary deduction) plus knockout points-equivalent: 3 for a win in normal time, 1 for a draw (a shoot-out only decides who goes through), 0 for a loss. The knockout part is not an official award; it only lets teams that played extra games be compared.',
  },
  { key: 'gd', label: 'Goal difference', note: 'Goals scored minus goals conceded, group and knockout games together (shoot-out kicks are not goals).' },
  { key: 'gf', label: 'Goals scored', note: 'Goals scored in group and knockout games together.' },
] as const

/** Games, points and goals split into the group stage and the knockout. */
export interface Tally { total: number; knockout: number }

export interface LeaderRow {
  team: string
  group: number
  groupPos: number
  groupSize: number
  /** Group games played. */
  played: number
  /** Group and knockout games together, and the knockout share of each measure. */
  games: Tally
  pts: Tally
  gf: Tally
  ga: Tally
  gd: Tally
  /** Averages over all games, used only when the teams being compared played different numbers of games. */
  ppg: number | null
  gdpg: number | null
  gfpg: number | null
  /** How a tied block of teams was ordered: on totals (same games played) or per game. Empty if not compared. */
  basis: '' | 'totals' | 'per game'
  /** Best and worst place still possible. Equal for a team whose place is settled (ties aside). */
  best: number
  worst: number
  /** True once the team cannot move any further (finished, knocked out or missed the final round). */
  settled: boolean
  status: string
  detail: string
  withdrawn: boolean
  /** Printed rank, e.g. "5=" for a tie, "1–8" while open, "" when unranked. */
  rank: string
  /** Section the row belongs to, for headings. */
  tier: string
}

export interface Leaderboard {
  rows: LeaderRow[]
  /** Whether the knockout bracket decides places yet (line-up confirmed). */
  knockoutKnown: boolean
  /** Plain-language account of how the places were worked out, for display. */
  notes: string[]
}

const ordinal = (n: number) => {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}

interface Path {
  settled: boolean
  best: number
  worst: number
  status: string
  detail: string
  tier: string
}

/** Where a team in the title bracket stands, from its knockout results. */
function titlePath(team: string, ctx: { teams: number; participants: (m: KoMatch['round']) => number; firstRound: KoMatch['round'] }): Path {
  const title = KO_MATCHES.filter((m) => m.round !== 'PO')
  const involved = title.filter((m) => slotTeam(m.home) === team || slotTeam(m.away) === team)
  const last = involved[involved.length - 1]
  const open = (round: KoMatch['round'], detail: string): Path => {
    const status = round === 'F' ? 'In the final' : round === 'TP' ? 'Third-place play-off' : `Still in: ${ROUND_NAME[round]}`
    if (round === 'F') return { settled: false, best: 1, worst: 2, status, detail, tier: 'Still in the competition' }
    if (round === 'TP') return { settled: false, best: 3, worst: 4, status, detail, tier: 'Still in the competition' }
    return { settled: false, best: 1, worst: ctx.participants(round), status, detail, tier: 'Still in the competition' }
  }
  if (!last) return open(ctx.firstRound, 'Awaiting the draw')
  if (!koPlayed(last)) return open(last.round, `${ROUND_NAME[last.round]} not yet played`)
  const won = koWinner(last) === team
  if (last.round === 'F') {
    return won
      ? { settled: true, best: 1, worst: 1, status: 'Champion', detail: 'Won the final', tier: 'Final positions' }
      : { settled: true, best: 2, worst: 2, status: 'Runner-up', detail: 'Lost the final', tier: 'Final positions' }
  }
  if (last.round === 'TP') {
    return won
      ? { settled: true, best: 3, worst: 3, status: 'Third place', detail: 'Won the third-place play-off', tier: 'Final positions' }
      : { settled: true, best: 4, worst: 4, status: 'Fourth place', detail: 'Lost the third-place play-off', tier: 'Final positions' }
  }
  if (last.round === 'SF') {
    return won ? open('F', 'Won the semi-final; final to come') : open('TP', 'Lost the semi-final; third-place play-off to come')
  }
  if (won) {
    const next = title.find((m) => [m.home, m.away].some((s) => s.kind === 'winner' && s.of === last.id))
    return open(next?.round ?? 'F', `Won the ${ROUND_NAME[last.round].toLowerCase()}`)
  }
  // Knocked out: places run from just below the teams that reached the next round to the size of this round
  const order: KoMatch['round'][] = ['R14', 'QF', 'SF']
  const nextRound = order[order.indexOf(last.round) + 1]
  const ahead = nextRound ? ctx.participants(nextRound) : 2
  return {
    settled: true,
    best: ahead + 1,
    worst: ctx.participants(last.round),
    status: `Out: ${ROUND_NAME[last.round]}`,
    detail: `Lost the ${ROUND_NAME[last.round].toLowerCase()}`,
    tier: `Out in the ${ROUND_NAME[last.round].toLowerCase()}`,
  }
}

export function leaderboard(mode: LeaderboardMode): Leaderboard {
  const division = activeDivision()
  const teams = [...new Set(GROUP_MATCHES.flatMap((m) => [m.home, m.away]))]
  const knockoutKnown = division.lineupConfirmed && KO_MATCHES.length > 0
  const title = KO_MATCHES.filter((m) => m.round !== 'PO')
  const po = KO_MATCHES.find((m) => m.round === 'PO')
  const titleTeams = new Set(knockoutKnown ? [...ALL_KO_TEAMS].filter((t) => title.some((m) => slotTeam(m.home) === t || slotTeam(m.away) === t)) : [])
  const ranked = teams.filter((t) => !WITHDRAWN[t])
  const firstRound = title[0]?.round ?? 'F'
  const count = (r: string) => title.filter((m) => m.round === r).length
  const participants = (round: KoMatch['round']) => (round === firstRound ? titleTeams.size : 2 * count(round))
  const ctx = { teams: titleTeams.size, participants, firstRound }

  // Group-stage record for each team
  type Rec = Pick<LeaderRow, 'group' | 'groupPos' | 'groupSize' | 'played' | 'games' | 'pts' | 'gf' | 'ga' | 'gd' | 'ppg' | 'gdpg' | 'gfpg' | 'basis'>
  const rec = new Map<string, Rec>()
  const ko = new Map<string, { n: number; pts: number; gf: number; ga: number }>()
  for (const m of KO_MATCHES) {
    const h = slotTeam(m.home), a = slotTeam(m.away)
    if (!m.score || !h || !a) continue
    const add = (t: string, f: number, c: number) => {
      const e = ko.get(t) ?? { n: 0, pts: 0, gf: 0, ga: 0 }
      e.n++; e.gf += f; e.ga += c; e.pts += f > c ? 3 : f === c ? 1 : 0
      ko.set(t, e)
    }
    add(h, m.score[0], m.score[1])
    add(a, m.score[1], m.score[0])
  }
  for (const g of GROUPS) {
    const table = standings(g)
    table.forEach((r, i) => {
      const k = ko.get(r.team) ?? { n: 0, pts: 0, gf: 0, ga: 0 }
      const games = r.p + k.n
      const pts = r.pts + k.pts, gf = r.gf + k.gf, ga = r.ga + k.ga
      rec.set(r.team, {
        group: g, groupPos: i + 1, groupSize: table.length, played: r.p,
        games: { total: games, knockout: k.n },
        pts: { total: pts, knockout: k.pts },
        gf: { total: gf, knockout: k.gf },
        ga: { total: ga, knockout: k.ga },
        gd: { total: gf - ga, knockout: k.gf - k.ga },
        ppg: games ? pts / games : null, gdpg: games ? (gf - ga) / games : null, gfpg: games ? gf / games : null,
        basis: '',
      })
    })
  }
  const poTeams = po ? [slotTeam(po.home), slotTeam(po.away)] : []
  const base = titleTeams.size + 1
  const rest = base + (po ? 2 : 0)

  const rows: LeaderRow[] = teams.map((team) => {
    const none = { total: 0, knockout: 0 }
    const r: Rec = rec.get(team) ?? {
      group: 0, groupPos: 0, groupSize: 0, played: 0, games: none, pts: none, gf: none, ga: none, gd: none,
      ppg: null, gdpg: null, gfpg: null, basis: '',
    }
    const withdrawn = Boolean(WITHDRAWN[team])
    let path: Path
    if (withdrawn) {
      path = { settled: true, best: 0, worst: 0, status: 'Withdrew', detail: WITHDRAWN[team], tier: 'Withdrawn (not ranked)' }
    } else if (!knockoutKnown) {
      path = {
        settled: false, best: 1, worst: ranked.length, status: 'Group stage',
        detail: groupComplete(r.group) ? 'Group complete; awaiting the knockout draw' : 'Group stage in progress', tier: 'Group stage',
      }
    } else if (titleTeams.has(team)) {
      path = titlePath(team, ctx)
    } else {
      const where = `${ordinal(r.groupPos)} of ${r.groupSize} in Group ${r.group}`
      if (po && poTeams.includes(team)) {
        const decided = koPlayed(po)
        const won = koWinner(po) === team
        path = decided
          ? { settled: true, best: won ? base : base + 1, worst: won ? base : base + 1, status: won ? 'Group third-place play-off: won' : 'Group third-place play-off: lost', detail: where, tier: 'Group third-place play-off' }
          : { settled: false, best: base, worst: base + 1, status: 'Group third-place play-off', detail: `${where}; play-off to come`, tier: 'Group third-place play-off' }
      } else {
        path = { settled: true, best: rest, worst: ranked.length, status: 'Out: group stage', detail: where, tier: 'Out in the group stage' }
      }
    }
    return { team, ...r, ...path, withdrawn, rank: '' }
  })

  // Order: smallest worst case, then best case. In the full ranking, teams level on both are separated
  // by record: on totals when they all played the same number of games, otherwise per game.
  const live = rows.filter((r) => !r.withdrawn)
  const metric = (n: number | null) => (n === null ? -Infinity : n)
  const share = (r: LeaderRow) => (r.groupSize ? r.groupPos / r.groupSize : 1)
  const compare = (basis: 'totals' | 'per game') => (a: LeaderRow, b: LeaderRow) => {
    const pick = (r: LeaderRow): [number | null, number | null, number | null] =>
      basis === 'totals' ? [r.pts.total, r.gd.total, r.gf.total] : [r.ppg, r.gdpg, r.gfpg]
    const x = pick(a), y = pick(b)
    // Different numbers of games means different group sizes: first compare how far up its own group each team finished
    if (basis === 'per game') {
      const d = share(a) - share(b)
      if (d) return d
    }
    for (let k = 0; k < 3; k++) {
      const d = metric(y[k]) - metric(x[k])
      if (d) return d
    }
    return 0
  }
  const sameRecord = (basis: 'totals' | 'per game') => (a: LeaderRow, b: LeaderRow) =>
    compare(basis)(a, b) === 0 || (a.games.total === 0 && b.games.total === 0)
  live.sort((a, b) => a.worst - b.worst || a.best - b.best || a.team.localeCompare(b.team))
  const blocks: LeaderRow[][] = []
  for (const r of live) {
    const last = blocks[blocks.length - 1]
    if (last && last[0].best === r.best && last[0].worst === r.worst) last.push(r)
    else blocks.push([r])
  }
  // Without a knockout there is a single block: everyone, compared on the group stage alone
  const comparable = knockoutKnown ? blocks : [live]
  const basisOf = (block: LeaderRow[]) => (new Set(block.map((r) => r.games.total)).size === 1 ? 'totals' : 'per game')
  if (mode === 'full' || !knockoutKnown) {
    for (const block of comparable) {
      if (block.length < 2) continue
      const basis = basisOf(block)
      block.sort((a, b) => compare(basis)(a, b) || a.team.localeCompare(b.team))
      for (const r of block) r.basis = basis
    }
  }

  // Printed ranks
  const rankBlock = (block: LeaderRow[], base: number, ordered: boolean) => {
    const same = block[0]?.basis ? sameRecord(block[0].basis as 'totals' | 'per game') : () => false
    let place = base
    block.forEach((r, k) => {
      if (ordered && k > 0 && !same(block[k - 1], r)) place = base + k
      const shared = ordered ? block.filter((o) => same(o, r)).length > 1 : block.length > 1
      r.rank = r.games.total === 0 && !knockoutKnown ? '–' : shared ? `${place}=` : String(place)
    })
  }
  if (!knockoutKnown) {
    rankBlock(live, 1, true)
  } else {
    for (const block of blocks) {
      if (!block[0].settled) for (const r of block) r.rank = r.best === r.worst ? String(r.best) : `${r.best}–${r.worst}`
      else rankBlock(block, block[0].best, mode === 'full')
    }
  }
  const out = [...(knockoutKnown ? blocks.flat() : live), ...rows.filter((r) => r.withdrawn)]

  const notes: string[] = []
  if (knockoutKnown) {
    const tiers = new Map<string, number>()
    for (const r of live) if (r.settled && r.best !== r.worst) tiers.set(`${r.best}–${r.worst}|${r.tier}`, (tiers.get(`${r.best}–${r.worst}|${r.tier}`) ?? 0) + 1)
    for (const [key, n] of tiers) {
      const [range, tier] = key.split('|')
      notes.push(`${n} teams share places ${range} (${tier.toLowerCase()}).`)
    }
  }
  if (mode === 'full') {
    for (const block of comparable) {
      if (block.length < 2 || !block[0].basis || (knockoutKnown && !block[0].settled)) continue
      const games = [...new Set(block.map((r) => r.games.total))].sort((a, b) => a - b)
      notes.push(
        block[0].basis === 'totals'
          ? `Places ${block[0].best}–${block[0].worst}: all ${block.length} teams played ${games[0]} games, so totals are compared directly.`
          : `Places ${block[0].best}–${block[0].worst}: teams played ${games[0]}–${games[games.length - 1]} games (byes or different group sizes), so they are ordered by how far up their own group they finished (place ÷ teams in group), then by per-game averages.`,
      )
    }
  }
  return { rows: out, knockoutKnown, notes }
}
