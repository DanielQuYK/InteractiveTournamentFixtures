import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  GROUPS, GROUP_MATCHES, KO_MATCHES, REMARKS, ROUND_NAME, VENUES, VENUE_SHORT, WITHDRAWN,
  PENALTIES, ALL_KO_TEAMS, fmtDate, koById, koLoser, koWinner, slotTeam, slotText, standings, timeMinutes,
  type KoMatch, type Slot, type GroupMatch,
} from './lib/data'

type Tab = 'group' | 'knockout' | 'stats' | 'simulation'
type Detail = { kind: 'ko'; id: string } | { kind: 'group'; m: GroupMatch }

export default function App() {
  const [tab, setTab] = useState<Tab>('group')
  const [team, setTeam] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)

  // Liquid-glass hover: track pointer position on any .liquid element
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest?.('.liquid') as HTMLElement | null
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    document.addEventListener('pointermove', move)
    return () => document.removeEventListener('pointermove', move)
  }, [])

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 antialiased">
      <header className="bg-emerald-950 text-white">
        <div className="mx-auto max-w-6xl px-5 pt-8 pb-0">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">Inter-School Football Competition 2026–2027</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Division Three (HK) · Boys A Grade</h1>
          <p className="mt-1 text-sm text-emerald-200/80">Group stage results and final round (single knock-out)</p>
          <nav className="mt-7 flex gap-1 overflow-x-auto" role="tablist">
            {(['group', 'knockout', 'stats', 'simulation'] as Tab[]).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`liquid liquid-dark rounded-t-lg px-5 py-2.5 text-sm font-medium ${
                  tab === t ? 'bg-stone-50 text-emerald-950' : 'text-emerald-100'
                }`}
              >
                {t === 'group' ? 'Group Stage' : t === 'knockout' ? 'Knockout' : t === 'stats' ? 'Team Stats' : 'Simulation'}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        {tab === 'group' ? (
          <GroupStage onTeam={setTeam} onMatch={setDetail} />
        ) : tab === 'knockout' ? (
          <Knockout onTeam={setTeam} onMatch={setDetail} />
        ) : tab === 'stats' ? (
          <TeamStats onTeam={setTeam} />
        ) : (
          <SimulationPlaceholder />
        )}
        <p className="mt-10 border-t border-stone-200 pt-4 text-xs text-stone-500">
          Teams are shown by the school abbreviations used in the official fixture documents. Select any team name to view its
          complete fixtures. Per-player statistics are not published, as insufficient data is available.
        </p>
      </main>

      {detail && (
        <MatchModal
          detail={detail}
          onClose={() => setDetail(null)}
          onTeam={(t) => { setDetail(null); setTeam(t) }}
        />
      )}
      {team && <TeamPanel team={team} onClose={() => setTeam(null)} onTeam={setTeam} />}
    </div>
  )
}

/* ---------- shared ---------- */

function TeamBtn({ name, onTeam, className = '' }: { name: string; onTeam: (t: string) => void; className?: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onTeam(name) }}
      className={`text-left font-semibold underline-offset-4 decoration-emerald-600/40 hover:text-emerald-700 hover:underline focus-visible:outline-2 focus-visible:outline-emerald-600 ${className}`}
    >
      {name}
    </button>
  )
}

function remarkText(r: string) {
  if (!r) return ''
  return r
    .replace(/DQ\*\s*\(-3 pts\)/, 'Disqualified (3-point deduction)')
    .replace(/^W$/, 'Walk-over')
    .replace(/^C$/, 'Cancelled')
    .replace(/A \(([^)]+)\)/g, 'Amended ($1)')
}

/* ---------- Group stage ---------- */

function GroupStage({ onTeam, onMatch }: { onTeam: (t: string) => void; onMatch: (d: Detail) => void }) {
  const [sel, setSel] = useState<number | 'all'>('all')
  const list = sel === 'all' ? GROUPS : [sel]
  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {(['all', ...GROUPS] as const).map((g) => (
          <button
            key={g}
            onClick={() => setSel(g)}
            className={`liquid rounded-full border px-4 py-1.5 text-sm transition-colors ${
              sel === g ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-stone-300 bg-white hover:border-emerald-700'
            }`}
          >
            {g === 'all' ? 'All groups' : `Group ${g}`}
          </button>
        ))}
      </div>

      <div className="glass-surface mb-8 rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-600">
        <p className="font-medium text-stone-800">Notes</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          <li>The top two teams in each group (shaded) advance to the final round. Ranking: points, goal difference, goals scored.</li>
          <li>Remarks: {Object.entries(REMARKS).map(([k, v]) => `${k} = ${v}`).join('; ')}.</li>
          <li>CCHK (Group 2) withdrew on 22 September 2026; their fixtures are recorded as cancelled and are excluded from the standings.</li>
          <li>ISFA (Group 2) were disqualified from the fixture against SKHLMC (recorded 0–3) and a deduction of 3 points applies.</li>
        </ul>
      </div>

      <div className="space-y-10">
        {list.map((g) => (
          <GroupBlock key={g} group={g} onTeam={onTeam} onMatch={onMatch} />
        ))}
      </div>
    </div>
  )
}

function GroupBlock({ group, onTeam, onMatch }: { group: number; onTeam: (t: string) => void; onMatch: (d: Detail) => void }) {
  const table = useMemo(() => standings(group), [group])
  const matches = GROUP_MATCHES.filter((m) => m.group === group).sort(
    (a, b) => a.date.localeCompare(b.date) || timeMinutes(a.time) - timeMinutes(b.time),
  )
  const withdrawn = [...new Set(matches.flatMap((m) => [m.home, m.away]))].filter((t) => WITHDRAWN[t])
  return (
    <section>
      <h2 className="mb-3 flex items-baseline gap-3 text-lg font-semibold">
        Group {group}
        {withdrawn.map((w) => (
          <span key={w} className="text-xs font-normal text-stone-500">{w} withdrew</span>
        ))}
      </h2>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="glass-surface overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="py-2 pl-3 text-left">#</th>
                <th className="py-2 text-left">Team</th>
                {['P', 'W', 'D', 'L', 'GF', 'GA', 'GD'].map((h) => <th key={h} className="px-1.5 py-2 text-center">{h}</th>)}
                <th className="py-2 pr-3 text-center">Pts</th>
              </tr>
            </thead>
            <tbody>
              {table.map((r, i) => (
                <tr key={r.team} className={`liquid border-t border-stone-100 ${i < 2 ? 'bg-emerald-50' : ''}`}>
                  <td className="py-2 pl-3 text-stone-500">{i + 1}</td>
                  <td className="py-2">
                    <TeamBtn name={r.team} onTeam={onTeam} />
                    {r.penalty > 0 && <span className="ml-1.5 text-xs text-stone-500">(−{PENALTIES[r.team]})</span>}
                  </td>
                  {[r.p, r.w, r.d, r.l, r.gf, r.ga, r.gd > 0 ? `+${r.gd}` : r.gd].map((v, k) => (
                    <td key={k} className="px-1.5 py-2 text-center tabular-nums">{v}</td>
                  ))}
                  <td className="py-2 pr-3 text-center font-semibold tabular-nums">{r.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass-surface overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="py-2 pl-3 text-left">Kick-off</th>
                <th className="py-2 text-right">Home</th>
                <th className="px-2 py-2 text-center">Score</th>
                <th className="py-2 text-left">Away</th>
                <th className="py-2 pr-3 text-left">Venue / remarks</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.game + m.date + m.home} onClick={() => onMatch({ kind: 'group', m })} className="liquid cursor-pointer border-t border-stone-100 align-top">
                  <td className="whitespace-nowrap py-2 pl-3 text-stone-600">
                    <div>{fmtDate(m.date)}</div>
                    <div className="text-xs text-stone-500">{m.time}</div>
                  </td>
                  <td className="py-2 text-right"><TeamBtn name={m.home} onTeam={onTeam} /></td>
                  <td className="px-2 py-2 text-center font-semibold tabular-nums">
                    {m.hs === null ? <span className="font-normal text-stone-400">–</span> : `${m.hs} : ${m.as}`}
                  </td>
                  <td className="py-2"><TeamBtn name={m.away} onTeam={onTeam} /></td>
                  <td className="py-2 pr-3 text-xs text-stone-500">
                    <div>{VENUE_SHORT[m.venue]}</div>
                    {m.remark && <div className="font-medium text-amber-700">{remarkText(m.remark)}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

/* ---------- Knockout bracket ---------- */

const CARD_W = 292
const CARD_H = 120
const GAP = 56
const U = 152
const OFF = 12 // compact gap between round headings and the first bye card
const EDGE_PAD = 28
const colX = (c: number) => EDGE_PAD + c * (CARD_W + GAP)
const BYE_H = 96
const TOTAL_W = colX(3) + CARD_W + EDGE_PAD
const TOTAL_H = 8 * U + OFF + 20

function layout() {
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

const TAG: Record<string, string> = {
  R1: 'Round of 14 · Match 1', R2: 'Round of 14 · Match 2', R3: 'Round of 14 · Match 3',
  R4: 'Round of 14 · Match 4', R5: 'Round of 14 · Match 5', R6: 'Round of 14 · Match 6',
  Q1: 'Quarter-final 1', Q2: 'Quarter-final 2', Q3: 'Quarter-final 3', Q4: 'Quarter-final 4',
  S1: 'Semi-final 1', S2: 'Semi-final 2', TP: 'Third place', F: 'Final',
}

interface Rect { x: number; y: number; w: number; h: number }
type Focus =
  | { kind: 'all' }
  | { kind: 'phase'; round: 'R14' | 'QF' | 'SF' | 'F' }
  | { kind: 'context'; id: string }
  | { kind: 'match'; id: string }

const PHASES: { round: 'R14' | 'QF' | 'SF' | 'F'; label: string }[] = [
  { round: 'R14', label: 'Round of 14' },
  { round: 'QF', label: 'Quarter-finals' },
  { round: 'SF', label: 'Semi-finals' },
  { round: 'F', label: 'Final' },
]
const PHASE_IDS: Record<string, string[]> = {
  R14: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'], QF: ['Q1', 'Q2', 'Q3', 'Q4'], SF: ['S1', 'S2'], F: ['F', 'TP'],
}
const roundOf = (id: string): 'R14' | 'QF' | 'SF' | 'F' => {
  const r = koById(id).round
  return r === 'TP' ? 'F' : r
}
const cardRect = (id: string): Rect => ({ x: POS[id].x, y: POS[id].y - CARD_H / 2 - 24, w: CARD_W, h: CARD_H + 24 })
function union(rs: Rect[]): Rect {
  const x1 = Math.min(...rs.map((r) => r.x)), y1 = Math.min(...rs.map((r) => r.y))
  const x2 = Math.max(...rs.map((r) => r.x + r.w)), y2 = Math.max(...rs.map((r) => r.y + r.h))
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}
function focusRect(f: Focus): Rect {
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
const focusLabel = (f: Focus) =>
  f.kind === 'all' ? 'Full bracket'
    : f.kind === 'phase' ? PHASES.find((p) => p.round === f.round)!.label
      : f.kind === 'match' ? `${TAG[f.id]} (match view)`
        : `${TAG[f.id]} (match path)`

interface KnockoutTeamState {
  team: string
  target: KoMatch
  eliminated: boolean
  champion: boolean
  status: string
}

function knockoutTeamState(team: string): KnockoutTeamState {
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

function KnockoutTeamSearch({ onSelect }: { onSelect: (state: KnockoutTeamState) => void }) {
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

function Knockout({ onTeam, onMatch }: { onTeam: (t: string) => void; onMatch: (d: Detail) => void }) {
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
              <div key={b.name} className="liquid absolute rounded-lg border border-emerald-300 bg-emerald-50 px-4 pb-4 pt-3" style={{ left: colX(0), top: b.y - BYE_H / 2, width: CARD_W, height: BYE_H }}>
                <div className="flex items-center justify-between">
                  <TeamBtn name={b.name} onTeam={onTeam} className="text-base" />
                  <span className="rounded bg-emerald-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Bye</span>
                </div>
                <div className="mt-1 text-xs leading-snug text-stone-600">{b.seed}</div>
                <div className="text-xs leading-snug text-stone-600">Direct to quarter-final</div>
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

function SlotRow({ s, m, onTeam }: { s: Slot; m: KoMatch; onTeam: (t: string) => void }) {
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

function MatchCard({ m, onTeam, onMatch, onZoom }: { m: KoMatch; onTeam: (t: string) => void; onMatch: (d: Detail) => void; onZoom: () => void }) {
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

/* ---------- Team panel ---------- */

function describeSource(s: Slot): string {
  const t = slotTeam(s)
  if (t) return t
  if (s.kind === 'team') return s.team
  const src = koById(s.of)
  const a = slotTeam(src.home) ?? slotText(src.home)
  const b = slotTeam(src.away) ?? slotText(src.away)
  const verb = s.kind === 'winner' ? 'Winner' : 'Loser'
  return `${verb} of ${src.label} (${a} v ${b})`
}

function TeamPanel({ team, onClose, onTeam }: { team: string; onClose: () => void; onTeam: (t: string) => void }) {
  const group = GROUP_MATCHES.find((m) => m.home === team || m.away === team)?.group
  const gm = GROUP_MATCHES.filter((m) => m.home === team || m.away === team).sort(
    (a, b) => a.date.localeCompare(b.date) || timeMinutes(a.time) - timeMinutes(b.time),
  )
  const table = group ? standings(group) : []
  const rank = table.findIndex((r) => r.team === team) + 1

  // knockout path
  const entry = KO_MATCHES.find((m) => slotTeam(m.home) === team || slotTeam(m.away) === team)
  const path: { m: KoMatch; note: string; projected: boolean }[] = []
  let eliminated = false
  if (entry) {
    let cur: KoMatch | undefined = entry
    let prev: KoMatch | null = null
    let status: 'confirmed' | 'projected' = 'confirmed'
    while (cur) {
      const note = !prev
        ? entry.round === 'QF' ? 'Direct entry: first-round bye as group winner.' : 'Confirmed fixture.'
        : cur.round === 'TP'
          ? `Projected: applies only if ${team} lose ${prev.label}.`
          : `Projected: subject to ${team} winning ${prev.label}.`
      path.push({ m: cur, note, projected: status === 'projected' })
      const w = koWinner(cur)
      if (w) {
        if (w !== team) {
          // lost: only SF losers go to the third-place match
          if (cur.round === 'SF') { prev = cur; cur = koById('TP'); const w2 = koWinner(cur); path.push({ m: cur, note: `Third-place play-off following defeat in ${prev.label}.`, projected: !w2 }); break }
          eliminated = true
          break
        }
      } else status = 'projected'
      const next: KoMatch | undefined = KO_MATCHES.find((x) => (x.home.kind === 'winner' && x.home.of === cur!.id) || (x.away.kind === 'winner' && x.away.of === cur!.id))
      prev = cur
      cur = next
    }
    // Unresolved semi-final: also show the third-place contingency
    const sf = path.find((p) => p.m.round === 'SF')
    if (sf && !koWinner(sf.m) && !path.some((p) => p.m.id === 'TP')) {
      path.push({ m: koById('TP'), note: `Projected: applies only if ${team} lose ${sf.m.label}.`, projected: true })
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-stone-900/40" onClick={onClose}>
      <aside className="isolate h-full w-full max-w-xl overflow-y-auto bg-stone-50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-30 flex items-start justify-between border-b border-emerald-900 bg-emerald-950 px-6 py-5 text-white shadow-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Team fixtures</p>
            <h2 className="text-2xl font-semibold">{team}</h2>
            <p className="mt-1 text-sm text-emerald-200/80">
              {group ? `Group ${group}` : ''}
              {WITHDRAWN[team] ? ` · ${WITHDRAWN[team]}` : rank ? ` · Finished ${rank}${['st', 'nd', 'rd', 'th'][Math.min(rank, 4) - 1]}` : ''}
              {entry ? ' · Qualified for the final round' : !WITHDRAWN[team] ? ' · Did not qualify for the final round' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="liquid flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-emerald-100 hover:bg-emerald-900"
            aria-label="Close team fixtures"
            title="Close"
          >
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-8 px-6 py-6">
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">Final round (knockout)</h3>
            {entry ? (
              <ol className="space-y-3">
                {path.map(({ m, note, projected }) => (
                  <li key={m.id} className={`liquid rounded-lg border p-4 ${projected ? 'border-dashed border-stone-300 bg-white/60' : 'border-stone-200 bg-white'}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold uppercase tracking-wide text-emerald-800">{ROUND_NAME[m.round]}</span>
                      <span className={`rounded-full px-2 py-0.5 font-medium ${projected ? 'bg-amber-100 text-amber-800' : m.score ? 'bg-stone-200 text-stone-700' : 'bg-emerald-100 text-emerald-800'}`}>
                        {projected ? 'Projected' : m.score ? 'Completed' : 'Scheduled'}
                      </span>
                    </div>
                    <div className="mt-2 text-base">
                      <KoLine m={m} team={team} onTeam={onTeam} />
                    </div>
                    <p className="mt-2 text-sm text-stone-600">{fmtDate(m.date, true)}, {m.time}</p>
                    <p className="text-sm text-stone-600">{VENUES[m.venue]}</p>
                    <p className="mt-2 text-xs italic text-stone-500">{note}</p>
                  </li>
                ))}
                {eliminated && <li className="text-sm font-medium text-stone-600">{team} have been eliminated from the competition.</li>}
              </ol>
            ) : (
              <p className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-600">
                {WITHDRAWN[team] ? `${team} withdrew from the competition.` : `${team} did not advance beyond the group stage.`}
              </p>
            )}
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">Group stage</h3>
            <ul className="divide-y divide-stone-200 overflow-hidden rounded-lg border border-stone-200 bg-white">
              {gm.map((m) => <GroupLine key={m.game + m.date + m.home} m={m} team={team} onTeam={onTeam} />)}
            </ul>
          </section>
        </div>
      </aside>
    </div>
  )
}

function KoLine({ m, team, onTeam }: { m: KoMatch; team: string; onTeam: (t: string) => void }) {
  const h = slotTeam(m.home), a = slotTeam(m.away)
  const part = (s: Slot, t: string | null) =>
    t ? (t === team ? <strong>{t}</strong> : <TeamBtn name={t} onTeam={onTeam} />) : <span className="italic text-stone-500">{describeSource(s)}</span>
  return (
    <div className="flex flex-wrap items-center gap-x-2">
      {part(m.home, h)}
      <span className="font-semibold tabular-nums text-stone-700">{m.score ? `${m.score[0]} – ${m.score[1]}` : 'v'}</span>
      {part(m.away, a)}
    </div>
  )
}

function GroupLine({ m, team, onTeam }: { m: GroupMatch; team: string; onTeam: (t: string) => void }) {
  const home = m.home === team
  const opp = home ? m.away : m.home
  let result = ''
  if (m.hs !== null && m.as !== null) {
    const f = home ? m.hs : m.as, c = home ? m.as : m.hs
    result = f > c ? 'W' : f < c ? 'L' : 'D'
  }
  const color = result === 'W' ? 'bg-emerald-100 text-emerald-800' : result === 'L' ? 'bg-rose-100 text-rose-800' : result === 'D' ? 'bg-stone-200 text-stone-700' : 'bg-stone-100 text-stone-500'
  return (
    <li className="liquid flex items-start gap-3 p-3 text-sm">
      <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${color}`}>{result || '–'}</span>
      <div className="min-w-0 flex-1">
        <div>
          <span className="text-stone-500">{home ? 'vs' : 'at'} </span>
          <TeamBtn name={opp} onTeam={onTeam} />
          <span className="ml-2 font-semibold tabular-nums">{m.hs === null ? '' : `${m.hs} : ${m.as}`}</span>
          <span className="ml-1 text-xs text-stone-500">{m.hs === null ? '' : home ? '(home)' : '(away)'}</span>
        </div>
        <div className="text-xs text-stone-500">{fmtDate(m.date)}, {m.time} · {VENUE_SHORT[m.venue]}</div>
        {m.remark && <div className="text-xs font-medium text-amber-700">{remarkText(m.remark)}</div>}
      </div>
    </li>
  )
}

/* ---------- Match detail modal ---------- */

function MatchModal({ detail, onClose, onTeam }: { detail: Detail; onClose: () => void; onTeam: (t: string) => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [onClose])

  let title = '', subtitle = '', date = '', time = '', venue = '', status = ''
  let home: string | null = null, away: string | null = null
  let homeLabel = '', awayLabel = '', score = 'v', extra: string[] = [], homeSeed = '', awaySeed = ''

  if (detail.kind === 'group') {
    const m = detail.m
    title = `Group ${m.group}`; subtitle = `Game ${m.game}`
    date = m.date; time = m.time; venue = VENUES[m.venue]
    home = homeLabel = m.home; away = awayLabel = m.away
    if (m.hs !== null) score = `${m.hs} : ${m.as}`
    status = m.hs !== null ? 'Full time' : m.remark === 'C' ? 'Cancelled' : 'Scheduled'
    if (m.remark) extra.push(`Remarks: ${remarkText(m.remark)}.`)
  } else {
    const m = koById(detail.id)
    title = ROUND_NAME[m.round]; subtitle = m.label
    date = m.date; time = m.time; venue = VENUES[m.venue]
    home = slotTeam(m.home); away = slotTeam(m.away)
    homeLabel = home ?? describeSource(m.home); awayLabel = away ?? describeSource(m.away)
    if (m.home.kind === 'team') homeSeed = m.home.seed
    if (m.away.kind === 'team') awaySeed = m.away.seed
    if (m.score) score = `${m.score[0]} : ${m.score[1]}`
    status = m.score ? 'Full time' : home && away ? 'Scheduled' : 'Awaiting earlier results'
    const next = KO_MATCHES.find((x) => (x.home.kind === 'winner' && x.home.of === m.id) || (x.away.kind === 'winner' && x.away.of === m.id))
    if (next) extra.push(`The winner advances to ${next.label} on ${fmtDate(next.date)}, ${next.time}, ${VENUE_SHORT[next.venue]}.`)
    if (m.round === 'SF') extra.push('The loser proceeds to the third-place play-off on 2 December 2026.')
    if (m.round === 'F') extra.push('The winner is crowned champion of Division Three (HK) Boys A Grade.')
    if (m.round === 'TP') extra.push('Contested by the two losing semi-finalists.')
    if (!m.score) extra.push('Knockout matches are decided on the day; the first-named team is the home team.')
  }

  const side = (name: string | null, label: string, seed: string, align: string) => (
    <div className={`flex-1 ${align}`}>
      {name ? <TeamBtn name={name} onTeam={onTeam} className="text-xl" /> : <span className="text-sm italic text-stone-500">{label}</span>}
      {seed && <div className="mt-0.5 text-xs text-stone-500">{seed}</div>}
    </div>
  )

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/30 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-2xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="liquid absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-stone-600">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12" /></svg>
        </button>
        <div className="px-6 pb-2 pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">{title}</p>
          <p className="text-sm text-stone-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3 px-6 py-5">
          {side(home, homeLabel, homeSeed, 'text-left')}
          <div className="text-center">
            <div className="text-3xl font-semibold tabular-nums">{score}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-stone-500">{status}</div>
          </div>
          {side(away, awayLabel, awaySeed, 'text-right')}
        </div>
        <dl className="space-y-2 border-t border-stone-200 px-6 py-4 text-sm">
          <div className="flex gap-3"><dt className="w-16 text-stone-500">Date</dt><dd>{fmtDate(date, true)}</dd></div>
          <div className="flex gap-3"><dt className="w-16 text-stone-500">Kick-off</dt><dd>{time}</dd></div>
          <div className="flex gap-3"><dt className="w-16 text-stone-500">Venue</dt><dd>{venue}</dd></div>
        </dl>
        {extra.length > 0 && (
          <div className="space-y-1 border-t border-stone-200 bg-stone-50/80 px-6 py-4 text-xs text-stone-600">
            {extra.map((e) => <p key={e}>{e}</p>)}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------- Team statistics ---------- */

interface TeamRec { team: string; gp: number; w: number; d: number; l: number; gf: number; ga: number; pts: number; cs: number }

function groupInfo(team: string) {
  const group = GROUP_MATCHES.find((m) => m.home === team || m.away === team)?.group
  if (!group) return { group: 99, position: 99 }
  const position = standings(group).findIndex((row) => row.team === team) + 1
  return { group, position: position || 99 }
}

function groupSeed(team: string) {
  const { group, position } = groupInfo(team)
  if (group === 99) return ''
  return `G${group}#${position === 99 ? '–' : position}`
}

function teamRecords(): TeamRec[] {
  const map = new Map<string, TeamRec>()
  const get = (t: string) => {
    if (!map.has(t)) map.set(t, { team: t, gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, cs: 0 })
    return map.get(t)!
  }
  const add = (t: string, f: number, c: number) => {
    const r = get(t)
    r.gp++; r.gf += f; r.ga += c
    if (f > c) { r.w++; r.pts += 3 } else if (f === c) { r.d++; r.pts++ } else r.l++
    if (c === 0) r.cs++
  }
  for (const m of GROUP_MATCHES) {
    if (m.hs === null || m.as === null) continue
    add(m.home, m.hs, m.as)
    add(m.away, m.as, m.hs)
  }
  for (const m of KO_MATCHES) {
    const h = slotTeam(m.home), a = slotTeam(m.away)
    if (!m.score || !h || !a) continue
    add(h, m.score[0], m.score[1])
    add(a, m.score[1], m.score[0])
  }
  return [...map.values()]
}

interface Metric { key: string; title: string; desc: string; value: (r: TeamRec) => number; fmt: (v: number) => string; higherIsBetter: boolean }
const pct = (v: number) => `${(v * 100).toFixed(0)}%`
const dec = (v: number) => v.toFixed(2)
const METRICS: Metric[] = [
  { key: 'win', title: 'Win rate', desc: 'Share of games won', value: (r) => r.w / r.gp, fmt: pct, higherIsBetter: true },
  { key: 'unbeaten', title: 'Unbeaten rate', desc: 'Share of games won or drawn (not lost)', value: (r) => (r.w + r.d) / r.gp, fmt: pct, higherIsBetter: true },
  { key: 'ppg', title: 'Points earned per game', desc: '3 for a win, 1 for a draw, before any disciplinary deduction', value: (r) => r.pts / r.gp, fmt: dec, higherIsBetter: true },
  { key: 'gf', title: 'Goals scored per game', desc: 'Average goals scored', value: (r) => r.gf / r.gp, fmt: dec, higherIsBetter: true },
  { key: 'ga', title: 'Goals conceded per game', desc: 'Average goals conceded (lower is better)', value: (r) => r.ga / r.gp, fmt: dec, higherIsBetter: false },
  { key: 'gd', title: 'Goal difference per game', desc: 'Average goals scored minus goals conceded', value: (r) => (r.gf - r.ga) / r.gp, fmt: (v) => (v > 0 ? '+' : '') + dec(v), higherIsBetter: true },
  { key: 'cs', title: 'Clean-sheet rate', desc: 'Share of games without conceding', value: (r) => r.cs / r.gp, fmt: pct, higherIsBetter: true },
]

function TeamStats({ onTeam }: { onTeam: (t: string) => void }) {
  const recs = useMemo(() => teamRecords().filter((r) => r.gp > 0), [])
  const [view, setView] = useState<'ranking' | 'metrics' | 'teams'>('ranking')
  const [activeMetric, setActiveMetric] = useState('win')
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['win', 'ppg'])
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [koOnly, setKoOnly] = useState(false)
  const [teamOrder, setTeamOrder] = useState<'alphabetical' | 'group'>('alphabetical')
  const [descending, setDescending] = useState(false)
  const [knockoutFirst, setKnockoutFirst] = useState(false)
  const active = METRICS.find((m) => m.key === activeMetric)!
  const comparisonMetrics = METRICS.filter((m) => selectedMetrics.includes(m.key))
  const compareTeams = (a: TeamRec, b: TeamRec) => {
    if (knockoutFirst) {
      const knockoutDifference = Number(ALL_KO_TEAMS.has(b.team)) - Number(ALL_KO_TEAMS.has(a.team))
      if (knockoutDifference) return knockoutDifference
    }
    let result = 0
    if (teamOrder === 'alphabetical') {
      result = a.team.localeCompare(b.team)
    } else {
      const ai = groupInfo(a.team), bi = groupInfo(b.team)
      result = ai.group - bi.group || ai.position - bi.position || a.team.localeCompare(b.team)
    }
    return descending ? -result : result
  }
  const visibleTeams = recs
    .filter((r) => !koOnly || ALL_KO_TEAMS.has(r.team))
    .sort(compareTeams)
  const comparedTeams = selectedTeams
    .map((name) => recs.find((r) => r.team === name))
    .filter((r): r is TeamRec => Boolean(r))
    .filter((r) => !koOnly || ALL_KO_TEAMS.has(r.team))
    .sort(compareTeams)

  const toggleMetric = (key: string) => {
    setSelectedMetrics((current) => current.includes(key) ? current.filter((k) => k !== key) : [...current, key])
  }
  const toggleTeam = (name: string) => {
    setSelectedTeams((current) => current.includes(name) ? current.filter((t) => t !== name) : [...current, name])
  }

  return (
    <div>
      <div className="mb-5 max-w-3xl text-sm text-stone-600">
        <p>
          Team-level statistics, expressed per game, are derived from all completed matches. The figure in brackets is the number of games played,
          which should be considered when comparing teams with small samples. Individual player statistics are not available.
        </p>
        <p className="mt-2 text-xs text-stone-500">Cancelled fixtures and those involving the withdrawn team are excluded. Walk-overs are counted at their recorded score.</p>
      </div>

      <div className="glass-surface mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 p-3">
        {([
          ['ranking', 'Statistic ranking'],
          ['metrics', 'Compare statistics'],
          ['teams', 'Compare teams'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`liquid rounded-full border px-4 py-1.5 text-sm ${
              view === key ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-stone-300 bg-white text-stone-700'
            }`}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto flex overflow-hidden rounded-full border border-stone-300 text-xs" role="group" aria-label="Team pool">
          <button onClick={() => setKoOnly(false)} className={`liquid px-3 py-1.5 ${!koOnly ? 'bg-emerald-800 text-white' : 'bg-white text-stone-700'}`}>All teams</button>
          <button onClick={() => setKoOnly(true)} className={`liquid px-3 py-1.5 ${koOnly ? 'bg-emerald-800 text-white' : 'bg-white text-stone-700'}`}>Knockout teams</button>
        </div>
      </div>

      {view === 'ranking' && (
        <>
          <StatChoice value={activeMetric} onChange={setActiveMetric} />
          <StatCard metric={active} recs={recs} koOnly={koOnly} onTeam={onTeam} />
        </>
      )}

      {view === 'metrics' && (
        <>
          <MultiMetricChoice selected={selectedMetrics} onToggle={toggleMetric} />
          {comparisonMetrics.length ? (
            <BalancedComparison items={comparisonMetrics} getKey={(metric) => metric.key}>
              {(metric) => (
                <StatCard key={metric.key} metric={metric} recs={recs} koOnly={koOnly} onTeam={onTeam} compact />
              )}
            </BalancedComparison>
          ) : (
            <EmptyComparison text="Choose one or more statistics above to build a comparison." />
          )}
        </>
      )}

      {view === 'teams' && (
        <>
          <div className="glass-surface mb-4 rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">Select teams</h3>
                <p className="text-xs text-stone-500">Select any number. The comparison layout adapts automatically.</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <label className="flex items-center gap-1.5 rounded-full border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs text-stone-700">
                  <input
                    type="checkbox"
                    checked={knockoutFirst}
                    onChange={(e) => setKnockoutFirst(e.target.checked)}
                    className="accent-emerald-800"
                  />
                  Knockout teams first
                </label>
                <select
                  value={teamOrder}
                  onChange={(e) => setTeamOrder(e.target.value as 'alphabetical' | 'group')}
                  aria-label="Arrange teams by"
                  className="rounded-full border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs text-stone-700 outline-none focus:border-emerald-700"
                >
                  <option value="alphabetical">Alphabetical</option>
                  <option value="group">Group and position</option>
                </select>
                <button
                  onClick={() => setDescending((value) => !value)}
                  className="liquid flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 bg-stone-50 text-stone-700"
                  aria-label={descending ? 'Change to increasing order' : 'Change to decreasing order'}
                  title={descending ? 'Currently decreasing; change to increasing' : 'Currently increasing; change to decreasing'}
                >
                  <svg className={descending ? 'rotate-180' : ''} width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 12V2M3.5 5.5 7 2l3.5 3.5" />
                  </svg>
                </button>
                {selectedTeams.length > 0 && (
                  <button onClick={() => setSelectedTeams([])} className="px-1 text-xs font-medium text-emerald-800 hover:underline">Clear selection</button>
                )}
              </div>
            </div>
            <div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
              {visibleTeams.map((r) => {
                const selected = selectedTeams.includes(r.team)
                return (
                  <button
                    key={r.team}
                    onClick={() => toggleTeam(r.team)}
                    aria-pressed={selected}
                    className={`liquid rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      selected ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-stone-300 bg-stone-50 text-stone-700'
                    }`}
                  >
                    {r.team} <span className="font-normal opacity-75">({groupSeed(r.team)})</span>
                  </button>
                )
              })}
            </div>
          </div>
          <MultiMetricChoice selected={selectedMetrics} onToggle={toggleMetric} label="Statistics shown for each team" />
          {comparedTeams.length ? (
            <BalancedComparison items={comparedTeams} getKey={(r) => r.team} minCardWidth={300}>
              {(r) => (
                <TeamStatCard key={r.team} rec={r} metrics={comparisonMetrics} onTeam={onTeam} />
              )}
            </BalancedComparison>
          ) : (
            <EmptyComparison text="Select at least one team to begin the comparison." />
          )}
        </>
      )}
    </div>
  )
}

function BalancedComparison<T>({
  items,
  getKey,
  children,
  minCardWidth = 340,
}: {
  items: T[]
  getKey: (item: T) => string
  children: (item: T) => ReactNode
  minCardWidth?: number
}) {
  const firstCount = items.length <= 3 ? items.length : Math.ceil(items.length / 2)
  const rows = items.length <= 3 ? [items] : [items.slice(0, firstCount), items.slice(firstCount)]
  const minWidth = Math.max(0, firstCount * minCardWidth + (firstCount - 1) * 20)
  return (
    <div className="overflow-x-auto pb-2">
      <div className="space-y-5" style={{ minWidth }}>
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid gap-5" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
            {row.map((item) => <div key={getKey(item)}>{children(item)}</div>)}
          </div>
        ))}
      </div>
    </div>
  )
}

function StatChoice({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Statistic">
      {METRICS.map((metric) => (
        <button
          key={metric.key}
          role="tab"
          aria-selected={value === metric.key}
          onClick={() => onChange(metric.key)}
          className={`liquid rounded-full border px-4 py-1.5 text-sm ${
            value === metric.key ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-stone-300 bg-white text-stone-700'
          }`}
        >
          {metric.title}
        </button>
      ))}
    </div>
  )
}

function MultiMetricChoice({
  selected,
  onToggle,
  label = 'Choose statistics to compare',
}: {
  selected: string[]
  onToggle: (key: string) => void
  label?: string
}) {
  return (
    <div className="glass-surface mb-5 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">{label}</h3>
          <p className="text-xs text-stone-500">No selection limit. Selected statistics appear together below.</p>
        </div>
        <span className="shrink-0 text-xs text-stone-500">{selected.length} selected</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {METRICS.map((metric) => {
          const active = selected.includes(metric.key)
          return (
            <button
              key={metric.key}
              onClick={() => onToggle(metric.key)}
              aria-pressed={active}
              className={`liquid rounded-full border px-3 py-1.5 text-xs font-medium ${
                active ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-stone-300 bg-stone-50 text-stone-700'
              }`}
            >
              {metric.title}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StatCard({
  metric,
  recs,
  koOnly,
  onTeam,
  compact = false,
}: {
  metric: Metric
  recs: TeamRec[]
  koOnly: boolean
  onTeam: (t: string) => void
  compact?: boolean
}) {
  const rows = useMemo(() => {
    const list = recs.filter((r) => !koOnly || ALL_KO_TEAMS.has(r.team))
    return list
      .map((r) => ({ r, v: metric.value(r) }))
      .sort((a, b) => (metric.higherIsBetter ? b.v - a.v : a.v - b.v) || b.r.gp - a.r.gp || a.r.team.localeCompare(b.r.team))
  }, [recs, koOnly, metric])
  const max = Math.max(...rows.map((x) => Math.abs(x.v)), 0.0001)
  return (
    <section className="glass-surface rounded-xl border border-stone-200 bg-white">
      <div className="border-b border-stone-100 p-4">
        <div>
          <h3 className="font-semibold">{metric.title}</h3>
          <p className="text-xs text-stone-500">{metric.desc}</p>
        </div>
      </div>
      <ol className={`${compact ? 'max-h-[24rem]' : 'max-h-[34rem]'} overflow-y-auto p-2`}>
        {rows.map(({ r, v }, i) => (
          <li key={r.team} className="liquid flex items-center gap-3 rounded-md px-2 py-1.5 text-sm">
            <span className="w-6 text-right text-xs text-stone-400 tabular-nums">{i + 1}</span>
            <span className="w-32 shrink-0">
              <TeamBtn name={r.team} onTeam={onTeam} />
              <span className="ml-1 text-xs text-stone-500">({groupSeed(r.team)})</span>
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
              <span
                className={`block h-full min-w-2 rounded-full ${ALL_KO_TEAMS.has(r.team) ? 'bg-emerald-600' : 'bg-stone-400'}`}
                style={{ width: v === 0 ? 8 : `${Math.max(2, (Math.abs(v) / max) * 100)}%` }}
              />
            </span>
            <span className="w-24 shrink-0 text-right tabular-nums">
              <span className="font-semibold">{metric.fmt(v)}</span>
              <span className="ml-1 text-xs text-stone-500">({r.gp})</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="border-t border-stone-100 px-4 py-2 text-[11px] text-stone-500">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-600" /> Reached knockout
        <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-full bg-stone-400" /> Did not advance · (n) = games played
      </p>
    </section>
  )
}

function TeamStatCard({ rec, metrics, onTeam }: { rec: TeamRec; metrics: Metric[]; onTeam: (t: string) => void }) {
  return (
    <section className="glass-surface overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="flex items-center justify-between bg-emerald-950 px-5 py-4 text-white">
        <div>
          <TeamBtn name={rec.team} onTeam={onTeam} className="text-lg text-white hover:text-emerald-200" />
          <span className="ml-2 text-xs text-emerald-200">({groupSeed(rec.team)})</span>
        </div>
        <span className="rounded-full bg-emerald-900 px-2.5 py-1 text-xs text-emerald-100">{rec.gp} games</span>
      </div>
      {metrics.length ? (
        <dl className="divide-y divide-stone-100">
          {metrics.map((metric) => (
            <div key={metric.key} className="liquid flex items-center justify-between gap-4 px-5 py-3">
              <div>
                <dt className="text-sm font-medium">{metric.title}</dt>
                <dd className="text-xs text-stone-500">{metric.desc}</dd>
              </div>
              <dd className="shrink-0 text-xl font-semibold tabular-nums">
                {metric.fmt(metric.value(rec))}
                <span className="ml-1 text-xs font-normal text-stone-500">({rec.gp})</span>
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="p-5 text-sm text-stone-500">Select at least one statistic to display.</p>
      )}
    </section>
  )
}

function EmptyComparison({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center text-sm text-stone-500">
      {text}
    </div>
  )
}

/* ---------- Monte Carlo knockout simulation ---------- */

type FinishKey = 'r14' | 'qf' | 'fourth' | 'third' | 'runnerUp' | 'champion'

interface SimAggregate {
  team: string
  matches: number
  wins: number
  gf: number
  ga: number
  finishes: Record<FinishKey, number>
}

interface SimulationRun {
  id: number
  createdAt: Date
  count: number
  aggregates: SimAggregate[]
}

interface SimMatchResult {
  home: string
  away: string
  hg: number
  ag: number
  winner: string
  loser: string
}

const FINISHES: { key: FinishKey; short: string; full: string }[] = [
  { key: 'r14', short: 'R14', full: 'Round of 14' },
  { key: 'qf', short: 'QF', full: 'Quarter-final' },
  { key: 'fourth', short: '4th', full: 'Fourth place' },
  { key: 'third', short: '3rd', full: 'Third place' },
  { key: 'runnerUp', short: '2nd', full: 'Runner-up' },
  { key: 'champion', short: '1st', full: 'Champion' },
]

function poisson(lambda: number) {
  const limit = Math.exp(-lambda)
  let product = 1
  let value = 0
  do {
    value++
    product *= Math.random()
  } while (product > limit)
  return value - 1
}

function simulationStrengths() {
  // Large scorelines contain information, but the difference between scoring
  // six and fourteen is not eight times as informative. The tail is compressed
  // before fitting attack and defence, which stops one mismatch dominating.
  const effectiveGoals = (goals: number) =>
    goals <= 5 ? goals : 5 + Math.log1p(goals - 5) * 0.45
  const observations: { home: string; away: string; hg: number; ag: number }[] = GROUP_MATCHES
    .filter((m) => m.hs !== null && m.as !== null)
    .map((m) => ({ home: m.home, away: m.away, hg: effectiveGoals(m.hs!), ag: effectiveGoals(m.as!) }))

  for (const m of KO_MATCHES) {
    const home = slotTeam(m.home), away = slotTeam(m.away)
    if (m.score && home && away) {
      observations.push({ home, away, hg: effectiveGoals(m.score[0]), ag: effectiveGoals(m.score[1]) })
    }
  }

  const teams = [...new Set(observations.flatMap((m) => [m.home, m.away]))]
  const totalGoals = observations.reduce((sum, m) => sum + m.hg + m.ag, 0)
  const average = totalGoals / Math.max(1, observations.length * 2)
  const priorGames = 3
  let attack = new Map(teams.map((team) => [team, 1]))
  let defence = new Map(teams.map((team) => [team, 1]))

  // Iterative opponent adjustment: scoring against a strong defence is worth
  // more, while conceding to a strong attack is penalised less. Bayesian
  // shrinkage keeps small or unusually easy groups close to the competition
  // baseline until cross-group knockout evidence becomes available.
  for (let iteration = 0; iteration < 14; iteration++) {
    const totals = new Map(teams.map((team) => [team, { attack: 0, defence: 0, games: 0 }]))
    for (const m of observations) {
      const h = totals.get(m.home)!, a = totals.get(m.away)!
      h.attack += m.hg / Math.max(0.35, average * defence.get(m.away)!)
      h.defence += m.ag / Math.max(0.35, average * attack.get(m.away)!)
      a.attack += m.ag / Math.max(0.35, average * defence.get(m.home)!)
      a.defence += m.hg / Math.max(0.35, average * attack.get(m.home)!)
      h.games++; a.games++
    }
    const nextAttack = new Map<string, number>()
    const nextDefence = new Map<string, number>()
    for (const team of teams) {
      const t = totals.get(team)!
      nextAttack.set(team, (priorGames + t.attack) / (priorGames + t.games))
      nextDefence.set(team, (priorGames + t.defence) / (priorGames + t.games))
    }
    const attackMean = Math.exp([...nextAttack.values()].reduce((sum, value) => sum + Math.log(value), 0) / teams.length)
    const defenceMean = Math.exp([...nextDefence.values()].reduce((sum, value) => sum + Math.log(value), 0) / teams.length)
    attack = new Map(teams.map((team) => [team, nextAttack.get(team)! / attackMean]))
    defence = new Map(teams.map((team) => [team, nextDefence.get(team)! / defenceMean]))
  }

  return {
    average,
    records: new Map(teams.map((team) => [
      team,
      {
        attack: attack.get(team)! * average,
        defence: defence.get(team)! * average,
      },
    ])),
  }
}

function simulateMatch(id: string, home: string, away: string, strengths: ReturnType<typeof simulationStrengths>): SimMatchResult {
  const official = koById(id)
  if (official.score) {
    const winner = koWinner(official)
    if (winner) {
      return {
        home,
        away,
        hg: official.score[0],
        ag: official.score[1],
        winner,
        loser: winner === home ? away : home,
      }
    }
  }

  const neutral = { attack: strengths.average, defence: strengths.average }
  const h = strengths.records.get(home) ?? neutral
  const a = strengths.records.get(away) ?? neutral
  const homeAdvantage = 1.06
  const homeLambda = Math.min(6, Math.max(0.12, strengths.average * (h.attack / strengths.average) * (a.defence / strengths.average) * homeAdvantage))
  const awayLambda = Math.min(6, Math.max(0.12, strengths.average * (a.attack / strengths.average) * (h.defence / strengths.average) / homeAdvantage))
  let hg = poisson(homeLambda)
  let ag = poisson(awayLambda)

  // A knockout tie proceeds through extra time; a remaining tie is resolved
  // by a strength-weighted shoot-out. Shoot-out kicks are not counted as goals.
  if (hg === ag) {
    hg += poisson(homeLambda / 3)
    ag += poisson(awayLambda / 3)
  }
  let winner: string
  if (hg !== ag) {
    winner = hg > ag ? home : away
  } else {
    const homeChance = homeLambda / (homeLambda + awayLambda)
    winner = Math.random() < homeChance ? home : away
  }
  return { home, away, hg, ag, winner, loser: winner === home ? away : home }
}

function runOneSimulation(
  strengths: ReturnType<typeof simulationStrengths>,
  aggregate: Map<string, SimAggregate>,
) {
  const finish = (team: string, key: FinishKey) => { aggregate.get(team)!.finishes[key]++ }
  const play = (id: string, home: string, away: string) => {
    const result = simulateMatch(id, home, away, strengths)
    const h = aggregate.get(home)!, a = aggregate.get(away)!
    h.matches++; a.matches++
    h.gf += result.hg; h.ga += result.ag
    a.gf += result.ag; a.ga += result.hg
    aggregate.get(result.winner)!.wins++
    return result
  }

  const r1 = play('R1', 'IKTMC', 'QC'); finish(r1.loser, 'r14')
  const r2 = play('R2', 'KCC', 'LHYMSS'); finish(r2.loser, 'r14')
  const r3 = play('R3', 'SJA', 'ISS'); finish(r3.loser, 'r14')
  const r4 = play('R4', 'KWSC', 'CFSS'); finish(r4.loser, 'r14')
  const r5 = play('R5', 'HW', 'SKHTSK'); finish(r5.loser, 'r14')
  const r6 = play('R6', 'HKUGA', 'SPCC'); finish(r6.loser, 'r14')

  const q1 = play('Q1', 'SKHLMC', r1.winner); finish(q1.loser, 'qf')
  const q2 = play('Q2', r2.winner, r3.winner); finish(q2.loser, 'qf')
  const q3 = play('Q3', r4.winner, r5.winner); finish(q3.loser, 'qf')
  const q4 = play('Q4', r6.winner, 'CANADIAN'); finish(q4.loser, 'qf')

  const s1 = play('S1', q1.winner, q2.winner)
  const s2 = play('S2', q3.winner, q4.winner)
  const third = play('TP', s1.loser, s2.loser)
  finish(third.loser, 'fourth')
  finish(third.winner, 'third')
  const final = play('F', s1.winner, s2.winner)
  finish(final.loser, 'runnerUp')
  finish(final.winner, 'champion')
}

function SimulationPlaceholder() {
  const [count, setCount] = useState(1000)
  const [runs, setRuns] = useState<SimulationRun[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [sort, setSort] = useState<FinishKey | 'wins' | 'gf' | 'ga'>('champion')
  const [query, setQuery] = useState('')
  const cancelled = useRef(false)
  const active = runs.find((run) => run.id === activeId) ?? runs[0]

  const start = async () => {
    const simulations = Math.max(1, Math.min(100000, Math.round(count || 1)))
    setCount(simulations)
    setRunning(true)
    setProgress(0)
    cancelled.current = false
    const teams = [...ALL_KO_TEAMS].sort()
    const aggregate = new Map<string, SimAggregate>(teams.map((team) => [
      team,
      {
        team,
        matches: 0,
        wins: 0,
        gf: 0,
        ga: 0,
        finishes: { r14: 0, qf: 0, fourth: 0, third: 0, runnerUp: 0, champion: 0 },
      },
    ]))
    const strengths = simulationStrengths()
    // Use approximately 100 equal visual steps regardless of run size. A fixed
    // batch made small runs jump abruptly and large runs appear out of sync.
    const batchSize = Math.max(1, Math.ceil(simulations / 100))
    for (let i = 0; i < simulations; i += batchSize) {
      const end = Math.min(simulations, i + batchSize)
      for (let j = i; j < end; j++) runOneSimulation(strengths, aggregate)
      setProgress(end / simulations)
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      if (cancelled.current) {
        setRunning(false)
        return
      }
    }
    const run: SimulationRun = {
      id: Date.now(),
      createdAt: new Date(),
      count: simulations,
      aggregates: [...aggregate.values()],
    }
    setRuns((current) => [run, ...current].slice(0, 12))
    setActiveId(run.id)
    setRunning(false)
  }

  const rows = useMemo(() => {
    if (!active) return []
    const value = (r: SimAggregate) => {
      if (sort === 'wins') return r.wins / active.count
      if (sort === 'gf') return r.gf / active.count
      if (sort === 'ga') return r.ga / active.count
      return r.finishes[sort] / active.count
    }
    return active.aggregates
      .filter((r) => `${r.team} ${groupSeed(r.team)}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => sort === 'ga' ? value(a) - value(b) : value(b) - value(a))
  }, [active, query, sort])

  const exportCsv = () => {
    if (!active) return
    const header = ['Team', 'Simulations', 'Avg wins', 'Avg goals scored', 'Avg goals conceded', ...FINISHES.map((f) => f.full)]
    const lines = active.aggregates.map((r) => [
      r.team,
      active.count,
      (r.wins / active.count).toFixed(4),
      (r.gf / active.count).toFixed(4),
      (r.ga / active.count).toFixed(4),
      ...FINISHES.map((f) => r.finishes[f.key]),
    ])
    const csv = [header, ...lines].map((line) => line.join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `knockout-simulation-${active.count}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const top = active
    ? [...active.aggregates].sort((a, b) => b.finishes.champion - a.finishes.champion).slice(0, 3)
    : []

  return (
    <div>
      <div className="mb-6 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Monte Carlo knockout simulation</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Simulate the final round</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Each simulation plays the official 14-team bracket from the Round of 14 through the final and third-place play-off.
          Completed knockout results are treated as fixed. Remaining matches use smoothed scoring and conceding rates from the available team data.
        </p>
      </div>

      <section className="glass-surface mb-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">Number of simulations</span>
            <input
              type="number"
              min={1}
              max={100000}
              step={100}
              value={count}
              disabled={running}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-44 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm tabular-nums outline-none focus:border-emerald-700"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {[100, 1000, 10000, 50000].map((n) => (
              <button
                key={n}
                disabled={running}
                onClick={() => setCount(n)}
                className={`liquid rounded-full border px-3 py-2 text-xs font-medium ${count === n ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-stone-300 bg-white text-stone-700'}`}
              >
                {n.toLocaleString()}
              </button>
            ))}
          </div>
          {running ? (
            <button onClick={() => { cancelled.current = true }} className="ml-auto rounded-lg border border-rose-300 bg-rose-50 px-5 py-2 text-sm font-semibold text-rose-700">
              Stop simulation
            </button>
          ) : (
            <button onClick={start} className="liquid ml-auto rounded-lg bg-emerald-800 px-5 py-2 text-sm font-semibold text-white shadow-sm">
              Run simulation
            </button>
          )}
        </div>
        {running && (
          <div className="mt-5">
            <div className="mb-1 flex justify-between text-xs text-stone-500">
              <span>Running tournament simulations…</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-stone-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-stone-500">
          Storage remains compact: a run saves only aggregate wins, goals, matches and finishing counts for 14 teams—not individual simulated fixtures.
          Up to 12 run summaries are retained for this browser session.
        </p>
      </section>

      {!active ? (
        <EmptyComparison text="Choose the number of simulations and run the model to generate probabilities." />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <label className="text-sm text-stone-600">
              Run
              <select
                value={active.id}
                onChange={(e) => setActiveId(Number(e.target.value))}
                className="ml-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700"
              >
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.count.toLocaleString()} simulations · {run.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={exportCsv} className="liquid rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700">
              Export aggregate CSV
            </button>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {top.map((r, index) => (
              <div key={r.team} className={`liquid rounded-xl border p-4 ${index === 0 ? 'border-amber-300 bg-amber-50' : 'border-stone-200 bg-white'}`}>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">#{index + 1} title probability</p>
                <p className="mt-1 text-lg font-semibold">{r.team} <span className="text-xs font-normal text-stone-500">({groupSeed(r.team)})</span></p>
                <p className={`mt-2 text-3xl font-semibold tabular-nums ${index === 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                  {((r.finishes.champion / active.count) * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>

          <section className="glass-surface overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b border-stone-200 p-4">
              <div>
                <h3 className="font-semibold">Aggregate outcomes</h3>
                <p className="text-xs text-stone-500">Percentages show the share of {active.count.toLocaleString()} simulations ending in each position.</p>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter teams"
                className="ml-auto w-40 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-emerald-700"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-sm">
                <thead className="bg-stone-100 text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Team</th>
                    {[
                      ['wins', 'Wins / sim'],
                      ['gf', 'GF / sim'],
                      ['ga', 'GA / sim'],
                      ...FINISHES.map((f) => [f.key, f.short]),
                    ].map(([key, label]) => (
                      <th key={key} className="px-3 py-3 text-right">
                        <button onClick={() => setSort(key as typeof sort)} className={`liquid rounded px-1 py-0.5 ${sort === key ? 'font-bold text-emerald-800' : 'hover:text-stone-800'}`}>
                          {label}{sort === key ? ' ↓' : ''}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.team} className="liquid border-t border-stone-100">
                      <td className="px-4 py-3 font-semibold">{r.team} <span className="text-xs font-normal text-stone-500">({groupSeed(r.team)})</span></td>
                      <td className="px-3 py-3 text-right tabular-nums">{(r.wins / active.count).toFixed(2)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{(r.gf / active.count).toFixed(2)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{(r.ga / active.count).toFixed(2)}</td>
                      {FINISHES.map((finish) => (
                        <td key={finish.key} className={`px-3 py-3 text-right tabular-nums ${finish.key === 'champion' ? 'font-semibold text-emerald-800' : ''}`}>
                          {((r.finishes[finish.key] / active.count) * 100).toFixed(1)}%
                          <span className="ml-1 text-[10px] text-stone-400">({r.finishes[finish.key]})</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <details className="glass-surface mt-5 rounded-xl border border-stone-200 bg-white p-4 text-sm">
            <summary className="cursor-pointer font-semibold">Model and data notes</summary>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-stone-600">
              <li>Goals are sampled from Poisson distributions using opponent-adjusted attack and defence ratings, not raw group totals alone.</li>
              <li>Extreme scorelines use diminishing weight: a 14–0 result remains strong evidence, but does not count as fourteen ordinary one-goal events.</li>
              <li>Ratings are adjusted iteratively for opponent quality and pulled toward the competition average when the sample is small or isolated within one group.</li>
              <li>Before cross-group knockout results exist, absolute group strength cannot be identified from results alone; the model therefore avoids assuming that a dominant record automatically means a dominant group.</li>
              <li>A modest 6% first-named-team advantage is applied. Expected goals are constrained to avoid unstable extremes from small samples.</li>
              <li>Draws proceed to simulated extra time and then a strength-weighted shoot-out. Shoot-out kicks do not count as goals.</li>
              <li>Official knockout scores entered into the fixture data are fixed in every run; only unresolved matches are simulated.</li>
              <li>Finishing categories are mutually exclusive: Round of 14, quarter-final, fourth, third, runner-up and champion.</li>
            </ul>
          </details>
        </>
      )}
    </div>
  )
}
