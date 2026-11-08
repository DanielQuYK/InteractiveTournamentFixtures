import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { usePersistentState, usePrefersReducedMotion } from "../lib/hooks"
import {
  PHASES,
  PHASE_IDS,
  totalH,
  totalW,
  bracketLines,
  colX,
  focusLabel,
  focusRect,
  roundOf,
  type Focus,
} from "../lib/bracketLayout"

type Round = "R14" | "QF" | "SF" | "F"

/**
 * Zoom and pan engine shared by every bracket in the app: full bracket → phase →
 * match zooming, with the zoom ratio chosen from what is being shown.
 */
export function useBracketZoom(storageKey: string) {
  const [focus, setFocus] = usePersistentState<Focus>(`${storageKey}-focus`, { kind: "all" })
  const [lastRound, setLastRound] = usePersistentState<Round>(`${storageKey}-last-round`, PHASES[0].round)
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
  const fullScale = Math.min(size.w / totalW(), 1)
  const scale =
    focus.kind === "all"
      ? fullScale
      : focus.kind === "phase"
        ? Math.min(1.35, Math.max(fit, 0.85))
        : Math.min(fit, focus.kind === "match" ? 1.7 : 1.25)

  // The canvas size, its scale and the scroll position are driven together,
  // imperatively, so every frame of a zoom is internally consistent. (Animating
  // the CSS scale and the scroll position independently made the view drift,
  // because the scrollable area was still changing size while it scrolled.)
  const sizerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const applied = useRef(0)
  const frame = useRef(0)
  const lastFocus = useRef("")

  useLayoutEffect(() => {
    const el = vp.current
    const sizer = sizerRef.current
    const canvas = canvasRef.current
    if (!el || !sizer || !canvas) return
    const render = (s: number, cx: number, cy: number) => {
      canvas.style.transform = `scale(${s})`
      sizer.style.width = `${totalW() * s}px`
      sizer.style.height = `${totalH() * s}px`
      el.scrollLeft = cx * s - el.clientWidth / 2
      el.scrollTop = cy * s - el.clientHeight / 2
      applied.current = s
    }
    const tall = rect.h * scale > size.h
    const target = {
      s: scale,
      cx: rect.x + rect.w / 2,
      cy: tall ? rect.y + size.h / (2 * scale) : rect.y + rect.h / 2,
    }
    cancelAnimationFrame(frame.current)
    const focusKey = JSON.stringify(focus)
    const focusChanged = focusKey !== lastFocus.current
    lastFocus.current = focusKey
    const from = applied.current
    if (!from || !focusChanged || reducedMotion) {
      render(target.s, target.cx, target.cy)
      return
    }
    // Animate scale (geometrically, so zooming feels even) and the viewed centre together.
    const startCx = (el.scrollLeft + el.clientWidth / 2) / from
    const startCy = (el.scrollTop + el.clientHeight / 2) / from
    const started = performance.now()
    const duration = 380
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / duration)
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      render(
        from * Math.pow(target.s / from, e),
        startCx + (target.cx - startCx) * e,
        startCy + (target.cy - startCy) * e,
      )
      if (t < 1) frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, scale, size.w, size.h, reducedMotion])

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
    // Mac trackpad pinch arrives as a burst of small ctrl+wheel events, so add
    // them up and take one zoom step per deliberate gesture.
    let total = 0
    let lastEvent = 0
    let lastStep = 0
    const wheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      const now = Date.now()
      if (now - lastEvent > 250) total = 0
      lastEvent = now
      total += e.deltaY
      if (now - lastStep < 400 || Math.abs(total) < 40) return
      lastStep = now
      if (total < 0) zoomRef.current.zoomIn()
      else zoomRef.current.zoomOut()
      total = 0
    }
    // Safari reports pinch as gesture events instead.
    let stepped = false
    const gestureStart = (e: Event) => {
      e.preventDefault()
      stepped = false
    }
    const gestureChange = (e: Event) => {
      e.preventDefault()
      const scaleChange = (e as unknown as { scale: number }).scale
      if (stepped || (scaleChange < 1.25 && scaleChange > 0.8)) return
      stepped = true
      if (scaleChange > 1) zoomRef.current.zoomIn()
      else zoomRef.current.zoomOut()
    }
    el.addEventListener("wheel", wheel, { passive: false })
    el.addEventListener("gesturestart", gestureStart)
    el.addEventListener("gesturechange", gestureChange)
    return () => {
      el.removeEventListener("wheel", wheel)
      el.removeEventListener("gesturestart", gestureStart)
      el.removeEventListener("gesturechange", gestureChange)
    }
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
    sizerRef,
    canvasRef,
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
  const { focus, scale, vp, sizerRef, canvasRef } = zoom
  return (
    <div
      ref={vp}
      className="relative overflow-auto rounded-xl border border-stone-200 bg-white"
      style={{ height: focus.kind === "all" ? totalH() * scale : "min(72vh, 700px)" }}
    >
      {/* Width, height and scale of the two layers below are set by the zoom engine. */}
      <div ref={sizerRef}>
        <div ref={canvasRef} className="relative origin-top-left" style={{ width: totalW(), height: totalH() }}>
          {PHASES.map((p, c) => (
            <div
              key={p.round}
              className="absolute text-xs font-semibold uppercase tracking-widest text-stone-500"
              style={{ left: colX(c), top: 14 }}
            >
              {p.label}
            </div>
          ))}
          <svg className="absolute inset-0" width={totalW()} height={totalH()} fill="none" aria-hidden="true">
            {bracketLines().map((l, i) => (
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
