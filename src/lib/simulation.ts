import {
  GROUP_MATCHES,
  KO_MATCHES,
  koById,
  koWinner,
  slotTeam,
  type Slot,
} from "./data"

/* ---------- Monte Carlo knockout simulation ---------- */

export type FinishKey = "r14" | "qf" | "fourth" | "third" | "runnerUp" | "champion"

export interface SimAggregate {
  team: string
  matches: number
  wins: number
  gf: number
  ga: number
  /** Sum over simulations of (wins ÷ matches) for this team; divide by the run count for the average win rate. */
  winRateSum: number
  finishes: Record<FinishKey, number>
}

export const emptyAggregate = (team: string): SimAggregate => ({
  team,
  matches: 0,
  wins: 0,
  gf: 0,
  ga: 0,
  winRateSum: 0,
  finishes: { r14: 0, qf: 0, fourth: 0, third: 0, runnerUp: 0, champion: 0 },
})

/** Matches in the order they are played inside one simulation. */
export const MATCH_ORDER = [
  "R1",
  "R2",
  "R3",
  "R4",
  "R5",
  "R6",
  "Q1",
  "Q2",
  "Q3",
  "Q4",
  "S1",
  "S2",
  "TP",
  "F",
] as const

/** How often one exact set of 14 match winners occurred, plus summed winning margins per match. */
export interface BracketRecord {
  key: string
  count: number
  marginSum: number[]
}

export type BracketTally = Map<string, BracketRecord>

/** Smallest run for which the most-common-bracket view is offered. */
export const MIN_BRACKET_RUNS = 1000

/** The two teams in each match (in MATCH_ORDER) for a given list of winners. */
export function bracketParticipants(winners: string[]): [string, string][] {
  const result: [string, string][] = []
  const resolve = (slot: Slot): string => {
    if (slot.kind === "team") return slot.team
    const index = MATCH_ORDER.indexOf(slot.of as typeof MATCH_ORDER[number])
    const winner = winners[index]
    if (slot.kind === "winner") return winner
    const [a, b] = result[index]
    return winner === a ? b : a
  }
  for (const id of MATCH_ORDER) {
    const match = koById(id)
    result.push([resolve(match.home), resolve(match.away)])
  }
  return result
}

/** Scorelines for one pairing at one stage. Goals are listed for `teams[0]` first (alphabetical). */
export interface StageScores {
  count: number
  scores: Record<string, number>
  /** Wins for teams[0] and teams[1]; level scores are settled by shoot-out. */
  wins: [number, number]
}

export interface MatchupRecord {
  key: string
  teams: [string, string]
  /** Keyed by match id (e.g. "F", "TP"), because one pairing can meet at different stages. */
  stages: Record<string, StageScores>
}

export type MatchupTally = Map<string, MatchupRecord>

export interface SimulationRun {
  id: number
  createdAt: Date
  count: number
  aggregates: SimAggregate[]
  /** Distinct winner-only brackets seen in the run (at most a few thousand rows). */
  brackets: BracketRecord[]
  /** Scoreline counts for every pairing that occurred, by stage (compact: at most a few hundred rows). */
  matchups: MatchupRecord[]
}

export interface SimMatchResult {
  home: string
  away: string
  hg: number
  ag: number
  winner: string
  loser: string
}

export const FINISHES: {
  key: FinishKey
  short: string
  full: string
}[] = [
  { key: "r14", short: "R14", full: "Round of 14" },
  { key: "qf", short: "QF", full: "Quarter-final" },
  { key: "fourth", short: "4th", full: "Fourth place" },
  { key: "third", short: "3rd", full: "Third place" },
  { key: "runnerUp", short: "2nd", full: "Runner-up" },
  { key: "champion", short: "1st", full: "Champion" },
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
  const observations: {
    home: string
    away: string
    hg: number
    ag: number
  }[] = GROUP_MATCHES.filter((m) => m.hs !== null && m.as !== null).map(
    (m) => ({
      home: m.home,
      away: m.away,
      hg: effectiveGoals(m.hs!),
      ag: effectiveGoals(m.as!),
    }),
  )

  for (const m of KO_MATCHES) {
    const home = slotTeam(m.home),
      away = slotTeam(m.away)
    if (m.score && home && away) {
      observations.push({
        home,
        away,
        hg: effectiveGoals(m.score[0]),
        ag: effectiveGoals(m.score[1]),
      })
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
    const totals = new Map(
      teams.map((team) => [team, { attack: 0, defence: 0, games: 0 }]),
    )
    for (const m of observations) {
      const h = totals.get(m.home)!,
        a = totals.get(m.away)!
      h.attack += m.hg / Math.max(0.35, average * defence.get(m.away)!)
      h.defence += m.ag / Math.max(0.35, average * attack.get(m.away)!)
      a.attack += m.ag / Math.max(0.35, average * defence.get(m.home)!)
      a.defence += m.hg / Math.max(0.35, average * attack.get(m.home)!)
      h.games++
      a.games++
    }
    const nextAttack = new Map<string, number>()
    const nextDefence = new Map<string, number>()
    for (const team of teams) {
      const t = totals.get(team)!
      nextAttack.set(team, (priorGames + t.attack) / (priorGames + t.games))
      nextDefence.set(team, (priorGames + t.defence) / (priorGames + t.games))
    }
    const attackMean = Math.exp(
      [...nextAttack.values()].reduce(
        (sum, value) => sum + Math.log(value),
        0,
      ) / teams.length,
    )
    const defenceMean = Math.exp(
      [...nextDefence.values()].reduce(
        (sum, value) => sum + Math.log(value),
        0,
      ) / teams.length,
    )
    attack = new Map(
      teams.map((team) => [team, nextAttack.get(team)! / attackMean]),
    )
    defence = new Map(
      teams.map((team) => [team, nextDefence.get(team)! / defenceMean]),
    )
  }

  return {
    average,
    records: new Map(
      teams.map((team) => [
        team,
        {
          attack: attack.get(team)! * average,
          defence: defence.get(team)! * average,
        },
      ]),
    ),
  }
}

export function simulateMatch(
  id: string,
  home: string,
  away: string,
  strengths: ReturnType<typeof simulationStrengths>,
): SimMatchResult {
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
  const homeLambda = Math.min(
    6,
    Math.max(
      0.12,
      strengths.average *
        (h.attack / strengths.average) *
        (a.defence / strengths.average) *
        homeAdvantage,
    ),
  )
  const awayLambda = Math.min(
    6,
    Math.max(
      0.12,
      (strengths.average *
        (a.attack / strengths.average) *
        (h.defence / strengths.average)) /
        homeAdvantage,
    ),
  )
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
  brackets?: BracketTally,
  matchups?: MatchupTally,
) {
  const finish = (team: string, key: FinishKey) => {
    aggregate.get(team)!.finishes[key]++
  }
  // Per-simulation tally, folded into the compact aggregate at the end.
  const tally = new Map<string, {
    played: number
    won: number
  }>()
  const count = (team: string) => {
    if (!tally.has(team)) tally.set(team, { played: 0, won: 0 })
    return tally.get(team)!
  }
  const winners: string[] = []
  const margins: number[] = []
  const play = (id: string, home: string, away: string) => {
    const result = simulateMatch(id, home, away, strengths)
    winners.push(result.winner)
    if (matchups) recordMatchup(matchups, id, result)
    // Winner's goal margin; a shoot-out win after a level score counts as zero.
    margins.push(
      result.winner === home ? result.hg - result.ag : result.ag - result.hg,
    )
    const h = aggregate.get(home)!,
      a = aggregate.get(away)!
    count(home).played++
    count(away).played++
    count(result.winner).won++
    h.matches++
    a.matches++
    h.gf += result.hg
    h.ga += result.ag
    a.gf += result.ag
    a.ga += result.hg
    aggregate.get(result.winner)!.wins++
    return result
  }

  const r1 = play("R1", "IKTMC", "QC")
  finish(r1.loser, "r14")
  const r2 = play("R2", "KCC", "LHYMSS")
  finish(r2.loser, "r14")
  const r3 = play("R3", "SJA", "ISS")
  finish(r3.loser, "r14")
  const r4 = play("R4", "KWSC", "CFSS")
  finish(r4.loser, "r14")
  const r5 = play("R5", "HW", "SKHTSK")
  finish(r5.loser, "r14")
  const r6 = play("R6", "HKUGA", "SPCC")
  finish(r6.loser, "r14")

  const q1 = play("Q1", "SKHLMC", r1.winner)
  finish(q1.loser, "qf")
  const q2 = play("Q2", r2.winner, r3.winner)
  finish(q2.loser, "qf")
  const q3 = play("Q3", r4.winner, r5.winner)
  finish(q3.loser, "qf")
  const q4 = play("Q4", r6.winner, "CANADIAN")
  finish(q4.loser, "qf")

  const s1 = play("S1", q1.winner, q2.winner)
  const s2 = play("S2", q3.winner, q4.winner)
  const third = play("TP", s1.loser, s2.loser)
  finish(third.loser, "fourth")
  finish(third.winner, "third")
  const final = play("F", s1.winner, s2.winner)
  finish(final.loser, "runnerUp")
  finish(final.winner, "champion")

  for (const [team, t] of tally)
    aggregate.get(team)!.winRateSum += t.won / t.played

  if (brackets) {
    const key = winners.join("|")
    let record = brackets.get(key)
    if (!record) {
      record = {
        key,
        count: 0,
        marginSum: new Array(MATCH_ORDER.length).fill(0),
      }
      brackets.set(key, record)
    }
    record.count++
    const target = record
    margins.forEach((margin, index) => {
      target.marginSum[index] += margin
    })
  }
}

/* ---------- Reported measures ---------- */

export interface SimMetric {
  key: string
  short: string
  label: string
  unit: "count" | "signed" | "percent"
  lowerIsBetter?: boolean
  /** Share-of-simulations measures carry a binomial margin of error. */
  finish?: FinishKey
  value: (r: SimAggregate, runs: number) => number
}

export const SIM_METRICS: SimMetric[] = [
  {
    key: "wins",
    short: "Wins / sim",
    label: "Wins per simulation",
    unit: "count",
    value: (r, n) => r.wins / n,
  },
  {
    key: "losses",
    short: "Losses / sim",
    label: "Losses per simulation",
    unit: "count",
    lowerIsBetter: true,
    value: (r, n) => (r.matches - r.wins) / n,
  },
  {
    key: "winRate",
    short: "Win rate",
    label: "Average win rate across simulations",
    unit: "percent",
    value: (r, n) => (r.winRateSum / n) * 100,
  },
  {
    key: "gf",
    short: "GF / sim",
    label: "Goals scored per simulation",
    unit: "count",
    value: (r, n) => r.gf / n,
  },
  {
    key: "ga",
    short: "GA / sim",
    label: "Goals conceded per simulation",
    unit: "count",
    lowerIsBetter: true,
    value: (r, n) => r.ga / n,
  },
  {
    key: "gd",
    short: "GD / sim",
    label: "Goal difference per simulation",
    unit: "signed",
    value: (r, n) => (r.gf - r.ga) / n,
  },
  ...FINISHES.map(
    (f): SimMetric => ({
      key: f.key,
      short: f.short,
      label: `Finished: ${f.full}`,
      unit: "percent",
      finish: f.key,
      value: (r, n) => (r.finishes[f.key] / n) * 100,
    }),
  ),
]

export function formatMetric(metric: SimMetric, v: number) {
  if (metric.unit === "percent") return `${v.toFixed(1)}%`
  if (metric.unit === "signed") return `${v > 0 ? "+" : ""}${v.toFixed(2)}`
  return v.toFixed(2)
}

/**
 * Half-width, in percentage points, of the 95% Wilson confidence interval for a
 * share observed `hits` times in `runs` simulations.
 */
export function marginOfError(hits: number, runs: number) {
  if (runs <= 0) return 0
  const z = 1.96
  const p = hits / runs
  return (
    ((z * Math.sqrt((p * (1 - p)) / runs + (z * z) / (4 * runs * runs))) /
      (1 + (z * z) / runs)) *
    100
  )
}

/** Number of teams that finish in each position in one simulation. */
export const FINISH_SLOTS: Record<FinishKey, number> = {
  r14: 6,
  qf: 4,
  fourth: 1,
  third: 1,
  runnerUp: 1,
  champion: 1,
}

/** Actual Wilson bounds (asymmetric at 0%/100%), in percentage points. */
export function probabilityInterval(hits: number, runs: number) {
  if (runs <= 0) return { low: 0, high: 100 }
  const z2 = 1.96 ** 2
  const centre = ((hits / runs + z2 / (2 * runs)) / (1 + z2 / runs)) * 100
  const half = marginOfError(hits, runs)
  return { low: Math.max(0, centre - half), high: Math.min(100, centre + half) }
}

function recordMatchup(tally: MatchupTally, id: string, result: SimMatchResult) {
  const teams = [result.home, result.away].sort() as [string, string]
  const key = teams.join("|")
  let record = tally.get(key)
  if (!record) {
    record = { key, teams, stages: {} }
    tally.set(key, record)
  }
  const stage = (record.stages[id] ??= { count: 0, scores: {}, wins: [0, 0] })
  const first = result.home === teams[0] ? result.hg : result.ag
  const second = result.home === teams[0] ? result.ag : result.hg
  const score = `${first}-${second}`
  stage.count++
  stage.scores[score] = (stage.scores[score] ?? 0) + 1
  stage.wins[result.winner === teams[0] ? 0 : 1]++
}
