import { KO_MATCHES, ROUND_NAME, koById, perDivision, type KoMatch } from "./data"
import { liveArray, liveRecord } from "./live"

/* ---------- Bracket geometry shared by the Knockout and Simulation tabs ---------- */

export const CARD_W = 292
export const CARD_H = 120
export const GAP = 56
export const U = 152
export const OFF = 12 // compact gap between round headings and the first bye card
export const EDGE_PAD = 28
export const colX = (c: number) => EDGE_PAD + c * (CARD_W + GAP)
export const BYE_H = 84

type Round = "R14" | "QF" | "SF" | "F"
const ROUNDS: Round[] = ["R14", "QF", "SF", "F"]

interface Bye {
  y: number
  to: string
  name: string
  seed: string
  pending: boolean
  slot: "home" | "away"
}

interface Layout {
  pos: Record<string, { x: number; y: number }>
  byes: Bye[]
  rounds: Round[]
  width: number
  height: number
}

/**
 * Derives the bracket geometry from how the matches feed each other, so a 4, 8 or 12-team
 * bracket (with or without byes) is laid out by the same rules. A match with no feeder is a leaf;
 * a seeded place in a match that also has a feeder is a bye drawn one column to the left.
 */
const layoutFor = perDivision((): Layout => {
  const tree = KO_MATCHES.filter((m) => m.round !== "TP" && m.round !== "PO")
  const rounds = ROUNDS.filter((r) => r === "F" || tree.some((m) => m.round === r))
  const col = (m: KoMatch) => rounds.indexOf(m.round as Round)
  const pos: Layout["pos"] = {}
  const byes: Bye[] = []
  let leaf = 0
  const leafY = () => leaf++ * U + U / 2 + OFF
  const place = (m: KoMatch): number => {
    const feeders = [m.home, m.away].map((s) => (s.kind === "winner" ? koById(s.of) : null))
    let y: number
    if (!feeders[0] && !feeders[1]) {
      y = leafY()
    } else {
      const ys = (["home", "away"] as const).map((side, i) => {
        const f = feeders[i]
        if (f) return place(f)
        const slot = m[side]
        const by = leafY()
        byes.push({
          y: by,
          to: m.id,
          name: slot.kind === "team" ? slot.team : "",
          seed: slot.kind === "team" || slot.kind === "pending" ? slot.seed.replace(" – bye", "") : "",
          pending: slot.kind !== "team",
          slot: side,
        })
        return by
      })
      y = (ys[0] + ys[1]) / 2
    }
    pos[m.id] = { x: colX(col(m)), y }
    return y
  }
  place(koById("F"))
  const final = pos.F
  const tp = KO_MATCHES.find((m) => m.round === "TP")
  let bottom = Math.max(...Object.values(pos).map((p) => p.y))
  if (tp) {
    pos[tp.id] = { x: final.x, y: final.y + U * 1.3 }
    bottom = Math.max(bottom, pos[tp.id].y)
  }
  const po = KO_MATCHES.find((m) => m.round === "PO")
  if (po) {
    pos[po.id] = { x: final.x, y: (tp ? pos[tp.id].y : final.y) + U * 1.3 }
    bottom = Math.max(bottom, pos[po.id].y)
  }
  return {
    pos,
    byes,
    rounds,
    width: colX(rounds.length - 1) + CARD_W + EDGE_PAD,
    height: Math.max(leaf * U + OFF + 20, bottom + CARD_H / 2 + 44),
  }
})

export const POS: Record<string, { x: number; y: number }> = liveRecord(() => layoutFor().pos)
export const BYES: Bye[] = liveArray(() => layoutFor().byes)
export const totalW = () => layoutFor().width
export const totalH = () => layoutFor().height

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
  for (const m of KO_MATCHES) {
    for (const s of [m.home, m.away]) {
      if (s.kind === "winner") link(s.of, m.id)
      else if (s.kind === "loser") link(s.of, m.id, true, 14)
    }
  }
  for (const b of BYES) {
    const t = POS[b.to]
    const right = colX(0) + CARD_W
    lines.push({ d: `M${right},${b.y} H${right + GAP / 2} V${t.y} H${t.x}` })
  }
  return lines
}

const tags = perDivision(() => {
  const tag: Record<string, string> = {}
  const count: Record<string, number> = {}
  for (const m of KO_MATCHES) {
    count[m.round] = (count[m.round] ?? 0) + 1
    const n = count[m.round]
    tag[m.id] =
      m.round === "R14" ? `${ROUND_NAME.R14} · Match ${n}`
      : m.round === "QF" ? `Quarter-final ${n}`
      : m.round === "SF" ? `Semi-final ${n}`
      : m.round === "TP" ? "Third place"
      : m.round === "PO" ? "Group third-place play-off"
      : "Final"
  }
  return tag
})
export const TAG: Record<string, string> = liveRecord(tags)

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
export type Focus = { kind: "all" } | {
  kind: "phase"
  round: Round
} | { kind: "context"; id: string } | { kind: "match"; id: string }

const phases = perDivision(() => {
  const labels: Record<Round, string> = { R14: ROUND_NAME.R14, QF: "Quarter-finals", SF: "Semi-finals", F: "Final" }
  return layoutFor().rounds.map((round) => ({ round, label: labels[round] }))
})
export const PHASES: { round: Round; label: string }[] = liveArray(phases)

export const PHASE_IDS: Record<string, string[]> = liveRecord(
  perDivision(() => {
    const ids: Record<string, string[]> = {}
    for (const m of KO_MATCHES) {
      const key = m.round === "TP" || m.round === "PO" ? "F" : m.round
      ;(ids[key] ??= []).push(m.id)
    }
    return ids
  }),
)
export const roundOf = (id: string): Round => {
  const r = koById(id).round
  return r === "TP" || r === "PO" ? "F" : r
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
  if (f.kind === "all") return { x: 0, y: 0, w: totalW(), h: totalH() }
  if (f.kind === "phase") {
    const r = union(PHASE_IDS[f.round].map(cardRect))
    if (f.round === PHASES[0].round) return pad({ x: r.x, y: 0, w: r.w, h: totalH() }, 24)
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


/** Which half of the bracket a team starts in; teams in the same half can only meet once. */
export function bracketSide(team: string): 'upper' | 'lower' {
  const entry = KO_MATCHES.find(
    (m) =>
      (m.home.kind === 'team' && m.home.team === team) ||
      (m.away.kind === 'team' && m.away.team === team),
  )
  return entry && entry.round !== 'PO' && POS[entry.id].y < POS.F.y ? 'upper' : 'lower'
}
