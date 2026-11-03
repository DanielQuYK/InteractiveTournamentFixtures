import { describe, expect, it } from "vitest"
import { ALL_KO_TEAMS } from "../lib/data"
import {
  emptyAggregate,
  FINISHES,
  FINISH_SLOTS,
  formatMetric,
  probabilityInterval,
  runOneSimulation,
  SIM_METRICS,
  simulationStrengths,
} from "../lib/simulation"

describe("simulation reporting", () => {
  it("exposes exactly twelve selectable measures, with losses immediately after wins", () => {
    expect(SIM_METRICS).toHaveLength(12)
    expect(SIM_METRICS.map((m) => m.key).slice(0, 2)).toEqual([
      "wins",
      "losses",
    ])
  })
  it("derives losses and signed goal difference per simulation", () => {
    const r = {
      ...emptyAggregate("Test"),
      matches: 20,
      wins: 8,
      gf: 10,
      ga: 30,
      winRateSum: 3,
    }
    const value = (key: string) =>
      SIM_METRICS.find((m) => m.key === key)!.value(r, 10)
    expect(value("losses")).toBe(1.2)
    expect(value("gd")).toBe(-2)
    expect(value("winRate")).toBe(30)
    expect(formatMetric(SIM_METRICS.find((m) => m.key === "gd")!, -2)).toBe(
      "-2.00",
    )
  })
  it("computes bounded Wilson intervals including at zero and one hundred percent", () => {
    const zero = probabilityInterval(0, 100)
    const full = probabilityInterval(100, 100)
    expect(zero.low).toBeCloseTo(0)
    expect(zero.high).toBeGreaterThan(0)
    expect(full.high).toBeCloseTo(100)
    expect(full.low).toBeLessThan(100)
    const smaller = probabilityInterval(50, 100)
    const larger = probabilityInterval(5000, 10000)
    expect(larger.high - larger.low).toBeLessThan(smaller.high - smaller.low)
    expect(smaller.low).toBeCloseTo(40.383, 2)
  })
  it("keeps pie denominators consistent and accumulates per-run win rates", () => {
    const totals = new Map(
      [...ALL_KO_TEAMS].map((team) => [team, emptyAggregate(team)]),
    )
    const strengths = simulationStrengths()
    const count = 25
    for (let i = 0; i < count; i++) runOneSimulation(strengths, totals)
    for (const r of totals.values()) {
      expect(Object.values(r.finishes).reduce((a, b) => a + b, 0)).toBe(count)
      expect(r.winRateSum).toBeGreaterThanOrEqual(0)
      expect(r.winRateSum).toBeLessThanOrEqual(count)
    }
    for (const finish of FINISHES) {
      const total = [...totals.values()].reduce(
        (sum, r) => sum + r.finishes[finish.key],
        0,
      )
      expect(total).toBe(count * FINISH_SLOTS[finish.key])
    }
    expect([...totals.values()].reduce((sum, r) => sum + r.wins, 0)).toBe(
      count * 14,
    )
    expect(
      [...totals.values()].reduce((sum, r) => sum + r.matches - r.wins, 0),
    ).toBe(count * 14)
  })
})
