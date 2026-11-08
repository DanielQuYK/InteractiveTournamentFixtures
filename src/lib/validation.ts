import { GROUPS, GROUP_MATCHES, KO_MATCHES, PENALTIES, activeDivision, groupComplete, slotTeam, standings, type Slot } from './data'
import type { KoResult } from './results'

/** Problems found in the knockout results entered in results.ts. */
export function validateResults(results: Record<string, KoResult> = activeDivision().results): string[] {
  const issues: string[] = []
  for (const [id, r] of Object.entries(results)) {
    const m = KO_MATCHES.find((x) => x.id === id)
    if (!m) { issues.push(`Result entered for unknown match "${id}".`); continue }
    if (!r.score && !r.winner) {
      issues.push(`${m.label}: enter a score, or a confirmed winner with the scoreline to be confirmed.`)
      continue
    }
    const ints = [...(r.score ?? []), ...(r.pens ?? [])]
    if (ints.some((n) => !Number.isInteger(n) || n < 0)) {
      issues.push(`${m.label}: scores must be whole numbers of zero or more.`)
      continue
    }
    const home = slotTeam(m.home), away = slotTeam(m.away)
    if (!home || !away) {
      issues.push(`${m.label}: a result is entered before both teams are known. Enter the earlier rounds first.`)
    } else if (r.winner && r.winner !== home && r.winner !== away) {
      issues.push(`${m.label}: the winner "${r.winner}" is not one of the two teams (${home}, ${away}).`)
    }
    if (r.winner && r.score && r.score[0] !== r.score[1] && home && away) {
      const scoreWinner = r.score[0] > r.score[1] ? home : away
      if (scoreWinner !== r.winner) issues.push(`${m.label}: the winner does not match the score entered.`)
    }
    if (r.score && !r.winner) {
      const level = r.score[0] === r.score[1]
      if (level && !r.pens) issues.push(`${m.label}: the score is level (${r.score[0]}–${r.score[1]}); add a penalty shoot-out result or a confirmed winner.`)
    }
    if (r.score && r.score[0] !== r.score[1] && r.pens) issues.push(`${m.label}: a shoot-out was entered but the score is not level.`)
    if (r.pens && r.pens[0] === r.pens[1]) issues.push(`${m.label}: a shoot-out must have a winner.`)
  }
  return issues
}

const SEED = /^(\d)(?:st|nd), Group (\d)/

/** Compare each bracket team's recorded group place with the computed group table. */
export function validateQualifiers(): string[] {
  const issues: string[] = []
  const check = (slot: Slot) => {
    if (slot.kind !== 'team') return
    const m = SEED.exec(slot.seed)
    if (!m) return
    const place = Number(m[1]), group = Number(m[2])
    const actual = standings(group)[place - 1]?.team
    if (actual !== slot.team) {
      issues.push(`${slot.team} is seeded ${slot.seed} in the bracket, but the Group ${group} table places ${actual ?? 'no team'} ${place === 1 ? '1st' : '2nd'}.`)
    }
  }
  KO_MATCHES.forEach((m) => { check(m.home); check(m.away) })
  // Every group should send exactly its top two to the bracket.
  if (!activeDivision().lineupConfirmed) return issues
  for (const g of GROUPS) {
    if (!groupComplete(g)) continue
    const top = standings(g).slice(0, 2).map((r) => r.team)
    const inBracket = KO_MATCHES.flatMap((m) => [m.home, m.away])
      .filter((s) => s.kind === 'team' && new RegExp(`Group ${g}\\b`).test(s.seed))
      .map((s) => (s as { team: string }).team)
    for (const t of top) if (!inBracket.includes(t)) issues.push(`${t} finished in the top two of Group ${g} but is not in the bracket.`)
  }
  return issues
}

/** Explain places decided on a tie-breaker, for the top two and the cut-off line. */
export function tieNotes(group: number): string[] {
  const table = standings(group)
  const notes: string[] = []
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i], b = table[i + 1]
    if (a.pts !== b.pts || i > 1) continue
    const direct = GROUP_MATCHES.find(
      (m) => m.group === group && m.hs !== null && m.hs !== m.as && ((m.home === a.team && m.away === b.team) || (m.home === b.team && m.away === a.team)),
    )
    const directWinner = direct ? (direct.hs! > direct.as! ? direct.home : direct.away) : null
    const how = directWinner === a.team ? `their head-to-head result (${a.team} beat ${b.team} ${Math.max(direct!.hs!, direct!.as!)}–${Math.min(direct!.hs!, direct!.as!)})` : a.gd !== b.gd ? `goal difference (${fmt(a.gd)} v ${fmt(b.gd)})` : a.gf !== b.gf ? `goals scored (${a.gf} v ${b.gf})` : 'alphabetical order, as no further tie-breaker is defined'
    notes.push(`${a.team} and ${b.team} finished level on ${a.pts} points; ${a.team} is ranked ahead on ${how}.`)
  }
  return notes
}
const fmt = (n: number) => (n > 0 ? `+${n}` : String(n))

/** Disciplinary deductions applied in the group tables. */
export function penaltyNotes(group: number): string[] {
  return standings(group)
    .filter((r) => r.penalty > 0)
    .map((r) => `${r.team}: ${PENALTIES[r.team]} points deducted following disqualification (${r.pts + r.penalty} points earned, ${r.pts} after deduction).`)
}
