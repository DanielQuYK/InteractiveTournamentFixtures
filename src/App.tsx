import { usePersistentState } from './lib/hooks'
import { BackToTop } from './components/BackToTop'
import { useEffect, useState } from 'react'
import { type Detail, type Tab } from './components/shared'
import { GroupStage } from './components/GroupStage'
import { Knockout } from './components/Knockout'
import { TeamPanel } from './components/TeamPanel'
import { MatchModal } from './components/MatchModal'
import { TeamStats } from './components/TeamStats'
import { Simulation } from './components/Simulation'
import { Home } from './components/Home'
import { Leaderboard } from './components/Leaderboard'
import { simulationBlockers } from './lib/readiness'
import { stageOf } from './lib/stage'
import { activeDivision, setActiveDivision } from './lib/data'
import { divisionById } from './lib/divisions'

function DivisionPage({ onHome }: { onHome: () => void }) {
  const division = activeDivision()
  const blockers = simulationBlockers()
  const stage = stageOf(division)
  const TABS: Tab[] = ['group', 'knockout', 'leaderboard', 'stats', 'simulation']
  const TAB_NAMES: Record<Tab, string> = { group: 'Group Stage', knockout: 'Knockout', leaderboard: 'Leaderboard', stats: 'Team Stats', simulation: 'Simulation' }

  useEffect(() => {
    document.title = `${division.title} · Inter-School Football 2026–27`
    return () => { document.title = 'Inter-School Football Competition 2026–27' }
  }, [division.title])

  // Arrow keys, Home and End move between tabs, as people expect from a tab list
  const onTabKey = (e: React.KeyboardEvent, index: number) => {
    const next =
      e.key === 'ArrowRight' ? (index + 1) % TABS.length
      : e.key === 'ArrowLeft' ? (index + TABS.length - 1) % TABS.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? TABS.length - 1
      : -1
    if (next < 0) return
    e.preventDefault()
    setTab(TABS[next])
    document.getElementById(`tab-${TABS[next]}`)?.focus()
  }
  const [tab, setTab] = usePersistentState<Tab>('tab', 'group')
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
        <div className="mx-auto max-w-6xl px-3 pt-8 pb-0 sm:px-5">
          <button
            onClick={onHome}
            className="liquid liquid-dark -ml-2 mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-emerald-200 hover:text-white"
          >
            <span aria-hidden="true">←</span> All competitions
          </button>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">Inter-School Football Competition 2026–2027</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{division.title}</h1>
          <p className="mt-1 text-sm text-emerald-200/80">
            {division.region ? `${division.region} · ` : ''}{division.koMatches.length > 0 ? 'Group stage results and final round (single knock-out)' : 'Group stage fixtures and results'}{division.documentDate ? ` · fixtures as published ${division.documentDate}` : ''}
          </p>
          <p className="mt-3 inline-flex max-w-full flex-wrap items-baseline gap-x-2 rounded-lg bg-emerald-900/60 px-3 py-1.5 text-xs text-emerald-100">
            <span className="font-semibold uppercase tracking-widest text-emerald-300">Latest stage</span>
            <span className="font-semibold text-white">{stage.label}</span>
            <span className="text-emerald-200/90">{stage.detail}</span>
          </p>
          <nav className="-mx-2 mt-5 flex gap-1 overflow-x-auto px-2 pt-2" role="tablist" aria-label="Competition sections">
            {TABS.map((t, i) => (
              <button
                key={t}
                id={`tab-${t}`}
                role="tab"
                aria-selected={tab === t}
                aria-controls="tab-panel"
                tabIndex={tab === t ? 0 : -1}
                onClick={() => setTab(t)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={`main-tab liquid liquid-dark shrink-0 whitespace-nowrap rounded-t-lg px-5 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-300 ${
                  tab === t ? 'bg-stone-50 text-emerald-950' : 'text-emerald-100'
                }`}
              >
                {TAB_NAMES[t]}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main id="tab-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mx-auto max-w-6xl px-3 py-6 sm:px-5 sm:py-8">
        {tab === 'group' ? (
          <GroupStage onTeam={setTeam} onMatch={setDetail} />
        ) : tab === 'knockout' ? (
          <Knockout onTeam={setTeam} onMatch={setDetail} />
        ) : tab === 'leaderboard' ? (
          <Leaderboard onTeam={setTeam} />
        ) : tab === 'stats' ? (
          <TeamStats onTeam={setTeam} />
        ) : blockers.length === 0 ? (
          <Simulation />
        ) : (
          <div className="glass-surface max-w-2xl rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900" role="note">
            <p className="font-semibold">Simulation is not available yet</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {blockers.map((b) => <li key={b}>{b}</li>)}
            </ul>
            <p className="mt-3">
              Team strength is judged only from this competition’s own results.
              {division.grade === 'B'
                ? ' A school’s A Grade results are deliberately not used: a strong A Grade squad says little about its B Grade team, which has different players.'
                : ' Results from other divisions are never used.'}{' '}
              The simulation will unlock once these conditions are met; nothing is assumed in the meantime.
            </p>
          </div>
        )}
        <p className="mt-10 border-t border-stone-200 pt-4 text-xs text-stone-500">
          Teams are shown by the school abbreviations used in the official fixture documents. Select any team name to view its
          complete fixtures. Per-player statistics are not published, as insufficient data is available.
        </p>
      </main>

      <BackToTop />

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


const routeId = () => window.location.hash.replace(/^#\/?/, '')

/** Home page, or one competition's dashboard. Each competition is rendered in isolation under its own key. */
export default function App() {
  const [id, setId] = useState(routeId)
  useEffect(() => {
    const sync = () => setId(routeId())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  const division = divisionById(id)
  const open = (next: string) => {
    window.location.hash = next ? `#/${next}` : '#/'
    window.scrollTo(0, 0)
  }
  if (!division) return <Home onOpen={open} />
  // Select the division before any child reads its data
  setActiveDivision(division.id)
  return <DivisionPage key={division.id} onHome={() => open('')} />
}
