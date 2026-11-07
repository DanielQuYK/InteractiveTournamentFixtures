import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { KO_MATCHES, VENUES, VENUE_SHORT, koById, koWinner, noOrphan, slotTeam } from "../lib/data"
import { AppliedResults } from "../components/AppliedResults"
import { SimulationParameters } from "../components/SimulationParameters"
import { useModelSettings } from "../lib/useModelSettings"
import type { StartStage } from "../lib/simulation"
import { validateResults } from "../lib/validation"
import { knockoutTeamState } from "../components/Knockout"
import { MatchModal } from "../components/MatchModal"
import { TeamPanel } from "../components/TeamPanel"
import {
  emptyAggregate,
  fixedMatchIds,
  latestStartStage,
  officialScore,
  runOneSimulation,
  simulationStrengths,
  startStageOptions,
} from "../lib/simulation"
import { ALL_KO_TEAMS } from "../lib/data"

const noop = () => {}
function Parameters({ stage }: { stage: StartStage }) {
  return <SimulationParameters stage={stage} settings={useModelSettings()} />
}
const simulate = (stage: "R14" | "QF", runs: number) => {
  const totals = new Map([...ALL_KO_TEAMS].map((t) => [t, emptyAggregate(t)]))
  const strengths = simulationStrengths(fixedMatchIds(stage))
  for (let i = 0; i < runs; i++) runOneSimulation(strengths, totals)
  return totals
}

describe("Round of 14 results", () => {
  it("records every Round of 14 result and resolves the quarter-final line-up", () => {
    expect(validateResults()).toEqual([])
    expect(["R1", "R2", "R3", "R4", "R5", "R6"].map((id) => koWinner(koById(id)))).toEqual([
      "IKTMC", "KCC", "ISS", "CFSS", "SKHTSK", "HKUGA",
    ])
    const lineup = ["Q1", "Q2", "Q3", "Q4"].map((id) => [slotTeam(koById(id).home), slotTeam(koById(id).away)])
    expect(lineup).toEqual([
      ["SKHLMC", "IKTMC"], ["KCC", "ISS"], ["CFSS", "SKHTSK"], ["HKUGA", "CANADIAN"],
    ])
  })
  it("records IKTMC's reported quarter-final win as awaiting confirmation", () => {
    const q1 = koById("Q1")
    expect(q1.score).toEqual([0, 2])
    expect(q1.scoreTbc).toBe(true)
    expect(koWinner(q1)).toBe("IKTMC")
    expect(slotTeam(koById("S1").home)).toBe("IKTMC")
  })
  it("records the confirmed HW v SKHTSK scoreline with its penalties", () => {
    const r5 = koById("R5")
    expect(r5.score).toEqual([1, 1])
    expect(r5.pens).toEqual([4, 5])
    expect(r5.scoreTbc).toBeUndefined()
    expect(koWinner(r5)).toBe("SKHTSK")
    expect(officialScore(r5)).toEqual([1, 1])
  })
  it("uses the amended Quarter-final 4 fixture", () => {
    const q4 = koById("Q4")
    expect(q4.date).toBe("2026-11-10")
    expect(q4.time).toBe("3:00 PM")
    expect(q4.venue).toBe("HV")
  })
  it("marks beaten teams as eliminated and others as still in", () => {
    for (const team of ["QC", "LHYMSS", "SJA", "KWSC", "HW", "SPCC"]) {
      expect(knockoutTeamState(team).eliminated).toBe(true)
    }
    expect(knockoutTeamState("QC").target.id).toBe("R1")
    expect(knockoutTeamState("HW").target.id).toBe("R5")
    expect(knockoutTeamState("SKHLMC").eliminated).toBe(true)
    expect(knockoutTeamState("SKHLMC").target.id).toBe("Q1")
    for (const [team, next] of [["IKTMC", "S1"], ["SKHTSK", "Q3"], ["CANADIAN", "Q4"]]) {
      const state = knockoutTeamState(team)
      expect(state.eliminated).toBe(false)
      expect(state.target.id).toBe(next)
    }
  })
})

describe("starting stage", () => {
  it("offers the Round of 14 and quarter-finals, with the quarter-finals as latest", () => {
    const options = startStageOptions()
    expect(options.map((o) => [o.stage, o.enabled])).toEqual([["R14", true], ["QF", true], ["SF", false], ["F", false]])
    expect(options.find((o) => o.recommended)?.stage).toBe("QF")
    expect(latestStartStage()).toBe("QF")
    expect(fixedMatchIds("R14").size).toBe(0)
    expect([...fixedMatchIds("QF")].sort()).toEqual(["Q1", "R1", "R2", "R3", "R4", "R5", "R6"])
  })
  it("fixes the official Round of 14 when starting from the quarter-finals", () => {
    const totals = simulate("QF", 100)
    expect(totals.get("QC")!.finishes.r14).toBe(100)
    expect(totals.get("HW")!.finishes.r14).toBe(100)
    expect(totals.get("IKTMC")!.finishes.r14).toBe(0)
    expect(totals.get("SKHLMC")!.finishes.qf).toBe(100)
    expect(totals.get("IKTMC")!.finishes.qf).toBe(0)
    expect(KO_MATCHES.length).toBe(14)
  })
  it("pretends nothing happened when starting from the Round of 14", () => {
    const totals = simulate("R14", 600)
    expect(totals.get("QC")!.finishes.r14).toBeLessThan(600)
    expect(totals.get("IKTMC")!.finishes.r14).toBeGreaterThan(0)
  })
  it("counts knockout evidence for the ratings only when those matches are fixed", () => {
    const from = simulationStrengths(fixedMatchIds("QF")).records.get("HKUGA")!
    const without = simulationStrengths(fixedMatchIds("R14")).records.get("HKUGA")!
    expect(from.attack).toBeGreaterThan(without.attack)
  })
})

describe("two possible teams on both sides", () => {
  it("shows the confirmed team and the two remaining candidates in Semi-final 1", () => {
    const html = renderToStaticMarkup(<MatchModal detail={{ kind: "ko", id: "S1" }} onClose={noop} onTeam={noop} />)
    for (const team of ["IKTMC", "KCC", "ISS"]) expect(html).toContain(team)
    expect(html).toContain("Beat SKHLMC 2–0*")
    expect(html).toContain("Quarter-final 2")
  })
  it("keeps the final and third-place match generic until both feeder matches have teams", () => {
    const html = renderToStaticMarkup(<MatchModal detail={{ kind: "ko", id: "F" }} onClose={noop} onTeam={noop} />)
    expect(html).toContain("Winner of Semi-final 1")
    expect(html).toContain("Winner of Semi-final 2")
    expect(html).not.toContain("Win and result probability")
  })
  it("shows an eliminated team's status and confirmed result", () => {
    const hw = renderToStaticMarkup(<TeamPanel team="HW" onClose={noop} onTeam={noop} />)
    expect(hw).toContain("Eliminated")
    expect(hw).toContain("1 – 1")
    expect(hw).toContain("Pens 4 – 5")
    expect(hw).not.toContain("Score to be confirmed")
    expect(hw).not.toContain("1 – 1*")
    const through = renderToStaticMarkup(<TeamPanel team="IKTMC" onClose={noop} onTeam={noop} />)
    expect(through).toContain("Still in the competition")
    expect(through).toContain("Quarter-final")
  })
})

describe("match details", () => {
  it("keeps the confirmed penalty result on one row without an asterisk", () => {
    const html = renderToStaticMarkup(<MatchModal detail={{ kind: "ko", id: "R5" }} onClose={noop} onTeam={noop} />)
    expect(html).toContain("1 : 1")
    expect(html).toContain("Pens 4 : 5")
    expect(html).toContain("SKHTSK won 5–4 on penalties after a 1–1 full-time score")
    expect(html).not.toContain("Score to be confirmed")
    expect(html).not.toContain("*")
    expect(html).toMatch(/whitespace-nowrap text-3xl/)
    const confirmed = renderToStaticMarkup(<MatchModal detail={{ kind: "ko", id: "R1" }} onClose={noop} onTeam={noop} />)
    expect(confirmed).toContain("4 : 1")
    expect(confirmed).not.toContain("*")
  })
  it("colours winners green and losers red", () => {
    const html = renderToStaticMarkup(<MatchModal detail={{ kind: "ko", id: "R1" }} onClose={noop} onTeam={noop} />)
    expect(html).toContain("bg-emerald-100")
    expect(html).toContain("bg-rose-100")
  })
  it("uses the same group wording for byes and qualifiers, with the beaten team below", () => {
    const html = renderToStaticMarkup(<MatchModal detail={{ kind: "ko", id: "Q1" }} onClose={noop} onTeam={noop} />)
    expect(html).toContain("1st, Group 2")
    expect(html).toContain("2nd, Group 5")
    expect(html).toContain("BYE")
    expect(html).toContain("Winner of Round of 14")
    expect(html).toContain("Beat QC 4–1")
    expect(html).not.toContain("G5#2")
    const q3 = renderToStaticMarkup(<MatchModal detail={{ kind: "ko", id: "Q3" }} onClose={noop} onTeam={noop} />)
    expect(q3).toContain("Beat HW 1–1 (5–4 pens)")
    expect(q3).not.toContain("pens)*")
    expect(q3).toContain("Beat KWSC 3–2")
  })
  it("never leaves a lone word of a venue name on its own row", () => {
    expect(VENUES.AB).toContain("Ground\u00A0(Artificial\u00A0Turf)")
    expect(VENUES.HV.endsWith("Ground\u00A0No.\u00A04")).toBe(true)
    expect(VENUE_SHORT.AB).toBe("Aberdeen\u00A0Sports\u00A0Ground")
    expect(noOrphan("A B")).toBe("A\u00A0B")
  })
})

describe("simulation panels", () => {
  it("shows the official results applied, coloured, for the chosen stage", () => {
    const html = renderToStaticMarkup(<AppliedResults stage="QF" />)
    expect(html).toContain("IKTMC")
    expect(html).toContain("bg-emerald-100")
    expect(html).toContain("bg-rose-100")
    expect(html).toContain(">1<")
    expect(html).toContain("(5)")
    expect(html).toContain("Score to be confirmed")
    expect(html).toContain("0*")
    expect(html).toContain("2*")
    expect(renderToStaticMarkup(<AppliedResults stage="R14" />)).toContain("No official results are applied")
  })
  it("states which data the ratings use for the chosen starting stage", () => {
    const fromR14 = renderToStaticMarkup(<Parameters stage="R14" />)
    expect(fromR14).toContain("group-stage matches only")
    expect(fromR14).toContain("not used from this stage")
    const fromQf = renderToStaticMarkup(<Parameters stage="QF" />)
    expect(fromQf).toContain("plus 7 official knockout result")
  })
  it("lists model parameters and per-team reasons, with editing off until switched on", () => {
    const html = renderToStaticMarkup(<Parameters stage="QF" />)
    expect(html).toContain("Home (first-named) advantage")
    expect(html).toContain("Knockout result weight")
    expect(html).toContain("Edit parameters")
    expect(html).not.toContain("coming soon")
    expect(html).toContain("Reset all to defaults")
    expect(html).toMatch(/aria-label="Home \(first-named\) advantage"[^>]*disabled/)
    expect(html).toContain("Why these values")
    expect(html).toContain("HKUGA")
    expect(html).not.toContain("NaN")
  })
})
