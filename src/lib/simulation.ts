import { DEFAULT_PARAMS, sanitizeOverrides, sanitizeParams, type ModelParams, type RatingOverrides } from "./modelParams"
import { liveArray, liveRecord } from "./live"
import {
  GROUP_MATCHES,
  KO_MATCHES,
  ROUND_NAME,
  perDivision,
  koPlayed,
  koById,
  koWinner,
  slotTeam,
  type KoMatch,
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

const ROUND_RANK: Record<string, number> = { R14: 0, QF: 1, SF: 2, TP: 3, F: 4 }

const matchOrder = perDivision(() =>
  KO_MATCHES.filter((m) => m.round !== "PO")
    .map((m, i) => ({ id: m.id, round: ROUND_RANK[m.round], i }))
    .sort((a, b) => a.round - b.round || a.i - b.i)
    .map((m) => m.id),
)

/** Matches of the active division's title bracket in the order they are played inside one simulation. */
export const MATCH_ORDER: string[] = liveArray(matchOrder)

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
    if (slot.kind === "pending") return ""
    const index = MATCH_ORDER.indexOf(slot.of)
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

/** Which stage a run starts simulating from; earlier rounds use official results. */
export type StartStage = "R14" | "QF" | "SF" | "F"

const ALL_STAGES: StartStage[] = ["R14", "QF", "SF", "F"]
const ROUND_INDEX: Record<string, number> = { R14: 0, QF: 1, SF: 2, TP: 3, F: 3 }
/** Stages this division can start from: its first round onwards. */
const activeStages = perDivision(() => ALL_STAGES.filter((s) => s === "F" || KO_MATCHES.some((m) => m.round === s)))

/** Goals assumed for a level match whose exact scoreline is still to be confirmed. */
const PROVISIONAL_LEVEL_GOALS = 1


export interface StartStageOption {
  stage: StartStage
  label: string
  description: string
  enabled: boolean
  recommended: boolean
  /** Official matches that will be treated as already played. */
  fixedMatches: number
}

const stageLabel = (stage: StartStage) =>
  ({ R14: ROUND_NAME.R14, QF: "Quarter-finals", SF: "Semi-finals", F: "Final and third place" })[stage]

/**
 * Confirmed results available when a run begins at `stage`.
 * Round of 14 means a completely hypothetical tournament. Later starts include
 * all completed earlier matches and any completed matches within that stage.
 */
export function fixedMatchIds(stage: StartStage): Set<string> {
  const cut = ROUND_INDEX[stage]
  if (stage === activeStages()[0]) return new Set()
  return new Set(
    KO_MATCHES.filter((m) => m.round !== "PO" && ROUND_INDEX[m.round] <= cut && koPlayed(m)).map((m) => m.id),
  )
}

export const startStages = (): StartStage[] => activeStages()

export function startStageOptions(): StartStageOption[] {
  const options = activeStages().map((stage) => {
    const cut = ROUND_INDEX[stage]
    const first = stage === activeStages()[0]
    const earlier = KO_MATCHES.filter((m) => m.round !== "PO" && ROUND_INDEX[m.round] < cut)
    const enabled = earlier.every((m) => koPlayed(m))
    const fixed = fixedMatchIds(stage)
    return {
      stage,
      label: `From the ${stageLabel(stage)}`,
      description:
        first
          ? "Pretend no knockout match has been played; every match is simulated."
          : enabled
            ? `Uses ${fixed.size} completed results available at this stage as fixed and simulates the rest.`
            : "Unavailable until every earlier match has a confirmed winner.",
      enabled,
      recommended: false,
      fixedMatches: fixed.size,
    }
  })
  const latest = [...options].reverse().find((o) => o.enabled)
  if (latest) latest.recommended = true
  return options
}

/** The latest stage whose earlier rounds are all complete, the default for a new run. */
export const latestStartStage = (): StartStage =>
  startStageOptions().find((o) => o.recommended)?.stage ?? activeStages()[0]

/** An official score, or a provisional level score when only the winner is confirmed. */
export function officialScore(m: (typeof KO_MATCHES)[number]): [number, number] | null {
  if (m.score) return m.score
  if (m.scoreTbc && koPlayed(m)) return [PROVISIONAL_LEVEL_GOALS, PROVISIONAL_LEVEL_GOALS]
  return null
}

/**
 * Knockout results that existed before the day `id` was played: played matches on a strictly earlier
 * date. Results from the same day, even hours earlier, are excluded, so a match is never informed by
 * anything that happened on its own matchday. Pass `within` to limit this to results that count as
 * played in a given world (for example a simulation's applied results).
 */
export function playedBefore(id: string, within?: ReadonlySet<string>): Set<string> {
  const day = koById(id).date
  return new Set(
    KO_MATCHES.filter((m) => koPlayed(m) && m.date < day && (!within || within.has(m.id))).map((m) => m.id),
  )
}

/** Team ratings built only from information available before the match day: group games plus knockout results from earlier days. */
export function strengthsBefore(
  id: string,
  settings: ModelParams = DEFAULT_PARAMS,
  overrides: RatingOverrides = {},
  within?: ReadonlySet<string>,
) {
  return simulationStrengths(playedBefore(id, within), settings, overrides)
}

export interface SimulationRun {
  id: number
  createdAt: Date
  count: number
  aggregates: SimAggregate[]
  /** Distinct winner-only brackets seen in the run (at most a few thousand rows). */
  brackets: BracketRecord[]
  /** Scoreline counts for every pairing that occurred, by stage (compact: at most a few hundred rows). */
  matchups: MatchupRecord[]
  startStage: StartStage
  /** True when the run used edited model parameters or team ratings. */
  customised?: boolean
  /** The model settings the run used, so match details can be re-derived faithfully. */
  params?: ModelParams
  overrides?: RatingOverrides
}

export interface SimMatchResult {
  home: string
  away: string
  hg: number
  ag: number
  winner: string
  loser: string
}

const finishList = perDivision(() => {
  const has = (r: string) => KO_MATCHES.some((m) => m.round === r)
  const first = /(\d+)/.exec(ROUND_NAME.R14)?.[1]
  const all: { key: FinishKey; short: string; full: string; applies: boolean }[] = [
    { key: "r14", short: first ? `R${first}` : "R1", full: ROUND_NAME.R14, applies: has("R14") },
    { key: "qf", short: "QF", full: "Quarter-final", applies: has("QF") },
    { key: "fourth", short: "4th", full: "Fourth place", applies: true },
    { key: "third", short: "3rd", full: "Third place", applies: true },
    { key: "runnerUp", short: "2nd", full: "Runner-up", applies: true },
    { key: "champion", short: "1st", full: "Champion", applies: true },
  ]
  return all.filter((f) => f.applies).map(({ key, short, full }) => ({ key, short, full }))
})

/** Finishing positions that exist in the active division's bracket. */
export const FINISHES: { key: FinishKey; short: string; full: string }[] = liveArray(finishList)

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

export interface TeamRatingDetail {
  matches: number
  knockoutMatches: number
  /** Matches counted with knockout results weighted up. */
  weight: number
  goalsFor: number
  goalsAgainst: number
  effectiveFor: number
  effectiveAgainst: number
  /** Weighted average defensive-weakness factor of the opponents faced (1 = average). */
  opponentDefence: number
  /** Weighted average attacking factor of the opponents faced (1 = average). */
  opponentAttack: number
}

export function simulationStrengths(
  fixed: ReadonlySet<string> = new Set(KO_MATCHES.filter(koPlayed).map((m) => m.id)),
  settings: ModelParams = DEFAULT_PARAMS,
  overrides: RatingOverrides = {},
) {
  const params = sanitizeParams(settings)
  // Large scorelines contain information, but the difference between scoring
  // six and fourteen is not eight times as informative. The tail is compressed
  // before fitting attack and defence, which stops one mismatch dominating.
  const effectiveGoals = (goals: number) =>
    goals <= params.compressFrom
      ? goals
      : params.compressFrom + Math.log1p(goals - params.compressFrom) * params.compressFactor
  const observations: {
    home: string
    away: string
    hg: number
    ag: number
    weight: number
    rawHome: number
    rawAway: number
    knockout: boolean
  }[] = GROUP_MATCHES.filter((m) => m.hs !== null && m.as !== null).map(
    (m) => ({
      home: m.home,
      away: m.away,
      hg: effectiveGoals(m.hs!),
      ag: effectiveGoals(m.as!),
      weight: 1,
      rawHome: m.hs!,
      rawAway: m.as!,
      knockout: false,
    }),
  )

  for (const m of KO_MATCHES) {
    const home = slotTeam(m.home),
      away = slotTeam(m.away)
    const score = officialScore(m)
    if (fixed.has(m.id) && score && home && away) {
      observations.push({
        home,
        away,
        hg: effectiveGoals(score[0]),
        ag: effectiveGoals(score[1]),
        weight: params.knockoutWeight,
        rawHome: score[0],
        rawAway: score[1],
        knockout: true,
      })
    }
  }

  const teams = [...new Set(observations.flatMap((m) => [m.home, m.away]))]
  const totalGoals = observations.reduce((sum, m) => sum + m.hg + m.ag, 0)
  const calculatedAverage = totalGoals / Math.max(1, observations.length * 2)
  const average = params.baselineOverride ?? calculatedAverage
  const priorGames = params.priorMatches
  let attack = new Map(teams.map((team) => [team, 1]))
  let defence = new Map(teams.map((team) => [team, 1]))

  // Iterative opponent adjustment: scoring against a strong defence is worth
  // more, while conceding to a strong attack is penalised less. Bayesian
  // shrinkage keeps small or unusually easy groups close to the competition
  // baseline until cross-group knockout evidence becomes available.
  for (let iteration = 0; iteration < params.iterations; iteration++) {
    const totals = new Map(
      teams.map((team) => [team, { attack: 0, defence: 0, games: 0 }]),
    )
    for (const m of observations) {
      const h = totals.get(m.home)!,
        a = totals.get(m.away)!
      const w = m.weight
      h.attack += (w * m.hg) / Math.max(params.evidenceFloor, average * defence.get(m.away)!)
      h.defence += (w * m.ag) / Math.max(params.evidenceFloor, average * attack.get(m.away)!)
      a.attack += (w * m.ag) / Math.max(params.evidenceFloor, average * defence.get(m.home)!)
      a.defence += (w * m.hg) / Math.max(params.evidenceFloor, average * attack.get(m.home)!)
      h.games += w
      a.games += w
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

  // Evidence summary behind each team's final ratings, for the parameters panel.
  const details = new Map<string, TeamRatingDetail>(
    teams.map((team) => [
      team,
      { matches: 0, knockoutMatches: 0, weight: 0, goalsFor: 0, goalsAgainst: 0, effectiveFor: 0, effectiveAgainst: 0, opponentDefence: 0, opponentAttack: 0 },
    ]),
  )
  for (const m of observations) {
    for (const side of [0, 1] as const) {
      const team = side === 0 ? m.home : m.away
      const opponent = side === 0 ? m.away : m.home
      const d = details.get(team)!
      d.matches++
      if (m.knockout) d.knockoutMatches++
      d.weight += m.weight
      d.goalsFor += side === 0 ? m.rawHome : m.rawAway
      d.goalsAgainst += side === 0 ? m.rawAway : m.rawHome
      d.effectiveFor += side === 0 ? m.hg : m.ag
      d.effectiveAgainst += side === 0 ? m.ag : m.hg
      d.opponentDefence += m.weight * defence.get(opponent)!
      d.opponentAttack += m.weight * attack.get(opponent)!
    }
  }
  for (const d of details.values()) {
    d.opponentDefence /= Math.max(d.weight, 1e-9)
    d.opponentAttack /= Math.max(d.weight, 1e-9)
  }

  const clean = sanitizeOverrides(overrides)
  return {
    average,
    calculatedAverage,
    fixed,
    details,
    params,
    /** Fitted multipliers before any user override. */
    fitted: new Map(teams.map((team) => [team, { attack: attack.get(team)!, weakness: defence.get(team)! }])),
    overrides: clean,
    records: new Map(
      teams.map((team) => [
        team,
        {
          attack: (clean[team]?.attack ?? attack.get(team)!) * average,
          defence: (clean[team]?.weakness ?? defence.get(team)!) * average,
        },
      ]),
    ),
  }
}

/** Expected goals for each side in a full-time period (35 minutes each half). */
export function expectedGoals(
  home: string,
  away: string,
  strengths: ReturnType<typeof simulationStrengths>,
) {
  const neutral = { attack: strengths.average, defence: strengths.average }
  const h = strengths.records.get(home) ?? neutral
  const a = strengths.records.get(away) ?? neutral
  const { homeAdvantage, lambdaMin, lambdaMax } = strengths.params
  const clamp = (v: number) => Math.min(lambdaMax, Math.max(lambdaMin, v))
  return {
    homeLambda: clamp(
      strengths.average *
        (h.attack / strengths.average) *
        (a.defence / strengths.average) *
        homeAdvantage,
    ),
    awayLambda: clamp(
      (strengths.average *
        (a.attack / strengths.average) *
        (h.defence / strengths.average)) /
        homeAdvantage,
    ),
  }
}

/** Chance the first-named team wins a shoot-out, tilted mildly by expected goals. */
export const penaltyHomeChance = (homeLambda: number, awayLambda: number, tilt = 1) =>
  0.5 + tilt * (homeLambda / (homeLambda + awayLambda) - 0.5)

export function simulateMatch(
  id: string,
  home: string,
  away: string,
  strengths: ReturnType<typeof simulationStrengths>,
): SimMatchResult {
  const official = koById(id)
  const score = officialScore(official)
  if (strengths.fixed.has(id) && score) {
    const winner = koWinner(official)
    if (winner) {
      return {
        home,
        away,
        hg: score[0],
        ag: score[1],
        winner,
        loser: winner === home ? away : home,
      }
    }
  }

  const { homeLambda, awayLambda } = expectedGoals(home, away, strengths)
  const hg = poisson(homeLambda)
  const ag = poisson(awayLambda)

  // HKSSF rule: a drawn knockout match goes straight to a penalty shoot-out
  // (no extra time). The shoot-out winner is drawn with a mild tilt towards the
  // stronger side; shoot-out kicks are not counted as goals.
  let winner: string
  if (hg !== ag) {
    winner = hg > ag ? home : away
  } else {
    winner = Math.random() < penaltyHomeChance(homeLambda, awayLambda, strengths.params.shootoutTilt) ? home : away
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

  const results = new Map<string, SimMatchResult>()
  const resolve = (slot: Slot): string => {
    if (slot.kind === "team") return slot.team
    if (slot.kind === "pending") throw new Error("The knockout line-up has not been confirmed, so it cannot be simulated.")
    const source = results.get(slot.of)!
    return slot.kind === "winner" ? source.winner : source.loser
  }
  for (const id of MATCH_ORDER) {
    const match = koById(id)
    const result = play(id, resolve(match.home), resolve(match.away))
    results.set(id, result)
    if (match.round === "R14") finish(result.loser, "r14")
    else if (match.round === "QF") finish(result.loser, "qf")
    else if (match.round === "TP") {
      finish(result.loser, "fourth")
      finish(result.winner, "third")
    } else if (match.round === "F") {
      finish(result.loser, "runnerUp")
      finish(result.winner, "champion")
    }
  }

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

const simMetrics = perDivision((): SimMetric[] => [
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
  ...finishList().map(
    (f): SimMetric => ({
      key: f.key,
      short: f.short,
      label: `Finished: ${f.full}`,
      unit: "percent",
      finish: f.key,
      value: (r, n) => (r.finishes[f.key] / n) * 100,
    }),
  ),
])

export const SIM_METRICS: SimMetric[] = liveArray(simMetrics)

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
export const FINISH_SLOTS: Record<FinishKey, number> = liveRecord(
  perDivision(() => ({
    r14: KO_MATCHES.filter((m) => m.round === "R14").length,
    qf: KO_MATCHES.filter((m) => m.round === "QF").length,
    fourth: 1,
    third: 1,
    runnerUp: 1,
    champion: 1,
  })),
) as Record<FinishKey, number>

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
