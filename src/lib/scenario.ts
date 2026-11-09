import { KO_MATCHES, koById, koPlayed, koWinner, matchCode, type KoMatch } from './data'
import { MATCH_ORDER, matchDependents, sanitizeSelection, type Scenario, type ScenarioCondition } from './simulation'

/*
 * What-if conditions for a simulation: results the user wants to happen in every counted run, whether for
 * games still to be played or to see what a game already played could have changed.
 *
 * A condition says who wins a match and, optionally, the scoreline. For a team to win a match it must have
 * won every earlier match on its way there, so those results are implied and added automatically.
 */

export interface ExpandedCondition extends ScenarioCondition {
  /** Added automatically because the team has to win its way to the chosen match. */
  implied: boolean
  /** The match already has a real result that this condition would change. */
  reverses: boolean
}

const slots = (m: KoMatch) => [m.home, m.away]
const titleMatches = () => KO_MATCHES.filter((m) => m.round !== 'PO')

/** Every team that could take part in a match, going by the bracket's structure alone. */
export function possibleParticipants(id: string): string[] {
  const out = new Set<string>()
  const visit = (matchId: string) => {
    for (const slot of slots(koById(matchId))) {
      if (slot.kind === 'team') out.add(slot.team)
      else if (slot.kind === 'winner' || slot.kind === 'loser') visit(slot.of)
    }
  }
  visit(id)
  return [...out].sort()
}
export const possibleWinners = possibleParticipants

/** The matches a team must win, in order, to arrive at (and, unless it is the third-place match, include) `id`. */
export function pathTo(team: string, id: string): string[] | null {
  const entry = titleMatches().find((m) => slots(m).some((s) => s.kind === 'team' && s.team === team))
  if (!entry) return null
  const target = koById(id)
  // The third-place match is reached by losing a semi-final, so only the games before that semi-final are implied
  const goal = target.round === 'TP' ? titleMatches().find((m) => m.round === 'SF' && possibleParticipants(m.id).includes(team)) : target
  if (!goal) return null
  const path = [entry.id]
  let current = entry
  while (current.id !== goal.id) {
    const next = titleMatches().find((m) => slots(m).some((s) => s.kind === 'winner' && s.of === current.id))
    if (!next) return null
    path.push(next.id)
    current = next
  }
  return target.round === 'TP' ? path.slice(0, -1) : path
}

const sameAsReal = (m: KoMatch, c: ScenarioCondition) => {
  if (!koPlayed(m)) return false
  if (koWinner(m) !== c.winner) return false
  if (!c.goals) return true
  const real = m.score
  if (!real) return false
  const [h, a] = real
  // Compare as (winner's goals, loser's goals); a shoot-out leaves the score level
  const hi = Math.max(h, a), lo = Math.min(h, a)
  return h === a ? c.goals[0] === c.goals[1] && c.goals[0] === h : c.goals[0] === hi && c.goals[1] === lo
}

/** Remove conditions that cannot apply: unknown match, a team that cannot be in it, or an impossible scoreline. */
export function sanitizeConditions(list: ScenarioCondition[]): ScenarioCondition[] {
  const seen = new Set<string>()
  return list.filter((c) => {
    if (!MATCH_ORDER.includes(c.id) || seen.has(c.id)) return false
    if (!possibleParticipants(c.id).includes(c.winner)) return false
    if (c.goals) {
      const [w, l] = c.goals
      if (!Number.isInteger(w) || !Number.isInteger(l) || l < 0 || w < l || w > 30) return false
    }
    seen.add(c.id)
    return true
  })
}

export interface ExpandedScenario {
  conditions: ExpandedCondition[]
  scenario: Scenario
  /** Problems that make the conditions impossible together. */
  conflicts: string[]
  /** Played matches whose real result the conditions change. */
  reversed: string[]
}

/** The conditions plus the earlier results they require, checked for contradictions. */
export function expandConditions(explicit: ScenarioCondition[]): ExpandedScenario {
  const list = sanitizeConditions(explicit)
  const map = new Map<string, ExpandedCondition>()
  const conflicts: string[] = []
  const name = (id: string) => matchCode(koById(id))
  for (const c of list) map.set(c.id, { ...c, implied: false, reverses: false })
  for (const c of list) {
    for (const x of pathTo(c.winner, c.id) ?? []) {
      if (x === c.id) continue
      const existing = map.get(x)
      if (!existing) map.set(x, { id: x, winner: c.winner, implied: true, reverses: false })
      else if (existing.winner !== c.winner) {
        conflicts.push(
          `${c.winner} cannot win ${name(c.id)} and also lose ${name(x)}, where ${existing.winner} is set to win.`,
        )
      }
    }
  }
  const reversed: string[] = []
  for (const [id, c] of map) {
    const m = koById(id)
    c.reverses = koPlayed(m) && !sameAsReal(m, c)
    if (c.reverses) reversed.push(id)
  }
  const conditions = MATCH_ORDER.filter((id) => map.has(id)).map((id) => map.get(id)!)
  return { conditions, scenario: new Map(conditions.map((c) => [c.id, c])), conflicts: [...new Set(conflicts)], reversed }
}

/**
 * The official results that can still be used as real once the conditions are applied: a result the
 * conditions change is dropped, and so is every later match that depended on it.
 */
export function effectiveFixed(base: Iterable<string>, expanded: ExpandedScenario): string[] {
  const drop = new Set<string>()
  for (const id of expanded.reversed) {
    drop.add(id)
    for (const d of matchDependents(id)) drop.add(d)
  }
  return sanitizeSelection([...base].filter((id) => !drop.has(id)))
}

export function describeCondition(c: ScenarioCondition): string {
  const score = c.goals ? ` ${c.goals[0]}–${c.goals[1]}${c.goals[0] === c.goals[1] ? ' (on penalties)' : ''}` : ''
  return `${matchCode(koById(c.id))}: ${c.winner} win${score}`
}
