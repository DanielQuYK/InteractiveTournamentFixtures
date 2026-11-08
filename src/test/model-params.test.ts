import { describe, expect, it } from "vitest"
import {
  DEFAULT_PARAMS,
  RATING_MAX,
  RATING_MIN,
  isDefaultParams,
  sanitizeOverrides,
  sanitizeParams,
} from "../lib/modelParams"
import { pairPrediction } from "../lib/prediction"
import {
  emptyAggregate,
  expectedGoals,
  fixedMatchIds,
  penaltyHomeChance,
  runOneSimulation,
  simulationStrengths,
} from "../lib/simulation"
import { ALL_KO_TEAMS } from "../lib/data"

const fixed = fixedMatchIds("QF")

describe("parameter safety", () => {
  it("keeps defaults unchanged", () => {
    expect(isDefaultParams(sanitizeParams({}))).toBe(true)
    expect(isDefaultParams(sanitizeParams(null))).toBe(true)
  })
  it("forces bad values into range", () => {
    const p = sanitizeParams({
      homeAdvantage: 99,
      priorMatches: -5,
      iterations: 2.6,
      lambdaMin: 9,
      lambdaMax: 3,
      shootoutTilt: Number.NaN,
      baselineOverride: 100,
    })
    expect(p.homeAdvantage).toBe(1.5)
    expect(p.priorMatches).toBe(0)
    expect(p.iterations).toBe(3)
    expect(p.lambdaMin).toBeLessThan(p.lambdaMax)
    expect(p.shootoutTilt).toBe(DEFAULT_PARAMS.shootoutTilt)
    expect(p.baselineOverride).toBe(6)
  })
  it("limits rating overrides", () => {
    const o = sanitizeOverrides({
      HKUGA: { attack: 100, weakness: -1 },
      QC: {},
      X: { attack: Number.NaN },
    })
    expect(o).toEqual({ HKUGA: { attack: RATING_MAX, weakness: RATING_MIN } })
  })
})

describe("edited settings change the model", () => {
  it("uses default settings exactly as before when nothing is edited", () => {
    const a = simulationStrengths(fixed)
    const b = simulationStrengths(fixed, DEFAULT_PARAMS, {})
    for (const [team, r] of a.records) expect(b.records.get(team)).toEqual(r)
  })
  it("home advantage changes expected goals", () => {
    const base = expectedGoals("SKHLMC", "IKTMC", simulationStrengths(fixed))
    const none = expectedGoals(
      "SKHLMC",
      "IKTMC",
      simulationStrengths(fixed, { ...DEFAULT_PARAMS, homeAdvantage: 1 }),
    )
    expect(none.homeLambda).toBeLessThan(base.homeLambda)
    expect(none.awayLambda).toBeGreaterThan(base.awayLambda)
  })
  it("a baseline override rescales goals and expected goals respect the limits", () => {
    const s = simulationStrengths(fixed, {
      ...DEFAULT_PARAMS,
      baselineOverride: 3,
      lambdaMax: 2,
    })
    expect(s.average).toBe(3)
    const g = expectedGoals("CANADIAN", "SPCC", s)
    expect(g.homeLambda).toBeLessThanOrEqual(2)
  })
  it("a team rating edit replaces the fitted value", () => {
    const base = simulationStrengths(fixed)
    const edited = simulationStrengths(fixed, DEFAULT_PARAMS, {
      QC: { attack: 3 },
    })
    expect(edited.records.get("QC")!.attack / edited.average).toBeCloseTo(3, 6)
    expect(edited.fitted.get("QC")!.attack).toBeCloseTo(
      base.fitted.get("QC")!.attack,
      6,
    )
    expect(edited.records.get("QC")!.defence).toBeCloseTo(
      base.records.get("QC")!.defence,
      6,
    )
  })
  it("a boosted team wins more often in simulations", () => {
    const run = (strengths: ReturnType<typeof simulationStrengths>) => {
      const totals = new Map(
        [...ALL_KO_TEAMS].map((t) => [t, emptyAggregate(t)]),
      )
      for (let i = 0; i < 1500; i++) runOneSimulation(strengths, totals)
      return totals.get("CFSS")!.finishes.champion
    }
    const base = run(simulationStrengths(fixed))
    const boosted = run(
      simulationStrengths(fixed, DEFAULT_PARAMS, {
        CFSS: { attack: 3, weakness: 0.3 },
      }),
    )
    expect(boosted).toBeGreaterThan(base)
  })
  it("shoot-out tilt moves the win chance between a coin flip and the expected-goals ratio", () => {
    expect(penaltyHomeChance(3, 1, 0)).toBe(0.5)
    expect(penaltyHomeChance(3, 1, 1)).toBeCloseTo(0.75)
    expect(penaltyHomeChance(3, 1, 0.5)).toBeCloseTo(0.625)
    const coin = pairPrediction(
      "CANADIAN",
      "SPCC",
      simulationStrengths(fixed, { ...DEFAULT_PARAMS, shootoutTilt: 0 }),
    )
    expect(coin.homeAdvances).toBeCloseTo(coin.home + coin.draw / 2, 9)
  })
})
