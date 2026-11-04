import { koLoser, koWinner, slotTeam, type KoMatch } from './data'

/** Winner-first goals, e.g. 4–1, or null when no score is recorded. */
export function winnerGoals(m: KoMatch) {
  const winner = koWinner(m)
  if (!winner || !m.score) return null
  const winnerIsHome = slotTeam(m.home) === winner
  const [h, a] = m.score
  return {
    winner,
    goals: winnerIsHome ? [h, a] : [a, h],
    pens: m.pens ? (winnerIsHome ? m.pens : [m.pens[1], m.pens[0]]) : null,
  }
}

/** "Beat QC 4–1" (with penalties and an asterisk when the score is unconfirmed). */
export function beatLine(m: KoMatch): string | null {
  const info = winnerGoals(m)
  const loser = koLoser(m)
  if (!info || !loser) return null
  let text = `Beat ${loser} ${info.goals[0]}–${info.goals[1]}`
  if (info.pens) text += ` (${info.pens[0]}–${info.pens[1]} pens)`
  return m.scoreTbc ? `${text}*` : text
}

/** The remark that accompanies an unconfirmed score. */
export const TBC_REMARK = '* Score to be confirmed and double-checked.'
