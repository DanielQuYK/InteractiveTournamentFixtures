import { koById, koPlayed, koWinner, slotTeam } from './data'
import { expectedGoals, penaltyHomeChance, simulationStrengths } from './simulation'

type Strengths = ReturnType<typeof simulationStrengths>

/** Goals beyond this carry negligible probability (expected goals are capped at 6). */
const MAX_GOALS = 15
/** The result grid shown to users runs from 0 to this many goals per side. */
export const GRID_SIZE = 5

function poissonPmf(lambda: number) {
  const pmf = [Math.exp(-lambda)]
  for (let k = 1; k <= MAX_GOALS; k++) pmf.push((pmf[k - 1] * lambda) / k)
  return pmf
}

export interface FullTimePrediction {
  /** Full-time probabilities; a draw is settled by a penalty shoot-out. */
  home: number
  draw: number
  away: number
  /** Chance the first-named side eventually wins, shoot-out included. */
  homeAdvances: number
  /** Chance the first-named side wins a shoot-out, given the match is level at full time. */
  penaltyHome: number
  /** grid[homeGoals][awayGoals] for 0..GRID_SIZE goals. */
  grid: number[][]
}

/** Full-time score probabilities for a known pairing, from independent Poisson goals. */
export function pairPrediction(home: string, away: string, strengths: Strengths): FullTimePrediction {
  const { homeLambda, awayLambda } = expectedGoals(home, away, strengths)
  const h = poissonPmf(homeLambda)
  const a = poissonPmf(awayLambda)
  let homeWin = 0
  let draw = 0
  let awayWin = 0
  const grid = Array.from({ length: GRID_SIZE + 1 }, () => new Array<number>(GRID_SIZE + 1).fill(0))
  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      const p = h[i] * a[j]
      if (i > j) homeWin += p
      else if (i === j) draw += p
      else awayWin += p
      if (i <= GRID_SIZE && j <= GRID_SIZE) grid[i][j] = p
    }
  }
  return {
    home: homeWin,
    draw,
    away: awayWin,
    homeAdvances: homeWin + draw * penaltyHomeChance(homeLambda, awayLambda, strengths.params.shootoutTilt),
    penaltyHome: penaltyHomeChance(homeLambda, awayLambda, strengths.params.shootoutTilt),
    grid,
  }
}

/**
 * Full-time win/draw/win probabilities and result grid for a fixture whose two teams are both
 * confirmed. Returns null otherwise: with an undecided side there is no single pairing to describe,
 * so no probability is offered. For a match already played, pass ratings built only from
 * information available before kick-off (see `strengthsBefore`).
 */
export function predictFixture(id: string, strengths: Strengths = simulationStrengths()): FullTimePrediction | null {
  const match = koById(id)
  const home = slotTeam(match.home)
  const away = slotTeam(match.away)
  if (!home || !away) return null
  return pairPrediction(home, away, strengths)
}

export interface ActualResult {
  /** Which full-time outcome happened; a level score is a draw even though penalties settled it. */
  side: 'home' | 'draw' | 'away'
  score: [number, number] | null
  winner: string
  pens: [number, number] | null
}

/** What actually happened in a played knockout match, or null if it has not been played. */
export function actualResult(id: string): ActualResult | null {
  const match = koById(id)
  const winner = koWinner(match)
  if (!koPlayed(match) || !winner) return null
  const home = slotTeam(match.home)
  const side = match.score
    ? match.score[0] > match.score[1] ? 'home' : match.score[0] < match.score[1] ? 'away' : 'draw'
    : winner === home ? 'home' : 'away'
  return { side, score: match.score ?? null, winner, pens: match.pens ?? null }
}
