import { useState } from "react"
import { groupSeed } from "../lib/stats"
import { BYES } from "../lib/bracketLayout"
import {
  FINISHES,
  FINISH_SLOTS,
  SIM_METRICS,
  formatMetric,
  type FinishKey,
  type SimulationRun,
} from "../lib/simulation"

const COLORS = [
  "#047857",
  "#2563eb",
  "#b45309",
  "#be123c",
  "#7c3aed",
  "#0e7490",
  "#4d7c0f",
  "#c2410c",
  "#a21caf",
  "#4338ca",
  "#57534e",
  "#15803d",
  "#9f1239",
  "#854d0e",
]
type Slice = {
  label: string
  count: number
  color: string
}

export function SimulationCharts({ run }: { run: SimulationRun }) {
  const byeTeams = BYES.filter((b) => !b.pending).map((b) => b.name)
  const [mode, setMode] = useState<"bar" | "team" | "position">("bar")
  const [metricKey, setMetricKey] = useState("champion")
  const [finishMode, setFinishMode] = useState<"exact" | "orBetter">("orBetter")
  const [team, setTeam] = useState(run.aggregates[0].team)
  const [position, setPosition] = useState<FinishKey>("champion")
  const metric = SIM_METRICS.find((m) => m.key === metricKey)!
  const rec = run.aggregates.find((r) => r.team === team) ?? run.aggregates[0]
  const total = mode === "team" ? run.count : run.count * FINISH_SLOTS[position]
  const slices: Slice[] =
    mode === "team"
      ? FINISHES.map((f, i) => ({
          label: f.full,
          count: rec.finishes[f.key],
          color: COLORS[i],
        }))
      : [...run.aggregates]
          .sort((a, b) => b.finishes[position] - a.finishes[position])
          .map((r) => ({
            label: `${r.team} (${groupSeed(r.team)})`,
            count: r.finishes[position],
            color:
              COLORS[
                run.aggregates.findIndex((x) => x.team === r.team) %
                  COLORS.length
              ],
          }))

  return (
    <section className="glass-surface mt-6 rounded-xl border border-stone-200 bg-white p-4 sm:p-6">
      <h3 className="text-lg font-semibold">Explore the outcomes</h3>
      <p className="mt-1 text-xs text-stone-600">
        Charts use the entire selected run, independent of the table’s team
        filter.
      </p>
      <div
        className="my-4 flex flex-wrap gap-2"
        role="group"
        aria-label="Chart type"
      >
        {([
          ["bar", "Compare teams"],
          ["team", "One team’s finishes"],
          ["position", "One finishing position"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            aria-pressed={mode === key}
            className={`liquid rounded-full border px-4 py-2 text-sm ${
              mode === key
                ? "border-emerald-800 bg-emerald-800 text-white"
                : "border-stone-300 bg-white text-stone-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="mb-5 flex flex-wrap items-center gap-2 text-sm font-medium">
        {mode === "bar"
          ? "Statistic"
          : mode === "team"
            ? "Team"
            : "Finishing position"}
        {mode === "bar" ? (
          <select
            className="glass-control max-w-full rounded-lg border border-stone-300 px-3 py-2"
            value={metricKey}
            onChange={(e) => setMetricKey(e.target.value)}
          >
            {SIM_METRICS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        ) : mode === "team" ? (
          <select
            className="glass-control rounded-lg border border-stone-300 px-3 py-2"
            value={rec.team}
            onChange={(e) => setTeam(e.target.value)}
          >
            {run.aggregates.map((r) => (
              <option key={r.team} value={r.team}>
                {r.team} ({groupSeed(r.team)})
              </option>
            ))}
          </select>
        ) : (
          <select
            className="glass-control rounded-lg border border-stone-300 px-3 py-2"
            value={position}
            onChange={(e) => setPosition(e.target.value as FinishKey)}
          >
            {FINISHES.map((f) => (
              <option key={f.key} value={f.key}>
                {f.full}
              </option>
            ))}
          </select>
        )}
      </label>
      {mode === "bar" && metric.finish && (
        <div className="mb-5 rounded-lg border border-stone-200 bg-stone-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">
            How to count this finishing position
          </p>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Finishing position calculation"
          >
            <button
              onClick={() => setFinishMode("exact")}
              aria-pressed={finishMode === "exact"}
              className={`liquid rounded-full border px-3 py-1.5 text-sm ${
                finishMode === "exact"
                  ? "border-emerald-800 bg-emerald-800 text-white"
                  : "border-stone-300 bg-white text-stone-700"
              }`}
            >
              Finished exactly here
            </button>
            <button
              onClick={() => setFinishMode("orBetter")}
              aria-pressed={finishMode === "orBetter"}
              className={`liquid rounded-full border px-3 py-1.5 text-sm ${
                finishMode === "orBetter"
                  ? "border-emerald-800 bg-emerald-800 text-white"
                  : "border-stone-300 bg-white text-stone-700"
              }`}
            >
              Finished here or better
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-stone-600">
            <strong>Exactly here</strong> counts simulations where this was the
            team’s terminal result.
            <strong className="ml-1">Here or better</strong> also includes every
            higher finish. For example, {(FINISHES[1] ?? FINISHES[0]).full.toLowerCase()} or
            better includes {(FINISHES[1] ?? FINISHES[0]).full.toLowerCase()} exits and every higher finish.{" "}
            {FINISHES[0].full} or better is therefore 100% for every entered
            team{byeTeams.length > 0 ? `, including teams with byes; an exact ${FINISHES[0].full} exit remains 0% for ${byeTeams.join(" and ")}` : ""}.
          </p>
        </div>
      )}
      {mode === "bar" ? (
        <TeamBars run={run} metricKey={metricKey} finishMode={finishMode} />
      ) : (
        <>
          <p className="mb-5 text-sm text-stone-600">
            {mode === "team"
              ? `${rec.team}: each simulation gives this team exactly one finish. Total: ${total.toLocaleString()} finishes = ${run.count.toLocaleString()} simulations.`
              : `${FINISHES.find((f) => f.key === position)!.full}: ${FINISH_SLOTS[position]} ${
                  FINISH_SLOTS[position] === 1 ? "place" : "places"
                } per simulation × ${run.count.toLocaleString()} simulations = ${total.toLocaleString()} finishing slots. Percentages divide by this total, not by the number of simulations.`}
          </p>
          <OutcomePie
            slices={slices}
            total={total}
            title={
              mode === "team"
                ? `${rec.team}: finishing distribution`
                : "Team shares of finishing slots"
            }
          />
        </>
      )}
      {mode === "bar" && (
        <p className="mt-3 text-xs text-stone-600">
          {metric.unit === "percent"
            ? "Y-axis: percentage (%)."
            : "Y-axis: average per simulation."}{" "}
          X-axis: teams. Hover or focus a bar for its exact value. Negative goal
          differences extend below zero.
        </p>
      )}
    </section>
  )
}

export function TeamBars({
  run,
  metricKey,
  finishMode = "exact",
}: {
  run: SimulationRun
  metricKey: string
  finishMode?: "exact" | "orBetter"
}) {
  const metric = SIM_METRICS.find((m) => m.key === metricKey)!
  const chartLabel =
    metric.finish && finishMode === "orBetter"
      ? `${FINISHES.find((finish) => finish.key === metric.finish)!.full} or better`
      : metric.label
  const cumulativeFinishValue = (
    record: SimulationRun["aggregates"][number],
  ) => {
    if (!metric.finish || finishMode === "exact")
      return metric.value(record, run.count)
    const start = FINISHES.findIndex((finish) => finish.key === metric.finish!)
    const finishes = FINISHES.slice(start).reduce(
      (total, finish) => total + record.finishes[finish.key],
      0,
    )
    return (finishes / run.count) * 100
  }
  const points = [...run.aggregates]
    .sort((a, b) => a.team.localeCompare(b.team))
    .map((r) => ({ team: r.team, value: cumulativeFinishValue(r) }))
  const signed = metric.unit === "signed"
  const rawMin = Math.min(0, ...points.map((p) => p.value))
  const rawMax = Math.max(0, ...points.map((p) => p.value))
  // A signed measure always has both a positive and a negative axis region,
  // even in the unlikely case that every sampled team lands on one side.
  const extent = Math.max(Math.abs(rawMin), Math.abs(rawMax), 1)
  const min = signed ? -extent * 1.15 : 0
  const max = signed ? extent * 1.15 : Math.max(1, rawMax) * 1.15
  const width = 1120,
    height = 420,
    left = 70,
    right = 20,
    top = 25,
    bottom = 95
  const plotH = height - top - bottom
  const y = (v: number) => top + ((max - v) / (max - min)) * plotH
  const step = (width - left - right) / points.length
  const zero = y(0)
  const ticks = Array.from({ length: 5 }, (_, i) => min + ((max - min) * i) / 4)
  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[850px] w-full"
        role="img"
        aria-label={`${chartLabel} by team`}
      >
        <title>{`${chartLabel} by team`}</title>
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={left}
              x2={width - right}
              y1={y(t)}
              y2={y(t)}
              stroke="#e7e5e4"
            />
            <text
              x={left - 10}
              y={y(t) + 4}
              textAnchor="end"
              fontSize="11"
              fill="#57534e"
            >
              {t.toFixed(1)}
              {metric.unit === "percent" ? "%" : ""}
            </text>
          </g>
        ))}
        <line
          x1={left}
          x2={width - right}
          y1={zero}
          y2={zero}
          stroke="#78716c"
          strokeWidth="1.5"
        />
        {points.map((p, i) => {
          const x = left + step * i + step * 0.16
          return (
            <g
              key={p.team}
              tabIndex={0}
              role="img"
              aria-label={`${p.team}: ${formatMetric(metric, p.value)}`}
            >
              <title>{`${p.team} (${groupSeed(p.team)}): ${formatMetric(metric, p.value)}`}</title>
              <rect
                x={x}
                y={Math.min(y(p.value), zero)}
                width={step * 0.68}
                height={Math.max(1, Math.abs(zero - y(p.value)))}
                rx="3"
                fill={p.value < 0 ? "#be123c" : "#047857"}
              />
              <text
                x={x + step * 0.34}
                y={p.value < 0 ? y(p.value) + 15 : y(p.value) - 7}
                textAnchor="middle"
                fontSize="10"
                fill="#44403c"
              >
                {formatMetric(metric, p.value)}
              </text>
              <text
                transform={`translate(${x + step * 0.34}, ${height - bottom + 18}) rotate(-42)`}
                textAnchor="end"
                fontSize="11"
                fill="#44403c"
              >
                {p.team}
              </text>
            </g>
          )
        })}
        <text
          x="16"
          y={top + plotH / 2}
          transform={`rotate(-90,16,${top + plotH / 2})`}
          textAnchor="middle"
          fontSize="11"
          fill="#57534e"
        >
          {metric.unit === "percent"
            ? "Percentage (%)"
            : "Average per simulation"}
        </text>
        <text
          x={width / 2}
          y={height - 4}
          textAnchor="middle"
          fontSize="12"
          fill="#57534e"
        >
          Teams
        </text>
      </svg>
    </div>
  )
}

export function OutcomePie({
  slices,
  total,
  title,
}: {
  slices: Slice[]
  total: number
  title: string
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  let angle = -Math.PI / 2
  const cx = 150,
    cy = 150,
    radius = 120
  const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`
  return (
    <div className="grid items-start gap-6 md:grid-cols-[minmax(240px,320px)_1fr]">
      <svg
        viewBox="0 0 300 300"
        className="mx-auto w-full max-w-80"
        role="img"
        aria-label={title}
      >
        <title>{title}</title>
        {slices
          .filter((slice) => slice.count > 0)
          .map((slice) => {
            const start = angle
            const sweep = (slice.count / total) * Math.PI * 2
            angle += sweep
            const x1 = cx + radius * Math.cos(start),
              y1 = cy + radius * Math.sin(start)
            const x2 = cx + radius * Math.cos(angle),
              y2 = cy + radius * Math.sin(angle)
            const props = {
              fill: slice.color,
              stroke: "#fff",
              strokeWidth: 2,
              opacity: hovered && hovered !== slice.label ? 0.45 : 1,
              tabIndex: 0,
              onMouseEnter: () => setHovered(slice.label),
              onMouseLeave: () => setHovered(null),
              onFocus: () => setHovered(slice.label),
              onBlur: () => setHovered(null),
              "aria-label": `${slice.label}: ${pct(slice.count)}, ${slice.count} of ${total}`,
            }
            return slice.count === total ? (
              <circle key={slice.label} cx={cx} cy={cy} r={radius} {...props}>
                <title>{`${slice.label}: ${pct(slice.count)}`}</title>
              </circle>
            ) : (
              <path
                key={slice.label}
                d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${
                  sweep > Math.PI ? 1 : 0
                } 1 ${x2} ${y2} Z`}
                {...props}
              >
                <title>{`${slice.label}: ${pct(slice.count)}`}</title>
              </path>
            )
          })}
      </svg>
      <ul className="divide-y divide-stone-100 text-sm">
        {slices.map((slice) => (
          <li key={slice.label}>
            <button
              className="liquid flex w-full items-center gap-3 rounded px-2 py-2 text-left"
              onMouseEnter={() => setHovered(slice.label)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(slice.label)}
              onBlur={() => setHovered(null)}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ background: slice.color }}
              />
              <span className="flex-1">{slice.label}</span>
              <strong className="tabular-nums">{pct(slice.count)}</strong>
              <span className="text-xs tabular-nums text-stone-600">
                ({slice.count.toLocaleString()})
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
