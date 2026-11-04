import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import {
  OutcomePie,
  SimulationCharts,
  TeamBars,
} from "../components/SimulationCharts"
import { emptyAggregate, type SimulationRun } from "../lib/simulation"

const run: SimulationRun = {
  id: 1,
  createdAt: new Date(),
  count: 10,
  brackets: [],
  matchups: [],
  startStage: "R14",
  aggregates: [
    { ...emptyAggregate("HKUGA"), gf: 10, ga: 30 },
    { ...emptyAggregate("CANADIAN"), gf: 30, ga: 10 },
  ],
}

describe("simulation chart rendering", () => {
  it("offers all 12 metrics and three chart modes", () => {
    const html = renderToStaticMarkup(<SimulationCharts run={run} />)
    expect(html.match(/<option /g)).toHaveLength(12)
    expect(html).toContain("One team’s finishes")
    expect(html).toContain("One finishing position")
  })

  it("renders signed differences on both sides of a zero baseline", () => {
    const html = renderToStaticMarkup(<TeamBars run={run} metricKey="gd" />)
    expect(html).toContain("-2.00")
    expect(html).toContain("+2.00")
    expect(html).toContain("#be123c")
    expect(html).toContain("#047857")
    expect(html).not.toContain("NaN")
  })

  it("distinguishes an exact exit from that position or better", () => {
    const canadian = emptyAggregate("CANADIAN")
    canadian.finishes.champion = 10
    const finishRun = { ...run, aggregates: [canadian] }
    const exact = renderToStaticMarkup(
      <TeamBars run={finishRun} metricKey="r14" finishMode="exact" />,
    )
    const cumulative = renderToStaticMarkup(
      <TeamBars run={finishRun} metricKey="r14" finishMode="orBetter" />,
    )
    expect(exact).toContain("CANADIAN")
    expect(exact).toContain("0.0%")
    expect(cumulative).toContain("Round of 14 or better")
    expect(cumulative).toContain("100.0%")
  })

  it("handles a 100% pie slice and keeps zero categories labelled", () => {
    const html = renderToStaticMarkup(
      <OutcomePie
        total={10}
        title="Finishes"
        slices={[
          { label: "Champion", count: 10, color: "#047857" },
          { label: "Runner-up", count: 0, color: "#2563eb" },
        ]}
      />,
    )
    expect(html).toContain("<circle")
    expect(html).toContain("100.0%")
    expect(html).toContain("0.0%")
    expect(html).not.toContain("NaN")
  })
})
