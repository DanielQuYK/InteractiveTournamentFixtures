/** Every setting of the simulation model that a user can change. */
export interface ModelParams {
  /** Multiplier on the first-named team's expected goals (and divisor for the other team's). */
  homeAdvantage: number
  /** Average baseline matches blended into every team's rating. */
  priorMatches: number
  /** How much more a knockout result counts than a group game when rating teams. */
  knockoutWeight: number
  /** Goals above this count for less when fitting ratings. */
  compressFrom: number
  /** Weight of each goal above `compressFrom` (0 = ignored, 1 = no compression). */
  compressFactor: number
  /** Rounds of opponent adjustment. */
  iterations: number
  /** Smallest opponent factor used in the rating update. */
  evidenceFloor: number
  /** Lowest and highest expected goals in one simulated match. */
  lambdaMin: number
  lambdaMax: number
  /** 0 = shoot-outs are a coin flip, 1 = tilted fully by expected goals. */
  shootoutTilt: number
  /** Fixed baseline goals per team per match; null = calculated from the results. */
  baselineOverride: number | null
}

export const DEFAULT_PARAMS: ModelParams = {
  homeAdvantage: 1.06,
  priorMatches: 3,
  knockoutWeight: 1.5,
  compressFrom: 5,
  compressFactor: 0.45,
  iterations: 14,
  evidenceFloor: 0.35,
  lambdaMin: 0.12,
  lambdaMax: 6,
  shootoutTilt: 1,
  baselineOverride: null,
}

export interface ParamSpec {
  key: keyof ModelParams
  label: string
  min: number
  max: number
  step: number
  meaning: string
  reason: string
  range: string
  /** Shown beside the input, e.g. "×". */
  prefix?: string
  integer?: boolean
}

export const PARAM_SPECS: ParamSpec[] = [
  {
    key: 'baselineOverride',
    label: 'Baseline goals per team per match (μ)',
    min: 0.5,
    max: 6,
    step: 0.05,
    meaning: 'The goal rate of an average team against an average defence. Every expected-goals figure is built from it.',
    reason: 'Calculated from all matches counted, using effective (compressed) goals. Leave blank to keep it calculated.',
    range: 'Typically 1.5–3.5 in schools football',
  },
  {
    key: 'homeAdvantage',
    label: 'Home (first-named) advantage',
    min: 0.8,
    max: 1.5,
    step: 0.01,
    prefix: '×',
    meaning: "Multiplies the first-named team's expected goals and divides the other team's.",
    reason: 'Assumed. Too few home and away results exist to estimate it, and many venues are shared.',
    range: '1.00 (none) to about 1.20',
  },
  {
    key: 'priorMatches',
    label: 'Baseline pseudo-matches',
    min: 0,
    max: 20,
    step: 0.5,
    meaning: "Each team's rating is blended with this many average matches, so a few results cannot swing it far.",
    reason: 'Teams have between 4 and 5 games, so a small prior stops one-off scorelines dominating.',
    range: '0 (trust the data fully) to about 6',
  },
  {
    key: 'knockoutWeight',
    label: 'Knockout result weight',
    min: 0.5,
    max: 5,
    step: 0.1,
    prefix: '×',
    meaning: 'How much more a knockout result counts than one group game when rating teams.',
    reason: 'Judgement. Knockout games are the only ones between different groups, so they show how groups compare.',
    range: '1.0 (equal) to about 2.5',
  },
  {
    key: 'compressFrom',
    label: 'Large-score threshold',
    min: 3,
    max: 15,
    step: 1,
    integer: true,
    meaning: 'Goals beyond this many count for less when fitting ratings, so one lopsided game cannot overstate a team.',
    reason: 'Applies to rating only, never to shown scores.',
    range: '3–8',
  },
  {
    key: 'compressFactor',
    label: 'Large-score weight',
    min: 0,
    max: 1,
    step: 0.05,
    meaning: 'Goals above the threshold count as threshold + weight × ln(1 + extra), so 14 becomes about 6.0 at the defaults.',
    reason: 'Stops a result such as 14–0 overstating a team.',
    range: '0.2 (strong compression) to 1.0 (none)',
  },
  {
    key: 'iterations',
    label: 'Rating iterations',
    min: 1,
    max: 50,
    step: 1,
    integer: true,
    meaning: 'How many times opponent adjustment is repeated until ratings settle.',
    reason: 'Ratings stop changing noticeably well before 14 rounds.',
    range: '5–30',
  },
  {
    key: 'evidenceFloor',
    label: 'Opponent-strength floor',
    min: 0.05,
    max: 1,
    step: 0.05,
    meaning: 'Smallest opponent factor used, so scoring against a very strong defence cannot be over-credited.',
    reason: 'Numerical safeguard against extreme values.',
    range: '0.2–0.6',
  },
  {
    key: 'lambdaMin',
    label: 'Minimum expected goals',
    min: 0.01,
    max: 1,
    step: 0.01,
    meaning: 'Lowest expected goals any team can have in one simulated match.',
    reason: 'Keeps unusual mismatches realistic and avoids unstable draws.',
    range: '0.05–0.3',
  },
  {
    key: 'lambdaMax',
    label: 'Maximum expected goals',
    min: 2,
    max: 10,
    step: 0.5,
    meaning: 'Highest expected goals any team can have in one simulated match.',
    reason: 'Keeps unusual mismatches realistic and avoids unstable scores.',
    range: '4–8',
  },
  {
    key: 'shootoutTilt',
    label: 'Shoot-out tilt',
    min: 0,
    max: 1,
    step: 0.05,
    meaning: 'How far a shoot-out leans towards the side with higher expected goals: 0 is a coin flip, 1 is the full expected-goals ratio.',
    reason: 'Assumed. Shoot-outs are close to chance, so a modest tilt is reasonable.',
    range: '0 (pure chance) to 1',
  },
]

/** Bounds on a team's attack and defensive-weakness multipliers. */
export const RATING_MIN = 0.2
export const RATING_MAX = 4

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Forces every setting into its allowed range, so a bad edit can never break a simulation. */
export function sanitizeParams(input: Partial<ModelParams> | null | undefined): ModelParams {
  const merged = { ...DEFAULT_PARAMS, ...(input ?? {}) }
  const next = { ...merged }
  for (const spec of PARAM_SPECS) {
    const value = merged[spec.key]
    if (spec.key === 'baselineOverride') {
      next.baselineOverride =
        typeof value === 'number' && Number.isFinite(value) ? clamp(value, spec.min, spec.max) : null
      continue
    }
    let v = typeof value === 'number' && Number.isFinite(value) ? value : (DEFAULT_PARAMS[spec.key] as number)
    v = clamp(v, spec.min, spec.max)
    if (spec.integer) v = Math.round(v)
    ;(next as Record<string, unknown>)[spec.key] = v
  }
  if (next.lambdaMin >= next.lambdaMax) next.lambdaMin = Math.max(0.01, next.lambdaMax - 0.1)
  return next
}

export const isDefaultParams = (p: ModelParams) =>
  PARAM_SPECS.every((s) => p[s.key] === DEFAULT_PARAMS[s.key])

/** Per-team replacements for the fitted attack and defensive-weakness multipliers. */
export type RatingOverrides = Record<string, { attack?: number; weakness?: number }>

export function sanitizeOverrides(input: RatingOverrides | null | undefined): RatingOverrides {
  const out: RatingOverrides = {}
  for (const [team, o] of Object.entries(input ?? {})) {
    const entry: { attack?: number; weakness?: number } = {}
    if (typeof o?.attack === 'number' && Number.isFinite(o.attack)) entry.attack = clamp(o.attack, RATING_MIN, RATING_MAX)
    if (typeof o?.weakness === 'number' && Number.isFinite(o.weakness)) entry.weakness = clamp(o.weakness, RATING_MIN, RATING_MAX)
    if (entry.attack !== undefined || entry.weakness !== undefined) out[team] = entry
  }
  return out
}
