import { afterEach, describe, expect, it, vi } from "vitest"
import {
  GROUPS,
  KO_MATCHES,
  koById,
  koLoser,
  koWinner,
  slotTeam,
  standings,
} from "../lib/data"
import {
  penaltyNotes,
  tieNotes,
  validateQualifiers,
  validateResults,
} from "../lib/validation"
import { groupSeed, teamRecords } from "../lib/stats"
import {
  runOneSimulation,
  simulationStrengths,
  type SimAggregate,
} from "../lib/simulation"
import { ALL_KO_TEAMS } from "../lib/data"

const reset = () =>
  KO_MATCHES.forEach((m) => {
    delete m.score
    delete m.pens
  })
afterEach(() => {
  reset()
  vi.restoreAllMocks()
})

describe("group standings", () => {
  it("ranks Group 1 by points", () => {
    expect(
      standings(1)
        .map((r) => [r.team, r.pts])
        .slice(0, 2),
    ).toEqual([
      ["HKUGA", 7],
      ["LHYMSS", 5],
    ])
  })
  it("applies the ISFA disqualification deduction and excludes withdrawn CCHK", () => {
    const table = standings(2)
    expect(table.find((r) => r.team === "CCHK")).toBeUndefined()
    expect(table.find((r) => r.team === "ISFA")?.pts).toBe(0)
    expect(table.slice(0, 2).map((r) => r.team)).toEqual(["SKHLMC", "SPCC"])
  })
  it("breaks the Group 5 tie on goal difference", () => {
    const [, second, third] = standings(5)
    expect([second.team, third.team]).toEqual(["IKTMC", "SKWGSS"])
    expect(second.pts).toBe(third.pts)
    expect(tieNotes(5).join(" ")).toContain("goal difference")
  })
  it("describes the deduction", () => {
    expect(penaltyNotes(2)[0]).toContain("3 points deducted")
  })
})

describe("qualification", () => {
  it("matches the bracket to the computed group tables", () => {
    expect(validateQualifiers()).toEqual([])
  })
  it("seeds all 14 teams", () => {
    expect(ALL_KO_TEAMS.size).toBe(14)
    expect(groupSeed("HKUGA")).toBe("G1#1")
  })
})

describe("bracket progression", () => {
  it("has no known opponent for later rounds before results exist", () => {
    expect(slotTeam(koById("Q1").home)).toBe("SKHLMC")
    expect(slotTeam(koById("Q1").away)).toBeNull()
  })
  it("advances winners and sends semi-final losers to the third-place match", () => {
    koById("R1").score = [2, 1]
    expect(koWinner(koById("R1"))).toBe("IKTMC")
    expect(slotTeam(koById("Q1").away)).toBe("IKTMC")
    koById("R2").score = [0, 3]
    koById("R3").score = [1, 0]
    koById("Q2").score = [2, 0]
    koById("Q1").score = [1, 0]
    expect(slotTeam(koById("S1").home)).toBe("SKHLMC")
    koById("S1").score = [0, 1]
    expect(koLoser(koById("S1"))).toBe("SKHLMC")
    expect(slotTeam(koById("TP").home)).toBe("SKHLMC")
  })
  it("uses penalties to decide level matches", () => {
    koById("R1").score = [1, 1]
    expect(koWinner(koById("R1"))).toBeNull()
    koById("R1").pens = [3, 4]
    expect(koWinner(koById("R1"))).toBe("QC")
  })
})

describe("result validation", () => {
  it("accepts no results", () => expect(validateResults({})).toEqual([]))
  it("flags level scores without a shoot-out, unknown ids and early entries", () => {
    const issues = validateResults({
      R1: { score: [1, 1] },
      ZZ: { score: [1, 0] },
      Q2: { score: [1, 0] },
    })
    expect(issues.some((i) => i.includes("level"))).toBe(true)
    expect(issues.some((i) => i.includes("unknown"))).toBe(true)
    expect(issues.some((i) => i.includes("before both teams"))).toBe(true)
  })
  it("flags shoot-outs on decisive scores and tied shoot-outs", () => {
    const issues = validateResults({
      R1: { score: [2, 1], pens: [3, 2] },
      R2: { score: [1, 1], pens: [2, 2] },
    })
    expect(issues.some((i) => i.includes("not level"))).toBe(true)
    expect(issues.some((i) => i.includes("must have a winner"))).toBe(true)
  })
})

describe("team statistics and simulation", () => {
  it("counts completed group fixtures only", () => {
    const records = teamRecords()
    expect(records.find((r) => r.team === "CCHK")).toBeUndefined()
    const canadian = records.find((r) => r.team === "CANADIAN")!
    expect(canadian.gp).toBe(4)
    expect(canadian.w).toBe(4)
  })
  it("assigns every team exactly one finish per simulation", () => {
    const strengths = simulationStrengths()
    const aggregate = new Map<string, SimAggregate>(
      [...ALL_KO_TEAMS].map((team) => [
        team,
        {
          team,
          matches: 0,
          wins: 0,
          gf: 0,
          ga: 0,
          winRateSum: 0,
          finishes: {
            r14: 0,
            qf: 0,
            fourth: 0,
            third: 0,
            runnerUp: 0,
            champion: 0,
          },
        },
      ]),
    )
    const runs = 200
    for (let i = 0; i < runs; i++) runOneSimulation(strengths, aggregate)
    const total = (k: keyof SimAggregate["finishes"]) =>
      [...aggregate.values()].reduce((s, r) => s + r.finishes[k], 0)
    expect(total("champion")).toBe(runs)
    expect(total("runnerUp")).toBe(runs)
    expect(total("third")).toBe(runs)
    expect(total("fourth")).toBe(runs)
    expect(total("qf")).toBe(runs * 4)
    expect(total("r14")).toBe(runs * 6)
  })
  it("keeps completed results fixed in every simulation", () => {
    koById("R1").score = [3, 0]
    const strengths = simulationStrengths()
    const aggregate = new Map<string, SimAggregate>(
      [...ALL_KO_TEAMS].map((team) => [
        team,
        {
          team,
          matches: 0,
          wins: 0,
          gf: 0,
          ga: 0,
          winRateSum: 0,
          finishes: {
            r14: 0,
            qf: 0,
            fourth: 0,
            third: 0,
            runnerUp: 0,
            champion: 0,
          },
        },
      ]),
    )
    for (let i = 0; i < 50; i++) runOneSimulation(strengths, aggregate)
    expect(aggregate.get("QC")!.finishes.r14).toBe(50)
  })
  it("covers every group", () => expect(GROUPS).toHaveLength(7))
})
