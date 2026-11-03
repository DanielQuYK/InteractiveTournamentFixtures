import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { usePersistentState, usePrefersReducedMotion } from "../lib/hooks"
import {
  PHASES,
  PHASE_IDS,
  TOTAL_H,
  TOTAL_W,
  bracketLines,
  colX,
  focusLabel,
  focusRect,
  roundOf,
  type Focus,
} from "../lib/bracketLayout"

type Round = "R14" | "QF" | "SF" | "F"
const LINES = bracketLines()

/**
 * Zoom and pan engine shared by every bracket in the app: full bracket → phase →
 * match zooming, with the zoom ratio chosen from what is being shown.
 */
export function useBracketZoom(storageKey: string) {
  const [focus, setFocus] = usePersistentState<Focus>(`${storageKey}-focus`, { kind: "all" })
  const [lastRound, setLastRound] = usePersistentState<Round>(`${storageKey}-last-round`, "R14")
  const [size, setSize] = useState({ w: 1000, h: 640 })
  const vp = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const el = vp.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const rect = focusRect(focus)
  // Fit the focus to the window within limits that keep text legible
  // (tall phases scroll rather than shrink).
  const fit = Math.min(size.w / rect.w, size.h / rect.h)
  const fullScale = Math.min(size.w / TOTAL_W, 1)
  const scale =
    focus.kind === "all"
      ? fullScale
      : focus.kind === "phase"
        ? Math.min(1.35, Math.max(fit, 0.85))
        : Math.min(fit, focus.kind === "match" ? 1.7 : 1.25)

  useEffect(() => {
    const el = vp.current
    if (!el) return
    const left = (rect.x + rect.w / 2) * scale - size.w / 2
    const top = rect.h * scale > size.h ? rect.y * scale : (rect.y + rect.h / 2) * scale - size.h / 2
    el.scrollTo({
      left: Math.max(0, left),
      top: Math.max(0, top),
      behavior: reducedMotion ? "auto" : "smooth",
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, scale, size.w, size.h])

  const go = (f: Focus) => {
    if (f.kind === "phase") setLastRound(f.round)
    if (f.kind === "context" || f.kind === "match") setLastRound(roundOf(f.id))
    setFocus(f)
  }
  // Zoom in narrows the subject (bracket → phase → match). Zoom out widens the
  // context differently (match → surrounding path → phase → bracket).
  const zoomIn = () => {
    if (focus.kind === "all") go({ kind: "phase", round: lastRound })
    else if (focus.kind === "phase") go({ kind: "match", id: PHASE_IDS[focus.round][0] })
    else if (focus.kind === "context") go({ kind: "match", id: focus.id })
  }
  const zoomOut = () => {
    if (focus.kind === "match") go({ kind: "context", id: focus.id })
    else if (focus.kind === "context") go({ kind: "phase", round: roundOf(focus.id) })
    else if (focus.kind === "phase") go({ kind: "all" })
  }
  const zoomRef = useRef({ zoomIn, zoomOut })
  zoomRef.current = { zoomIn, zoomOut }
  useEffect(() => {
    const el = vp.current
    if (!el) return
    let last = 0
    const wheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      const now = Date.now()
      if (now - last < 450) return
      last = now
      e.deltaY < 0 ? zoomRef.current.zoomIn() : zoomRef.current.zoomOut()
    }
    el.addEventListener("wheel", wheel, { passive: false })
    return () => el.removeEventListener("wheel", wheel)
  }, [])

  return {
    focus,
    go,
    zoomIn,
    zoomOut,
    canIn: focus.kind !== "match",
    canOut: focus.kind !== "all",
    scale,
    fullScale,
    vp,
    reducedMotion,
  }
}

export type BracketZoom = ReturnType<typeof useBracketZoom>

const chip = (active: boolean) =>
  `liquid rounded-full border px-3.5 py-1.5 text-sm ${
    active ? "border-emerald-800 bg-emerald-800 text-white" : "border-stone-300 bg-white"
  }`

export function BracketToolbar({ zoom }: { zoom: BracketZoom }) {
  const { focus, go, zoomIn, zoomOut, canIn, canOut, scale, fullScale } = zoom
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="flex overflow-hidden rounded-lg border border-stone-300 bg-white">
        <button
          onClick={zoomOut}
          disabled={!canOut}
          aria-label="Zoom out"
          title="Zoom out: widen the context"
          className="liquid flex h-11 w-11 items-center justify-center text-stone-700 disabled:opacity-35 sm:h-9 sm:w-10"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M5 7h4M10.5 10.5L14 14" />
          </svg>
        </button>
        <button
          onClick={zoomIn}
          disabled={!canIn}
          aria-label="Zoom in"
          title="Zoom in: focus on a phase, then a match"
          className="liquid flex h-11 w-11 items-center justify-center border-l border-stone-300 text-stone-700 disabled:opacity-35 sm:h-9 sm:w-10"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M5 7h4M7 5v4M10.5 10.5L14 14" />
          </svg>
        </button>
      </div>
      <button onClick={() => go({ kind: "all" })} className={chip(focus.kind === "all")}>
        Full bracket
      </button>
      {PHASES.map((p) => (
        <button
          key={p.round}
          onClick={() => go({ kind: "phase", round: p.round })}
          className={chip(focus.kind === "phase" && focus.round === p.round)}
        >
          {p.label}
        </button>
      ))}
      <span className="ml-auto text-xs text-stone-500">
        Viewing: <span className="font-medium text-stone-700">{focusLabel(focus)}</span> ·{" "}
        {Math.round((scale / fullScale) * 100)}%
      </span>
    </div>
  )
}

/** The scrollable, zoomable canvas. Children are positioned in bracket coordinates. */
export function BracketViewport({ zoom, children }: { zoom: BracketZoom; children: ReactNode }) {
  const { focus, scale, vp, reducedMotion } = zoom
  return (
    <div
      ref={vp}
      className="relative overflow-auto rounded-xl border border-stone-200 bg-white"
      style={{ height: focus.kind === "all" ? TOTAL_H * scale : "min(72vh, 700px)" }}
    >
      <div
        style={{
          width: TOTAL_W * scale,
          height: TOTAL_H * scale,
          transition: reducedMotion ? "none" : "width .5s, height .5s",
        }}
      >
        <div
          className="relative origin-top-left"
          style={{
            width: TOTAL_W,
            height: TOTAL_H,
            transform: `scale(${scale})`,
            transition: reducedMotion ? "none" : "transform .6s cubic-bezier(.22,.8,.3,1)",
          }}
        >
          {PHASES.map((p, c) => (
            <div
              key={p.round}
              className="absolute text-xs font-semibold uppercase tracking-widest text-stone-500"
              style={{ left: colX(c), top: 14 }}
            >
              {p.label}
            </div>
          ))}
          <svg className="absolute inset-0" width={TOTAL_W} height={TOTAL_H} fill="none" aria-hidden="true">
            {LINES.map((l, i) => (
              <path
                key={i}
                d={l.d}
                stroke={l.dashed ? "#a8a29e" : "#78716c"}
                strokeWidth={1.5}
                strokeDasharray={l.dashed ? "5 5" : undefined}
              />
            ))}
          </svg>
          {children}
        </div>
      </div>
    </div>
  )
}

export function BracketTip({ magnifier = true }: { magnifier?: boolean }) {
  return (
    <p className="mt-2 text-xs text-stone-500">
      Tip: {magnifier ? "use the magnifier on a match card to zoom straight to it. " : ""}
      Zoom in moves from the bracket to a phase to a single match; zoom out widens a match to its surrounding path,
      then to its phase, then to the full bracket. Ctrl or ⌘ + scroll also zooms.
    </p>
  )
}
