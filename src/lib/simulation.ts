import { GROUP_MATCHES, KO_MATCHES, koById, koWinner, slotTeam } from './data'

/* ---------- Monte Carlo knockout simulation ---------- */

export type FinishKey = 'r14' | 'qf' | 'fourth' | 'third' | 'runnerUp' | 'champion'

export interface SimAggregate {
  team: string
  matches: number
  wins: number
  gf: number
  ga: number
  finishes: Record<FinishKey, number>
}

export interface SimulationRun {
  id: number
  createdAt: Date
  count: number
  aggregates: SimAggregate[]
}

export interface SimMatchResult {
  home: string
  away: string
  hg: number
  ag: number
  winner: string
  loser: string
}

export const FINISHES: { key: FinishKey; short: string; full: string }[] = [
  { key: 'r14', short: 'R14', full: 'Round of 14' },
  { key: 'qf', short: 'QF', full: 'Quarter-final' },
  { key: 'fourth', short: '4th', full: 'Fourth place' },
  { key: 'third', short: '3rd', full: 'Third place' },
  { key: 'runnerUp', short: '2nd', full: 'Runner-up' },
  { key: 'champion', short: '1st', full: 'Champion' },
]

export function poisson(lambda: number) {
  const limit = Math.exp(-lambda)
  let product = 1
  let value = 0
  do {
    value++
    product *= Math.random()
  } while (product > limit)
  return value - 1
}

export function simulationStrengths() {
  // Large scorelines contain information, but the difference between scoring
  // six and fourteen is not eight times as informative. The tail is compressed
  // before fitting attack and defence, which stops one mismatch dominating.
  const effectiveGoals = (goals: number) =>
    goals <= 5 ? goals : 5 + Math.log1p(goals - 5) * 0.45
  const observations: { home: string; away: string; hg: number; ag: number }[] = GROUP_MATCHES
    .filter((m) => m.hs !== null && m.as !== null)
    .map((m) => ({ home: m.home, away: m.away, hg: effectiveGoals(m.hs!), ag: effectiveGoals(m.as!) }))

  for (const m of KO_MATCHES) {
    const home = slotTeam(m.home), away = slotTeam(m.away)
    if (m.score && home && away) {
      observations.push({ home, away, hg: effectiveGoals(m.score[0]), ag: effectiveGoals(m.score[1]) })
    }
  }

  const teams = [...new Set(observations.flatMap((m) => [m.home, m.away]))]
  const totalGoals = observations.reduce((sum, m) => sum + m.hg + m.ag, 0)
  const average = totalGoals / Math.max(1, observations.length * 2)
  const priorGames = 3
  let attack = new Map(teams.map((team) => [team, 1]))
  let defence = new Map(teams.map((team) => [team, 1]))

  // Iterative opponent adjustment: scoring against a strong defence is worth
  // more, while conceding to a strong attack is penalised less. Bayesian
  // shrinkage keeps small or unusually easy groups close to the competition
  // baseline until cross-group knockout evidence becomes available.
  for (let iteration = 0; iteration < 14; iteration++) {
    const totals = new Map(teams.map((team) => [team, { attack: 0, defence: 0, games: 0 }]))
    for (const m of observations) {
      const h = totals.get(m.home)!, a = totals.get(m.away)!
      h.attack += m.hg / Math.max(0.35, average * defence.get(m.away)!)
      h.defence += m.ag / Math.max(0.35, average * attack.get(m.away)!)
      a.attack += m.ag / Math.max(0.35, average * defence.get(m.home)!)
      a.defence += m.hg / Math.max(0.35, average * attack.get(m.home)!)
      h.games++; a.games++
    }
    const nextAttack = new Map<string, number>()
    const nextDefence = new Map<string, number>()
    for (const team of teams) {
      const t = totals.get(team)!
      nextAttack.set(team, (priorGames + t.attack) / (priorGames + t.games))
      nextDefence.set(team, (priorGames + t.defence) / (priorGames + t.games))
    }
    const attackMean = Math.exp([...nextAttack.values()].reduce((sum, value) => sum + Math.log(value), 0) / teams.length)
    const defenceMean = Math.exp([...nextDefence.values()].reduce((sum, value) => sum + Math.log(value), 0) / teams.length)
    attack = new Map(teams.map((team) => [team, nextAttack.get(team)! / attackMean]))
    defence = new Map(teams.map((team) => [team, nextDefence.get(team)! / defenceMean]))
  }

  return {
    average,
    records: new Map(teams.map((team) => [
      team,
      {
        attack: attack.get(team)! * average,
        defence: defence.get(team)! * average,
      },
    ])),
  }
}

export function simulateMatch(id: string, home: string, away: string, strengths: ReturnType<typeof simulationStrengths>): SimMatchResult {
  const official = koById(id)
  if (official.score) {
    const winner = koWinner(official)
    if (winner) {
      return {
        home,
        away,
        hg: official.score[0],
        ag: official.score[1],
        winner,
        loser: winner === home ? away : home,
      }
    }
  }

  const neutral = { attack: strengths.average, defence: strengths.average }
  const h = strengths.records.get(home) ?? neutral
  const a = strengths.records.get(away) ?? neutral
  const homeAdvantage = 1.06
  const homeLambda = Math.min(6, Math.max(0.12, strengths.average * (h.attack / strengths.average) * (a.defence / strengths.average) * homeAdvantage))
  const awayLambda = Math.min(6, Math.max(0.12, strengths.average * (a.attack / strengths.average) * (h.defence / strengths.average) / homeAdvantage))
  let hg = poisson(homeLambda)
  let ag = poisson(awayLambda)

  // A knockout tie proceeds through extra time; a remaining tie is resolved
  // by a strength-weighted shoot-out. Shoot-out kicks are not counted as goals.
  if (hg === ag) {
    hg += poisson(homeLambda / 3)
    ag += poisson(awayLambda / 3)
  }
  let winner: string
  if (hg !== ag) {
    winner = hg > ag ? home : away
  } else {
    const homeChance = homeLambda / (homeLambda + awayLambda)
    winner = Math.random() < homeChance ? home : away
  }
  return { home, away, hg, ag, winner, loser: winner === home ? away : home }
}

export function runOneSimulation(
  strengths: ReturnType<typeof simulationStrengths>,
  aggregate: Map<string, SimAggregate>,
) {
  const finish = (team: string, key: FinishKey) => { aggregate.get(team)!.finishes[key]++ }
  const play = (id: string, home: string, away: string) => {
    const result = simulateMatch(id, home, away, strengths)
    const h = aggregate.get(home)!, a = aggregate.get(away)!
    h.matches++; a.matches++
    h.gf += result.hg; h.ga += result.ag
    a.gf += result.ag; a.ga += result.hg
    aggregate.get(result.winner)!.wins++
    return result
  }

  const r1 = play('R1', 'IKTMC', 'QC'); finish(r1.loser, 'r14')
  const r2 = play('R2', 'KCC', 'LHYMSS'); finish(r2.loser, 'r14')
  const r3 = play('R3', 'SJA', 'ISS'); finish(r3.loser, 'r14')
  const r4 = play('R4', 'KWSC', 'CFSS'); finish(r4.loser, 'r14')
  const r5 = play('R5', 'HW', 'SKHTSK'); finish(r5.loser, 'r14')
  const r6 = play('R6', 'HKUGA', 'SPCC'); finish(r6.loser, 'r14')

  const q1 = play('Q1', 'SKHLMC', r1.winner); finish(q1.loser, 'qf')
  const q2 = play('Q2', r2.winner, r3.winner); finish(q2.loser, 'qf')
  const q3 = play('Q3', r4.winner, r5.winner); finish(q3.loser, 'qf')
  const q4 = play('Q4', r6.winner, 'CANADIAN'); finish(q4.loser, 'qf')

  const s1 = play('S1', q1.winner, q2.winner)
  const s2 = play('S2', q3.winner, q4.winner)
  const third = play('TP', s1.loser, s2.loser)
  finish(third.loser, 'fourth')
  finish(third.winner, 'third')
  const final = play('F', s1.winner, s2.winner)
  finish(final.loser, 'runnerUp')
  finish(final.winner, 'champion')
}

