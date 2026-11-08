import type { DivisionConfig } from './divisions'
import type { KoMatchSpec, KoRound } from './divisions/types'

/*
 * Progress and "latest stage" for a competition, worked out from its configuration alone so the home
 * page can show every division at once without switching the active one.
 */

export interface Progress { played: number; total: number }

export interface StageInfo {
  label: string
  detail: string
  /** idle: waiting on the organisers; active: games being played; done: finished. */
  tone: 'idle' | 'active' | 'done'
}

const fmt = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`

/** Group games that can be played (cancelled and withdrawn fixtures excluded) and how many have a score. */
export function groupProgress(d: DivisionConfig): Progress & { awaiting: number; nextDate: string | null } {
  const rows = d.groupsRaw.trim().split('\n').map((l) => l.split('|'))
  const live = rows.filter((r) => r[7] !== '-:-' && r[8] !== 'C' && !d.withdrawn[r[4]] && !d.withdrawn[r[5]])
  const iso = (r: string[]) => {
    const [dd, mm, yy] = r[2].split('-')
    return `${yy ? 2000 + +yy : 2026}-${mm}-${dd}`
  }
  const unplayed = live.filter((r) => !(r[7] ?? '').includes(':'))
  const awaiting = d.asOf ? unplayed.filter((r) => iso(r) <= d.asOf).length : 0
  const upcoming = unplayed.map(iso).filter((x) => !d.asOf || x > d.asOf).sort()
  return { played: live.length - unplayed.length, total: live.length, awaiting, nextDate: upcoming[0] ?? null }
}

const hasResult = (d: DivisionConfig, id: string) => {
  const r = d.results[id]
  return Boolean(r && (r.score || r.winner))
}

/** Knockout games with a recorded result out of all games in the published bracket. */
export function koProgress(d: DivisionConfig): Progress {
  return { played: d.koMatches.filter((m) => hasResult(d, m.id)).length, total: d.koMatches.length }
}

/** Winner of a knockout match, followed back through the bracket from recorded results. */
function winnerName(d: DivisionConfig, id: string): string | null {
  const m = d.koMatches.find((x) => x.id === id)
  const r = d.results[id]
  if (!m || !r) return null
  const side = (s: KoMatchSpec['home']): string | null =>
    s.t === 'team' ? s.team : s.t === 'w' ? winnerName(d, s.of) : null
  const home = side(m.home), away = side(m.away)
  if (!home || !away) return null
  if (r.winner) return r.winner
  if (r.score && r.score[0] !== r.score[1]) return r.score[0] > r.score[1] ? home : away
  if (r.pens) return r.pens[0] > r.pens[1] ? home : away
  return null
}

const STAGES: { key: string; label: string; rounds: KoRound[] }[] = [
  { key: 'R14', label: '', rounds: ['R14'] },
  { key: 'QF', label: 'Quarter-finals', rounds: ['QF'] },
  { key: 'SF', label: 'Semi-finals', rounds: ['SF'] },
  { key: 'FIN', label: 'Final and third place', rounds: ['TP', 'F'] },
]

/** What the competition is up to right now: which stage, and how far through it is. */
export function stageOf(d: DivisionConfig): StageInfo {
  const groups = groupProgress(d)
  const groupsLeft = groups.total - groups.played
  const bits = (parts: (string | false | 0 | null)[]) => parts.filter(Boolean).join(' · ')

  if (groupsLeft > 0) {
    const toPlay = groupsLeft - groups.awaiting
    return {
      label: 'Group stage',
      tone: groups.played === 0 ? 'idle' : 'active',
      detail:
        groups.played === 0 && groups.awaiting === 0
          ? bits([`Awaiting the first game of ${groups.total}`, groups.nextDate && `starts ${fmt(groups.nextDate)}`])
          : bits([
              `${plural(groupsLeft, 'game')} remaining`,
              groups.awaiting > 0 && `${groups.awaiting} awaiting ${groups.awaiting === 1 ? 'a result' : 'results'}`,
              toPlay > 0 && groups.nextDate && `next ${fmt(groups.nextDate)}`,
            ]),
    }
  }
  if (!d.koMatches.length || !d.lineupConfirmed) {
    return {
      label: 'Awaiting knockout draw',
      tone: 'idle',
      detail: d.koMatches.length
        ? 'Groups complete; the final-round line-up is not set yet'
        : 'Groups complete; no final-round bracket published',
    }
  }

  const unplayed = (m: KoMatchSpec) => !hasResult(d, m.id)
  const title = d.koMatches.filter((m) => m.round !== 'PO')
  const po = d.koMatches.find((m) => m.round === 'PO')
  for (const stage of STAGES) {
    const ms = title.filter((m) => stage.rounds.includes(m.round))
    if (!ms.length || !ms.some(unplayed)) continue
    const played = ms.filter((m) => !unplayed(m)).length
    const open = ms.filter(unplayed)
    const awaiting = d.asOf ? open.filter((m) => m.date <= d.asOf).length : 0
    const upcoming = open.filter((m) => !d.asOf || m.date > d.asOf).map((m) => m.date).sort()
    const tbc = ms.filter((m) => d.results[m.id]?.scoreTbc).length
    const name = stage.key === 'R14' ? d.firstRoundName : stage.label
    const detail =
      played === 0 && awaiting === 0
        ? bits([`Awaiting all ${plural(ms.length, 'game')} to start`, upcoming[0] && `first on ${fmt(upcoming[0])}`])
        : bits([
            `${played} of ${ms.length} played`,
            awaiting > 0 && `${awaiting} awaiting ${awaiting === 1 ? 'a result' : 'results'}`,
            upcoming.length > 0 && `${upcoming.length} to play (next ${fmt(upcoming[0])})`,
            tbc > 0 && `${plural(tbc, 'score')} to be confirmed`,
          ])
    const side = po && unplayed(po) ? ` · group third-place play-off ${po.date > d.asOf ? 'on ' + fmt(po.date) : 'awaiting result'}` : ''
    return { label: name, tone: played === 0 ? 'idle' : 'active', detail: detail + side }
  }
  const final = title.find((m) => m.round === 'F')
  const champion = final ? winnerName(d, final.id) : null
  return { label: 'Complete', tone: 'done', detail: champion ? `Champion: ${champion}` : 'All games played' }
}
