import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { MatchModal } from "../components/MatchModal"
import { MatchupScorelines } from "../components/MatchupScorelines"
import {
  ResultGrid,
  WinProbabilityBar,
} from "../components/MatchPredictionPanel"
import { ALL_KO_TEAMS } from "../lib/data"
import { pairPrediction, predictFixture } from "../lib/prediction"
import {
  emptyAggregate,
  fixedMatchIds,
  runOneSimulation,
  simulateMatch,
  simulationStrengths,
  type BracketTally,
  type MatchupTally,
} from "../lib/simulation"

const noop = () => {}

describe("full-time probabilities", () => {
  it("sums to one and describes a confirmed pairing", () => {
    const p = predictFixture("Q2")!
    expect(p.home + p.draw + p.away).toBeCloseTo(1, 6)
    expect(p.draw).toBeGreaterThan(0)
    expect(p.grid.flat().reduce((a: number, b: number) => a + b, 0)).toBeLessThanOrEqual(1)
    expect(p.homeAdvances).toBeGreaterThan(p.home)
    expect(p.homeAdvances).toBeLessThan(p.home + p.draw + 1e-9)
  })
  it("offers no probability unless both teams are confirmed", () => {
    expect(predictFixture("S1")).not.toBeNull() // IKTMC v KCC are both confirmed
    expect(predictFixture("S2")).toBeNull() // CFSS v the Quarter-final 4 winner
    expect(predictFixture("F")).toBeNull()
    expect(predictFixture("TP")).toBeNull()
    expect(predictFixture("R1")).not.toBeNull()
    expect(predictFixture("Q1")).not.toBeNull()
  })
  it("favours the stronger side", () => {
    const strengths = simulationStrengths()
    const p = pairPrediction("CANADIAN", "SPCC", strengths)
    expect(p.home).toBeGreaterThan(p.away)
  })
})

describe("HKSSF rules: no extra time", () => {
  it("sends every full-time draw straight to penalties, so draws are not reduced", () => {
    const strengths = simulationStrengths(fixedMatchIds("QF"))
    const expected = pairPrediction("HKUGA", "CANADIAN", strengths).draw
    let draws = 0
    const n = 20000
    for (let i = 0; i < n; i++) {
      const r = simulateMatch("Q4", "HKUGA", "CANADIAN", strengths)
      if (r.hg === r.ag) draws++
    }
    expect(Math.abs(draws / n - expected)).toBeLessThan(0.02)
  })
})

describe("probability displays", () => {
  it("offers the collapsed probability bar only for fixtures that have not been played", () => {
    const upcoming = renderToStaticMarkup(
      <MatchModal
        detail={{ kind: "ko", id: "Q2" }}
        onClose={noop}
        onTeam={noop}
      />,
    )
    expect(upcoming).toContain("Win and result probability")
    expect(upcoming).toContain('aria-expanded="false"')
    expect(upcoming).not.toContain("Result probability by score")
    const played = renderToStaticMarkup(
      <MatchModal
        detail={{ kind: "ko", id: "R1" }}
        onClose={noop}
        onTeam={noop}
      />,
    )
    expect(played).toContain("Win and result probability")
  })
  it("draws the win bar in green, grey and red", () => {
    const html = renderToStaticMarkup(
      <WinProbabilityBar
        homeLabel="A"
        awayLabel="B"
        home={0.5}
        draw={0.2}
        away={0.3}
      />,
    )
    expect(html).toContain("bg-emerald-600")
    expect(html).toContain("bg-stone-400")
    expect(html).toContain("bg-rose-500")
    expect(html).toContain("50.0%")
    expect(html).toContain("Draw (Penalties)")
  })
  it("renders a 6 × 6 result grid with small values flagged", () => {
    const grid = Array.from({ length: 6 }, (_, h) =>
      Array.from({ length: 6 }, (_, a) => (h === 1 && a === 2 ? 0.1 : 0.0001)),
    )
    const html = renderToStaticMarkup(
      <ResultGrid grid={grid} homeLabel="A" awayLabel="B" />,
    )
    expect(html.match(/role="cell"/g)).toHaveLength(36)
    expect(html).toContain("10.0%")
    expect(html).toContain("&lt;0.1%")
    expect(html).toContain("Goals (A)")
  })
  it("shows full-time win probability for simulated fixtures", () => {
    const aggregate = new Map(
      [...ALL_KO_TEAMS].map((t) => [t, emptyAggregate(t)]),
    )
    const brackets: BracketTally = new Map()
    const matchups: MatchupTally = new Map()
    const strengths = simulationStrengths(fixedMatchIds("R14"))
    for (let i = 0; i < 400; i++)
      runOneSimulation(strengths, aggregate, brackets, matchups)
    const run = {
      id: 1,
      createdAt: new Date(),
      count: 400,
      aggregates: [...aggregate.values()],
      brackets: [...brackets.values()],
      matchups: [...matchups.values()],
      startStage: "R14" as const,
    }
    const html = renderToStaticMarkup(
      <MatchupScorelines
        run={run}
        matchId="R1"
        home="IKTMC"
        away="QC"
        onClose={noop}
      />,
    )
    expect(html).toContain("Full-time win probability")
    expect(html).toContain("Most common scoreline")
    expect(html).toContain("Result probability")
    expect(html.match(/role="cell"/g)).toHaveLength(36)
    expect(html).toContain("Draw (Penalties)")
    expect(html).toContain("Goals (IKTMC)")
    expect(html).toContain("Penalty shoot-out win probability")
    expect(html).not.toContain("ring-amber-400")
    expect(html).not.toContain("NaN")
  })
})
