import { koById, KO_MATCHES } from "./data"

/* ---------- Bracket geometry shared by the Knockout and Simulation tabs ---------- */

export const CARD_W = 292
export const CARD_H = 120
export const GAP = 56
export const U = 152
export const OFF = 12 // compact gap between round headings and the first bye card
export const EDGE_PAD = 28
export const colX = (c: number) => EDGE_PAD + c * (CARD_W + GAP)
export const BYE_H = 84
export const TOTAL_W = colX(3) + CARD_W + EDGE_PAD
export const TOTAL_H = 8 * U + OFF + 20

export function layout() {
  const pos: Record<string, { x: number; y: number }> = {}
  const leafY = (k: number) => k * U + U / 2 + OFF
  ;(["R1", "R2", "R3", "R4", "R5", "R6"] as const).forEach((id, i) => {
    pos[id] = { x: colX(0), y: leafY(i + 1) }
  })
  const mid = (a: number, b: number) => (a + b) / 2
  pos.Q1 = { x: colX(1), y: mid(leafY(0), pos.R1.y) }
  pos.Q2 = { x: colX(1), y: mid(pos.R2.y, pos.R3.y) }
  pos.Q3 = { x: colX(1), y: mid(pos.R4.y, pos.R5.y) }
  pos.Q4 = { x: colX(1), y: mid(pos.R6.y, leafY(7)) }
  pos.S1 = { x: colX(2), y: mid(pos.Q1.y, pos.Q2.y) }
  pos.S2 = { x: colX(2), y: mid(pos.Q3.y, pos.Q4.y) }
  pos.F = { x: colX(3), y: mid(pos.S1.y, pos.S2.y) }
  pos.TP = { x: colX(3), y: pos.F.y + U * 1.3 }
  return { pos, byeTop: leafY(0), byeBottom: leafY(7) }
}
export const { pos: POS, byeTop, byeBottom } = layout()

export const BYES = [
  { y: byeTop, to: "Q1", name: "SKHLMC", seed: "1st, Group 2" },
  { y: byeBottom, to: "Q4", name: "CANADIAN", seed: "1st, Group 5" },
]

/** Connector paths shared by the knockout bracket and the simulated bracket. */
export function bracketLines() {
  const lines: { d: string; dashed?: boolean }[] = []
  const link = (from: string, to: string, dashed = false, inset = 0) => {
    const a = POS[from],
      b = POS[to]
    const x1 = a.x + CARD_W,
      x2 = b.x
    const mx = x1 + GAP / 2 + inset
    lines.push({ d: `M${x1},${a.y} H${mx} V${b.y} H${x2}`, dashed })
  }
  ;[
    ["R1", "Q1"],
    ["R2", "Q2"],
    ["R3", "Q2"],
    ["R4", "Q3"],
    ["R5", "Q3"],
    ["R6", "Q4"],
    ["Q1", "S1"],
    ["Q2", "S1"],
    ["Q3", "S2"],
    ["Q4", "S2"],
    ["S1", "F"],
    ["S2", "F"],
  ].forEach(([a, b]) => link(a, b))
  link("S1", "TP", true, 14)
  link("S2", "TP", true, 14)
  for (const b of BYES) {
    const t = POS[b.to]
    const right = colX(0) + CARD_W
    lines.push({ d: `M${right},${b.y} H${right + GAP / 2} V${t.y} H${t.x}` })
  }
  return lines
}

export const TAG: Record<string, string> = {
  R1: "Round of 14 · Match 1",
  R2: "Round of 14 · Match 2",
  R3: "Round of 14 · Match 3",
  R4: "Round of 14 · Match 4",
  R5: "Round of 14 · Match 5",
  R6: "Round of 14 · Match 6",
  Q1: "Quarter-final 1",
  Q2: "Quarter-final 2",
  Q3: "Quarter-final 3",
  Q4: "Quarter-final 4",
  S1: "Semi-final 1",
  S2: "Semi-final 2",
  TP: "Third place",
  F: "Final",
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
export type Focus = { kind: "all" } | {
  kind: "phase"
  round: "R14" | "QF" | "SF" | "F"
} | { kind: "context"; id: string } | { kind: "match"; id: string }

export const PHASES: { round: "R14" | "QF" | "SF" | "F"; label: string }[] = [
  { round: "R14", label: "Round of 14" },
  { round: "QF", label: "Quarter-finals" },
  { round: "SF", label: "Semi-finals" },
  { round: "F", label: "Final" },
]
export const PHASE_IDS: Record<string, string[]> = {
  R14: ["R1", "R2", "R3", "R4", "R5", "R6"],
  QF: ["Q1", "Q2", "Q3", "Q4"],
  SF: ["S1", "S2"],
  F: ["F", "TP"],
}
export const roundOf = (id: string): "R14" | "QF" | "SF" | "F" => {
  const r = koById(id).round
  return r === "TP" ? "F" : r
}
export const cardRect = (id: string): Rect => ({
  x: POS[id].x,
  y: POS[id].y - CARD_H / 2 - 24,
  w: CARD_W,
  h: CARD_H + 24,
})
export function union(rs: Rect[]): Rect {
  const x1 = Math.min(...rs.map((r) => r.x)),
    y1 = Math.min(...rs.map((r) => r.y))
  const x2 = Math.max(...rs.map((r) => r.x + r.w)),
    y2 = Math.max(...rs.map((r) => r.y + r.h))
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}
export function focusRect(f: Focus): Rect {
  const pad = (r: Rect, p: number): Rect => ({
    x: r.x - p,
    y: r.y - p,
    w: r.w + 2 * p,
    h: r.h + 2 * p,
  })
  if (f.kind === "all") return { x: 0, y: 0, w: TOTAL_W, h: TOTAL_H }
  if (f.kind === "phase") {
    const r = union(PHASE_IDS[f.round].map(cardRect))
    if (f.round === "R14") return pad({ x: r.x, y: 0, w: r.w, h: TOTAL_H }, 24)
    return pad({ ...r, y: r.y - 28, h: r.h + 28 }, 24)
  }
  if (f.kind === "match") return pad(cardRect(f.id), 28)
  // context: the match, the matches feeding it and the match it feeds
  const m = koById(f.id)
  const ids = [f.id]
  ;[m.home, m.away].forEach((s) => s.kind === "winner" && ids.push(s.of))
  const next = KO_MATCHES.find((x) =>
    [x.home, x.away].some((s) => s.kind === "winner" && s.of === f.id),
  )
  if (next) ids.push(next.id)
  return pad(union(ids.map(cardRect)), 24)
}
export const focusLabel = (f: Focus) =>
  f.kind === "all"
    ? "Full bracket"
    : f.kind === "phase"
      ? PHASES.find((p) => p.round === f.round)!.label
      : f.kind === "match"
        ? `${TAG[f.id]} (match view)`
        : `${TAG[f.id]} (match path)`


const UPPER_HALF = new Set(['R1', 'R2', 'R3', 'Q1', 'Q2'])

/** Which half of the bracket a team starts in; teams in the same half can only meet once. */
export function bracketSide(team: string): 'upper' | 'lower' {
  const entry = KO_MATCHES.find(
    (m) =>
      (m.home.kind === 'team' && m.home.team === team) ||
      (m.away.kind === 'team' && m.away.team === team),
  )
  return entry && UPPER_HALF.has(entry.id) ? 'upper' : 'lower'
}
