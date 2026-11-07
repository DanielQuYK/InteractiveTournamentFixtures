import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { MatchupScorelines } from "../components/MatchupScorelines"
import {
  PredictionBody,
  ResultGrid,
  ShootoutBar,
  WinProbabilityBar,
} from "../components/MatchPredictionPanel"
import { ALL_KO_TEAMS, GROUP_MATCHES, KO_MATCHES, koById } from "../lib/data"
import { actualResult, pairPrediction, predictFixture } from "../lib/prediction"
import {
  emptyAggregate,
  fixedMatchIds,
  playedBefore,
  runOneSimulation,
  simulationStrengths,
  strengthsBefore,
  type BracketTally,
  type MatchupTally,
} from "../lib/simulation"

const sorted = (ids: Set<string>) => [...ids].sort()

describe("only information available before kick-off", () => {
  it("uses only results from strictly earlier days, never the match day itself", () => {
    for (const id of ["R1", "R2", "R3", "R4"]) expect(sorted(playedBefore(id))).toEqual([])
    expect(sorted(playedBefore("R5"))).toEqual(["R1", "R2", "R3", "R4"])
    expect(sorted(playedBefore("R6"))).toEqual(["R1", "R2", "R3", "R4"])
    expect(sorted(playedBefore("Q1"))).toEqual(["R1", "R2", "R3", "R4", "R5", "R6"])
    expect(sorted(playedBefore("Q2"))).toEqual(["R1", "R2", "R3", "R4", "R5", "R6"])
    expect(playedBefore("Q3").has("Q1")).toBe(true)
    expect(playedBefore("Q3").has("Q3")).toBe(false)
  })
  it("audits every match: nothing from its own day or later is ever included", () => {
    for (const m of KO_MATCHES) {
      for (const id of playedBefore(m.id)) {
        expect(koById(id).date < m.date).toBe(true)
        expect(id).not.toBe(m.id)
      }
    }
  })
  it("has every group game finished before the first knockout day", () => {
    const lastGroupDay = GROUP_MATCHES.map((g) => g.date).sort().at(-1)!
    const firstKnockoutDay = KO_MATCHES.map((k) => k.date).sort()[0]
    expect(lastGroupDay < firstKnockoutDay).toBe(true)
  })
  it("never uses the match itself or later results", () => {
    for (const id of ["R1", "R5", "Q1", "Q2"])
      expect(playedBefore(id).has(id)).toBe(false)
    expect(playedBefore("R6").has("Q1")).toBe(false)
  })
  it("limits a simulation's world to the results it applies", () => {
    expect(sorted(playedBefore("R5", new Set(["R1", "R6", "Q1"])))).toEqual([
      "R1",
    ])
    expect(sorted(playedBefore("Q2", fixedMatchIds("QF")))).toEqual(["R1", "R2", "R3", "R4", "R5", "R6"])
    expect(sorted(playedBefore("R5", fixedMatchIds("R14")))).toEqual([])
  })
  it("rates teams for a Round of 14 game from group results alone", () => {
    const before = strengthsBefore("R1")
    const groupOnly = simulationStrengths(new Set())
    for (const [team, r] of groupOnly.records)
      expect(before.records.get(team)).toEqual(r)
    const hindsight = simulationStrengths()
    expect(hindsight.records.get("IKTMC")).not.toEqual(
      before.records.get("IKTMC"),
    )
  })
  it("does not let a later result change an earlier match's probabilities", () => {
    const early = predictFixture("R6", strengthsBefore("R6"))!
    const again = predictFixture("R6", strengthsBefore("R6"))!
    expect(again.home).toBeCloseTo(early.home, 12)
    const leaked = predictFixture("R6", simulationStrengths())!
    expect(Math.abs(leaked.home - early.home)).toBeGreaterThan(1e-6)
  })
})

describe("highlighting what happened", () => {
  it("reports the actual outcome of played matches only", () => {
    expect(actualResult("R1")).toMatchObject({
      side: "home",
      score: [4, 1],
      winner: "IKTMC",
    })
    expect(actualResult("R3")).toMatchObject({ side: "away", winner: "ISS" })
    expect(actualResult("R5")).toMatchObject({
      side: "draw",
      winner: "SKHTSK",
      pens: [4, 5],
    })
    expect(actualResult("Q2")).toBeNull()
  })
  it("highlights the winning side on the win bar", () => {
    const html = renderToStaticMarkup(
      <WinProbabilityBar
        homeLabel="A"
        awayLabel="B"
        home={0.5}
        draw={0.2}
        away={0.3}
        actual={{ side: "away", score: [0, 1], winner: "B", pens: null }}
      />,
    )
    expect(html).toContain("ring-amber-400")
    expect(html.match(/ring-amber-400/g)!.length).toBeGreaterThanOrEqual(2)
    expect(html).toContain("Result")
    const none = renderToStaticMarkup(
      <WinProbabilityBar
        homeLabel="A"
        awayLabel="B"
        home={0.5}
        draw={0.2}
        away={0.3}
      />,
    )
    expect(none).not.toContain("ring-amber-400")
  })
  it("highlights the draw and explains the shoot-out when penalties decided it", () => {
    const html = renderToStaticMarkup(
      <WinProbabilityBar
        homeLabel="HW"
        awayLabel="SKHTSK"
        home={0.4}
        draw={0.3}
        away={0.3}
        actual={{ side: "draw", score: [1, 1], winner: "SKHTSK", pens: [4, 5] }}
      />,
    )
    expect(html).toContain("ring-amber-400")
    expect(html).toContain("SKHTSK won the shoot-out")
  })
  it("highlights exactly the scoreline that happened", () => {
    const grid = Array.from({ length: 6 }, () =>
      new Array<number>(6).fill(0.02),
    )
    const html = renderToStaticMarkup(
      <ResultGrid grid={grid} homeLabel="A" awayLabel="B" actual={[1, 1]} />,
    )
    expect(html.match(/ring-amber-400/g)).toHaveLength(1)
    expect(html).toContain("(actual result)")
    const outside = renderToStaticMarkup(
      <ResultGrid grid={grid} homeLabel="A" awayLabel="B" actual={[8, 0]} />,
    )
    expect(outside).not.toContain("ring-amber-400")
  })
  it("explains the data window and marks the result for a played match", () => {
    const prediction = pairPrediction("IKTMC", "QC", strengthsBefore("R1"))
    const html = renderToStaticMarkup(
      <PredictionBody
        homeLabel="IKTMC"
        awayLabel="QC"
        prediction={prediction}
        actual={actualResult("R1")}
        knockoutResultsUsed={0}
      />,
    )
    expect(html).toContain("only from information available before kick-off")
    expect(html).toContain("0 knockout results from earlier days")
    expect(html).toContain("ring-amber-400")
    const upcoming = renderToStaticMarkup(
      <PredictionBody
        homeLabel="A"
        awayLabel="B"
        prediction={prediction}
        actual={null}
        knockoutResultsUsed={7}
      />,
    )
    expect(upcoming).toContain("7 knockout results from earlier days")
    expect(upcoming).not.toContain("ring-amber-400")
  })
})

describe("simulation matches played in that world", () => {
  const build = () => {
    const aggregate = new Map(
      [...ALL_KO_TEAMS].map((t) => [t, emptyAggregate(t)]),
    )
    const brackets: BracketTally = new Map()
    const matchups: MatchupTally = new Map()
    const strengths = simulationStrengths(fixedMatchIds("QF"))
    for (let i = 0; i < 200; i++)
      runOneSimulation(strengths, aggregate, brackets, matchups)
    return {
      id: 1,
      createdAt: new Date(),
      count: 200,
      aggregates: [...aggregate.values()],
      brackets: [...brackets.values()],
      matchups: [...matchups.values()],
      startStage: "QF" as const,
    }
  }
  it("shows the result alongside pre-match probabilities with the actual outcome highlighted", () => {
    const html = renderToStaticMarkup(
      <MatchupScorelines
        run={build()}
        matchId="R6"
        home="HKUGA"
        away="SPCC"
        onClose={() => {}}
      />,
    )
    expect(html).toContain("Official result")
    expect(html).toContain("Full-time win probability")
    expect(html).toContain("Result probability")
    expect(html).toContain("ring-amber-400")
    expect(html).toContain("4 knockout results from earlier days")
    expect(html).not.toContain("Most common scoreline")
    expect(html).not.toContain("meetings")
  })
})

describe("penalty shoot-out probability bar", () => {
  const prediction = pairPrediction("HW", "SKHTSK", strengthsBefore("R5"))
  it("is a proper split of the shoot-out chance", () => {
    expect(prediction.penaltyHome).toBeGreaterThan(0)
    expect(prediction.penaltyHome).toBeLessThan(1)
    expect(prediction.homeAdvances).toBeCloseTo(prediction.home + prediction.draw * prediction.penaltyHome, 12)
  })
  it("is greyed out, with no highlight, for a match settled in normal time", () => {
    const html = renderToStaticMarkup(
      <ShootoutBar homeLabel="IKTMC" awayLabel="QC" prediction={prediction} actual={actualResult("R1")} />,
    )
    expect(html).toContain("opacity-50 grayscale")
    expect(html).not.toContain("ring-amber-400")
    expect(html).toContain("not needed")
  })
  it("highlights the side that won the shoot-out", () => {
    const html = renderToStaticMarkup(
      <ShootoutBar homeLabel="HW" awayLabel="SKHTSK" prediction={prediction} actual={actualResult("R5")} />,
    )
    expect(html).not.toContain("grayscale")
    expect(html.match(/ring-amber-400/g)!.length).toBeGreaterThanOrEqual(2)
    expect(html).toContain("Result")
    expect(html.indexOf("SKHTSK wins shoot-out")).toBeLessThan(html.indexOf("Result"))
  })
  it("is plain, with no highlight, for a match that has not been played", () => {
    const html = renderToStaticMarkup(<ShootoutBar homeLabel="A" awayLabel="B" prediction={prediction} actual={null} />)
    expect(html).not.toContain("grayscale")
    expect(html).not.toContain("ring-amber-400")
  })
  it("appears for played, penalty and unplayed matches in the shared panel", () => {
    const render = (id: string, home: string, away: string, used: number) =>
      renderToStaticMarkup(
        <PredictionBody homeLabel={home} awayLabel={away} prediction={predictFixture(id, strengthsBefore(id))!} actual={actualResult(id)} knockoutResultsUsed={used} />,
      )
    const normal = render("R1", "IKTMC", "QC", 0)
    expect(normal).toContain("Penalty shoot-out win probability")
    expect(normal).toContain("decided in normal time")
    const pens = render("R5", "HW", "SKHTSK", 4)
    expect(pens).toContain("It went to penalties: SKHTSK won 5–4")
    const upcoming = render("Q2", "KCC", "ISS", 6)
    expect(upcoming).toContain("Penalty shoot-out win probability")
    expect(upcoming).not.toContain("decided in normal time")
    expect(upcoming).not.toContain("ring-amber-400")
  })
})
