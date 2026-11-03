import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { CommonBracket } from "../components/CommonBracket"
import { MatchupScorelines } from "../components/MatchupScorelines"
import { ALL_KO_TEAMS } from "../lib/data"
import {
  emptyAggregate,
  runOneSimulation,
  simulationStrengths,
  type BracketTally,
  type MatchupTally,
  type SimulationRun,
} from "../lib/simulation"

function makeRun(count: number): SimulationRun {
  const aggregate = new Map(
    [...ALL_KO_TEAMS].map((t) => [t, emptyAggregate(t)]),
  )
  const brackets: BracketTally = new Map()
  const matchups: MatchupTally = new Map()
  const strengths = simulationStrengths()
  for (let i = 0; i < count; i++)
    runOneSimulation(strengths, aggregate, brackets, matchups)
  return {
    id: 1,
    createdAt: new Date(),
    count,
    aggregates: [...aggregate.values()],
    brackets: [...brackets.values()],
    matchups: [...matchups.values()],
  }
}

describe("most common bracket view", () => {
  it("withholds the bracket below the minimum run size", () => {
    const html = renderToStaticMarkup(<CommonBracket run={makeRun(200)} />)
    expect(html).toContain("at least 1,000")
    expect(html).not.toContain("Third place")
  })
  it("shows every round, the third-place match and winner margins at the threshold", () => {
    const html = renderToStaticMarkup(<CommonBracket run={makeRun(1000)} />)
    for (const label of [
      "Round of 14 · Match 6",
      "Quarter-final 4",
      "Semi-final 2",
      "Third place",
      "Final",
    ]) {
      expect(html).toContain(label)
    }
    expect(html).toMatch(/\+\d\.\d/)
    expect(html).toMatch(/\d+ of 1,000 runs/)
    expect(html).toContain("Full bracket")
    expect(html).toContain("Zoom in")
    expect(html).toContain("Find a team in the bracket")
    expect(html).not.toContain("NaN")
  })
})

describe("matchup scorelines", () => {
  it("records every simulated match once, oriented consistently", () => {
    const run = makeRun(400)
    const meetings = run.matchups.reduce(
      (total, r) =>
        total + Object.values(r.stages).reduce((t, s) => t + s.count, 0),
      0,
    )
    expect(meetings).toBe(400 * 14)
    for (const record of run.matchups) {
      expect(record.teams[0] < record.teams[1]).toBe(true)
      for (const stage of Object.values(record.stages)) {
        expect(Object.values(stage.scores).reduce((a, b) => a + b, 0)).toBe(
          stage.count,
        )
        expect(stage.wins[0] + stage.wins[1]).toBe(stage.count)
      }
    }
  })

  it("shows the most common scoreline for a fixed pairing", () => {
    const run = makeRun(300)
    const html = renderToStaticMarkup(
      <MatchupScorelines
        run={run}
        matchId="R1"
        home="IKTMC"
        away="QC"
        onClose={() => {}}
      />,
    )
    expect(html).toContain("Most common scoreline")
    expect(html).toContain("300")
    expect(html).toContain("Who won")
    expect(html).not.toContain("NaN")
  })

  it("explains a pairing that can meet at more than one stage", () => {
    const run = makeRun(2000)
    const multi = run.matchups.find((r) => Object.keys(r.stages).length > 1)
    expect(multi).toBeDefined()
    const html = renderToStaticMarkup(
      <MatchupScorelines
        run={run}
        matchId="F"
        home={multi!.teams[0]}
        away={multi!.teams[1]}
        onClose={() => {}}
      />,
    )
    expect(html).toContain("more than one stage")
    expect(html).toContain("All stages")
  })
})
