import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { KO_MATCHES, VENUES, fmtDate, koById, koWinner, slotTeam, slotText, type KoMatch, type Slot } from '../lib/data'
import { type Detail, TeamBtn } from './shared'
import { groupSeed } from '../lib/stats'

/* ---------- Knockout bracket ---------- */

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
  ;(['R1', 'R2', 'R3', 'R4', 'R5', 'R6'] as const).forEach((id, i) => { pos[id] = { x: colX(0), y: leafY(i + 1) } })
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
const { pos: POS, byeTop, byeBottom } = layout()

export const TAG: Record<string, string> = {
  R1: 'Round of 14 · Match 1', R2: 'Round of 14 · Match 2', R3: 'Round of 14 · Match 3',
  R4: 'Round of 14 · Match 4', R5: 'Round of 14 · Match 5', R6: 'Round of 14 · Match 6',
  Q1: 'Quarter-final 1', Q2: 'Quarter-final 2', Q3: 'Quarter-final 3', Q4: 'Quarter-final 4',
  S1: 'Semi-final 1', S2: 'Semi-final 2', TP: 'Third place', F: 'Final',
}

export interface Rect { x: number; y: number; w: number; h: number }
export type Focus =
  | { kind: 'all' }
  | { kind: 'phase'; round: 'R14' | 'QF' | 'SF' | 'F' }
  | { kind: 'context'; id: string }
  | { kind: 'match'; id: string }

export const PHASES: { round: 'R14' | 'QF' | 'SF' | 'F'; label: string }[] = [
  { round: 'R14', label: 'Round of 14' },
  { round: 'QF', label: 'Quarter-finals' },
  { round: 'SF', label: 'Semi-finals' },
  { round: 'F', label: 'Final' },
]
export const PHASE_IDS: Record<string, string[]> = {
  R14: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'], QF: ['Q1', 'Q2', 'Q3', 'Q4'], SF: ['S1', 'S2'], F: ['F', 'TP'],
}
export const roundOf = (id: string): 'R14' | 'QF' | 'SF' | 'F' => {
  const r = koById(id).round
  return r === 'TP' ? 'F' : r
}
export const cardRect = (id: string): Rect => ({ x: POS[id].x, y: POS[id].y - CARD_H / 2 - 24, w: CARD_W, h: CARD_H + 24 })
export function union(rs: Rect[]): Rect {
  const x1 = Math.min(...rs.map((r) => r.x)), y1 = Math.min(...rs.map((r) => r.y))
  const x2 = Math.max(...rs.map((r) => r.x + r.w)), y2 = Math.max(...rs.map((r) => r.y + r.h))
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}
export function focusRect(f: Focus): Rect {
  const pad = (r: Rect, p: number): Rect => ({ x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p })
  if (f.kind === 'all') return { x: 0, y: 0, w: TOTAL_W, h: TOTAL_H }
  if (f.kind === 'phase') {
    const r = union(PHASE_IDS[f.round].map(cardRect))
    if (f.round === 'R14') return pad({ x: r.x, y: 0, w: r.w, h: TOTAL_H }, 24)
    return pad({ ...r, y: r.y - 28, h: r.h + 28 }, 24)
  }
  if (f.kind === 'match') return pad(cardRect(f.id), 28)
  // context: the match, the matches feeding it and the match it feeds
  const m = koById(f.id)
  const ids = [f.id]
  ;[m.home, m.away].forEach((s) => s.kind === 'winner' && ids.push(s.of))
  const next = KO_MATCHES.find((x) => [x.home, x.away].some((s) => s.kind === 'winner' && s.of === f.id))
  if (next) ids.push(next.id)
  return pad(union(ids.map(cardRect)), 24)
}
export const focusLabel = (f: Focus) =>
  f.kind === 'all' ? 'Full bracket'
    : f.kind === 'phase' ? PHASES.find((p) => p.round === f.round)!.label
      : f.kind === 'match' ? `${TAG[f.id]} (match view)`
        : `${TAG[f.id]} (match path)`

export interface KnockoutTeamState {
  team: string
  target: KoMatch
  eliminated: boolean
  champion: boolean
  status: string
}

export function knockoutTeamState(team: string): KnockoutTeamState {
  const involved = KO_MATCHES.filter((m) => slotTeam(m.home) === team || slotTeam(m.away) === team)
  const completed = involved.filter((m) => Boolean(m.score))
  const upcoming = involved.find((m) => !m.score)
  const last = completed.at(-1)
  const entry = involved[0] ?? KO_MATCHES.find((m) =>
    (m.home.kind === 'team' && m.home.team === team) || (m.away.kind === 'team' && m.away.team === team),
  )!
  const target = upcoming ?? last ?? entry
  const eliminated = !upcoming && Boolean(last) && koWinner(last!) !== team
  const champion = !upcoming && last?.id === 'F' && koWinner(last) === team
  const prefix = eliminated ? 'Last' : champion ? 'Champion' : upcoming && completed.length ? 'Next' : upcoming ? 'Current' : 'Last'
  return { team, target, eliminated, champion, status: champion ? 'Champion' : `${prefix}: ${TAG[target.id]}` }
}

export function KnockoutTeamSearch({ onSelect }: { onSelect: (state: KnockoutTeamState) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const teams = useMemo(
    () => [...ALL_KO_TEAMS].sort((a, b) => a.localeCompare(b)).map(knockoutTeamState),
    [],
  )
  const filtered = teams.filter((state) =>
    `${state.team} ${groupSeed(state.team)}`.toLowerCase().includes(query.trim().toLowerCase()),
  )

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const choose = (state: KnockoutTeamState) => {
    setQuery(state.team)
    setOpen(false)
    onSelect(state)
  }

  return (
    <div ref={root} className="relative z-20 mb-4 max-w-xl">
      <label htmlFor="knockout-team-search" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">
        Find a team in the bracket
      </label>
      <div className={`glass-control flex items-center rounded-xl border bg-white shadow-sm transition-colors ${open ? 'border-emerald-700 ring-2 ring-emerald-100' : 'border-stone-300'}`}>
        <svg className="ml-3 shrink-0 text-stone-400" width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14" />
        </svg>
        <input
          id="knockout-team-search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && filtered.length === 1) choose(filtered[0])
            if (e.key === 'Escape') setOpen(false)
          }}
          placeholder="Search or choose from all 14 teams"
          role="combobox"
          aria-expanded={open}
          aria-controls="knockout-team-results"
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-stone-400"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(true) }}
            className="mr-2 flex h-7 w-7 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Clear team search"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div id="knockout-team-results" role="listbox" className="absolute left-0 right-0 top-full mt-2 max-h-80 overflow-y-auto rounded-xl border border-stone-200 bg-white p-2 shadow-xl">
          {filtered.length ? filtered.map((state) => (
            <button
              key={state.team}
              role="option"
              aria-selected={query === state.team}
              onClick={() => choose(state)}
              className={`liquid mb-1 flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left last:mb-0 ${
                state.eliminated
                  ? 'border-stone-200 bg-stone-100 text-stone-500'
                  : state.champion
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-transparent bg-white text-stone-800 hover:border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <span>
                <span className="font-semibold">{state.team}</span>
                <span className="ml-1.5 text-xs opacity-70">({groupSeed(state.team)})</span>
              </span>
              <span className="shrink-0 text-xs font-medium opacity-75">{state.status}</span>
            </button>
          )) : (
            <p className="px-3 py-6 text-center text-sm text-stone-500">No team matches “{query}”.</p>
          )}
        </div>
      )}
    </div>
  )
}

export function Knockout({ onTeam, onMatch }: { onTeam: (t: string) => void; onMatch: (d: Detail) => void }) {
  const [focus, setFocus] = useState<Focus>({ kind: 'all' })
  const [lastRound, setLastRound] = useState<'R14' | 'QF' | 'SF' | 'F'>('R14')
  const [size, setSize] = useState({ w: 1000, h: 640 })
  const vp = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = vp.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const rect = focusRect(focus)
  // The zoom ratio depends on what is being shown: fit the focus to the window,
  // within limits that keep text legible (tall phases scroll rather than shrink).
  const fit = Math.min(size.w / rect.w, size.h / rect.h)
  const fullScale = Math.min(size.w / TOTAL_W, 1)
  const scale =
    focus.kind === 'all' ? fullScale
      : focus.kind === 'phase' ? Math.min(1.35, Math.max(fit, 0.85))
        : Math.min(fit, focus.kind === 'match' ? 1.7 : 1.25)

  useEffect(() => {
    const el = vp.current
    if (!el) return
    const left = (rect.x + rect.w / 2) * scale - size.w / 2
    const top = rect.h * scale > size.h ? rect.y * scale : (rect.y + rect.h / 2) * scale - size.h / 2
    el.scrollTo({ left: Math.max(0, left), top: Math.max(0, top), behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, scale, size.w, size.h])

  const go = (f: Focus) => {
    if (f.kind === 'phase') setLastRound(f.round)
    if (f.kind === 'context' || f.kind === 'match') setLastRound(roundOf(f.id))
    setFocus(f)
  }
  // Zoom in narrows the subject (bracket → phase → match). Zoom out widens the
  // context differently (match → surrounding path → phase → bracket).
  const zoomIn = () => {
    if (focus.kind === 'all') go({ kind: 'phase', round: lastRound })
    else if (focus.kind === 'phase') go({ kind: 'match', id: PHASE_IDS[focus.round][0] })
    else if (focus.kind === 'context') go({ kind: 'match', id: focus.id })
  }
  const zoomOut = () => {
    if (focus.kind === 'match') go({ kind: 'context', id: focus.id })
    else if (focus.kind === 'context') go({ kind: 'phase', round: roundOf(focus.id) })
    else if (focus.kind === 'phase') go({ kind: 'all' })
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
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [])

  const lines: { d: string; dashed?: boolean }[] = []
  const link = (from: string, to: string, dashed = false, inset = 0) => {
    const a = POS[from], b = POS[to]
    const x1 = a.x + CARD_W, x2 = b.x
    const mx = x1 + GAP / 2 + inset
    lines.push({ d: `M${x1},${a.y} H${mx} V${b.y} H${x2}`, dashed })
  }
  ;[['R1', 'Q1'], ['R2', 'Q2'], ['R3', 'Q2'], ['R4', 'Q3'], ['R5', 'Q3'], ['R6', 'Q4'],
    ['Q1', 'S1'], ['Q2', 'S1'], ['Q3', 'S2'], ['Q4', 'S2'], ['S1', 'F'], ['S2', 'F']].forEach(([a, b]) => link(a, b))
  link('S1', 'TP', true, 14)
  link('S2', 'TP', true, 14)

  const byes = [
    { y: byeTop, to: 'Q1', name: 'SKHLMC', seed: '1st, Group 2' },
    { y: byeBottom, to: 'Q4', name: 'CANADIAN', seed: '1st, Group 5' },
  ]
  const canIn = focus.kind !== 'match'
  const canOut = focus.kind !== 'all'

  return (
    <div>
      <div className="mb-5 max-w-3xl text-sm text-stone-600">
        <p>
          Fourteen teams contest a single-elimination final round. Two group winners, SKHLMC and CANADIAN,
          receive a bye directly into the quarter-finals, so the first round is a Round of 14 (14 → 8). The first-named team is the home team.
          Dashed connectors lead to the third-place play-off between the two semi-final losers.
        </p>
      </div>

      <KnockoutTeamSearch onSelect={(state) => go({ kind: 'match', id: state.target.id })} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-stone-300 bg-white">
          <button onClick={zoomOut} disabled={!canOut} aria-label="Zoom out" title="Zoom out: widen the context" className="liquid flex h-9 w-10 items-center justify-center text-stone-700 disabled:opacity-35">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="7" cy="7" r="4.5" /><path d="M5 7h4M10.5 10.5L14 14" /></svg>
          </button>
          <button onClick={zoomIn} disabled={!canIn} aria-label="Zoom in" title="Zoom in: focus on a phase, then a match" className="liquid flex h-9 w-10 items-center justify-center border-l border-stone-300 text-stone-700 disabled:opacity-35">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="7" cy="7" r="4.5" /><path d="M5 7h4M7 5v4M10.5 10.5L14 14" /></svg>
          </button>
        </div>
        <button onClick={() => go({ kind: 'all' })} className={`liquid rounded-full border px-3.5 py-1.5 text-sm ${focus.kind === 'all' ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-stone-300 bg-white'}`}>
          Full bracket
        </button>
        {PHASES.map((p) => {
          const active = focus.kind === 'phase' && focus.round === p.round
          return (
            <button key={p.round} onClick={() => go({ kind: 'phase', round: p.round })} className={`liquid rounded-full border px-3.5 py-1.5 text-sm ${active ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-stone-300 bg-white'}`}>
              {p.label}
            </button>
          )
        })}
        <span className="ml-auto text-xs text-stone-500">
          Viewing: <span className="font-medium text-stone-700">{focusLabel(focus)}</span> · {Math.round((scale / fullScale) * 100)}%
        </span>
      </div>

      <div
        ref={vp}
        className="relative overflow-auto rounded-xl border border-stone-200 bg-white"
        style={{ height: focus.kind === 'all' ? TOTAL_H * scale : 'min(72vh, 700px)' }}
      >
        <div style={{ width: TOTAL_W * scale, height: TOTAL_H * scale, transition: 'width .5s, height .5s' }}>
          <div
            className="relative origin-top-left"
            style={{ width: TOTAL_W, height: TOTAL_H, transform: `scale(${scale})`, transition: 'transform .6s cubic-bezier(.22,.8,.3,1)' }}
          >
            {PHASES.map((p, c) => (
              <div key={p.round} className="absolute text-xs font-semibold uppercase tracking-widest text-stone-500" style={{ left: colX(c), top: 14 }}>
                {p.label}
              </div>
            ))}
            <svg className="absolute inset-0" width={TOTAL_W} height={TOTAL_H} fill="none">
              {lines.map((l, i) => (
                <path key={i} d={l.d} stroke={l.dashed ? '#a8a29e' : '#78716c'} strokeWidth={1.5} strokeDasharray={l.dashed ? '5 5' : undefined} />
              ))}
              {byes.map((b) => {
                const t = POS[b.to]
                const cardRight = colX(0) + CARD_W
                return <path key={b.name} d={`M${cardRight},${b.y} H${cardRight + GAP / 2} V${t.y} H${t.x}`} stroke="#78716c" strokeWidth={1.5} />
              })}
            </svg>

            {byes.map((b) => (
              <div key={b.name} className="liquid absolute rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3" style={{ left: colX(0), top: b.y - BYE_H / 2, width: CARD_W, height: BYE_H }}>
                <div className="flex h-full flex-col justify-center">
                <div className="flex items-center justify-between">
                  <TeamBtn name={b.name} onTeam={onTeam} className="text-base" />
                  <span className="rounded bg-emerald-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Bye</span>
                </div>
                <div className="mt-1 text-xs leading-snug text-stone-600">{b.seed}</div>
                <div className="text-xs leading-snug text-stone-600">Direct to quarter-final</div>
                </div>
              </div>
            ))}

            {KO_MATCHES.map((m) => (
              <div key={m.id}>
                <div
                  className={`absolute whitespace-nowrap text-[11px] font-semibold uppercase tracking-widest ${m.id === 'F' ? 'text-amber-700' : 'text-stone-500'}`}
                  style={{ left: POS[m.id].x + 2, top: POS[m.id].y - CARD_H / 2 - 19 }}
                >
                  {TAG[m.id]}
                </div>
                <MatchCard m={m} onTeam={onTeam} onMatch={onMatch} onZoom={() => go({ kind: 'match', id: m.id })} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        Tip: use the magnifier on a match card to zoom straight to it. Zoom in moves from the bracket to a phase to a single match; zoom out
        widens a match to its surrounding path, then to its phase, then to the full bracket. Ctrl or ⌘ + scroll also zooms.
      </p>
    </div>
  )
}

export function SlotRow({ s, m, onTeam }: { s: Slot; m: KoMatch; onTeam: (t: string) => void }) {
  const t = slotTeam(s)
  const isHome = m.home === s
  const score = m.score ? m.score[isHome ? 0 : 1] : null
  const won = t && koWinner(m) === t
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5">
      {t ? (
        <TeamBtn name={t} onTeam={onTeam} className={`text-sm ${won ? 'text-emerald-800' : ''}`} />
      ) : (
        <span className="truncate text-sm italic text-stone-400">{slotText(s)}</span>
      )}
      <span className="text-sm font-semibold tabular-nums">
        {score ?? ''}
        {m.pens && <span className="ml-1 text-xs font-normal text-stone-500">({m.pens[isHome ? 0 : 1]})</span>}
      </span>
    </div>
  )
}

export function MatchCard({ m, onTeam, onMatch, onZoom }: { m: KoMatch; onTeam: (t: string) => void; onMatch: (d: Detail) => void; onZoom: () => void }) {
  const p = POS[m.id]
  return (
    <div
      onClick={() => onMatch({ kind: 'ko', id: m.id })}
      className={`liquid absolute cursor-pointer overflow-hidden rounded-lg border bg-white shadow-sm ${m.round === 'F' ? 'border-amber-400' : m.round === 'TP' ? 'border-dashed border-stone-400' : 'border-stone-300'}`}
      style={{ left: p.x, top: p.y - CARD_H / 2, width: CARD_W, height: CARD_H }}
    >
      <div className="flex items-center justify-between bg-stone-100 px-3 py-1 text-[11px] text-stone-600">
        <span>{fmtDate(m.date)} · {m.time}</span>
        <span className="flex items-center gap-1.5">
          <span className="font-medium">{m.id === 'TP' ? '3rd' : m.id === 'F' ? 'Final' : m.id}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onZoom() }}
            aria-label="Zoom to this match"
            title="Zoom to this match"
            className="rounded p-0.5 text-stone-500 hover:text-emerald-800"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>
          </button>
        </span>
      </div>
      <SlotRow s={m.home} m={m} onTeam={onTeam} />
      <div className="mx-3 border-t border-stone-100" />
      <SlotRow s={m.away} m={m} onTeam={onTeam} />
      <div className="border-t border-stone-100 px-3 py-1 text-[11px] leading-tight text-stone-600">{VENUES[m.venue]}</div>
    </div>
  )
}

