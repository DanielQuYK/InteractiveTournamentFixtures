import { GROUP_MATCHES, KO_MATCHES, WITHDRAWN, activeDivision } from './data'

/** Fewest recorded results every team needs before its strength can be estimated at all. */
export const MIN_RESULTS_PER_TEAM = 2

/** Number of group games with a recorded score in the active competition. */
export const playedGroupGames = () => GROUP_MATCHES.filter((m) => m.hs !== null && m.as !== null).length

/** True when a final-round bracket (matches, rounds and dates) has been published. */
export const bracketPublished = () => KO_MATCHES.length > 0

/**
 * Reasons a simulation cannot be run yet; empty when it can. Strength is estimated only from the
 * competition's own results, never borrowed from another grade or division, so a competition with no
 * results has nothing to simulate from.
 */
export function simulationBlockers(): string[] {
  const reasons: string[] = []
  if (!bracketPublished()) {
    reasons.push('The organisers have not published a final-round bracket, so there are no knockout matches to simulate.')
  } else if (!activeDivision().lineupConfirmed) {
    reasons.push('The final-round line-up has not been drawn, so there are no knockout pairings to simulate.')
  }
  const teams = new Set(
    GROUP_MATCHES.flatMap((m) => [m.home, m.away]).filter((t) => !WITHDRAWN[t]),
  )
  const counts = new Map<string, number>()
  for (const m of GROUP_MATCHES) {
    if (m.hs === null || m.as === null) continue
    counts.set(m.home, (counts.get(m.home) ?? 0) + 1)
    counts.set(m.away, (counts.get(m.away) ?? 0) + 1)
  }
  const thin = [...teams].filter((t) => (counts.get(t) ?? 0) < MIN_RESULTS_PER_TEAM).length
  if (playedGroupGames() === 0) {
    reasons.push('No group game has been played, so there are no results to judge team strength from.')
  } else if (thin > 0) {
    reasons.push(`${thin} of ${teams.size} teams have fewer than ${MIN_RESULTS_PER_TEAM} results, which is too little to rate them.`)
  }
  return reasons
}
