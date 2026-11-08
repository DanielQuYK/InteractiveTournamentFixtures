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
import { activeDivision, setActiveDivision } from './lib/data'
import { divisionById } from './lib/divisions'

function DivisionPage({ onHome }: { onHome: () => void }) {
  const division = activeDivision()
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
            {division.region ? `${division.region} · ` : ''}Group stage results and final round (single knock-out) · fixtures as published {division.documentDate}
          </p>
          <nav className="-mx-2 mt-5 flex gap-1 overflow-x-auto px-2 pt-2" role="tablist">
            {(['group', 'knockout', 'stats', 'simulation'] as Tab[]).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`main-tab liquid liquid-dark rounded-t-lg px-5 py-2.5 text-sm font-medium ${
                  tab === t ? 'bg-stone-50 text-emerald-950' : 'text-emerald-100'
                }`}
              >
                {t === 'group' ? 'Group Stage' : t === 'knockout' ? 'Knockout' : t === 'stats' ? 'Team Stats' : 'Simulation'}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-5 sm:py-8">
        {tab === 'group' ? (
          <GroupStage onTeam={setTeam} onMatch={setDetail} />
        ) : tab === 'knockout' ? (
          <Knockout onTeam={setTeam} onMatch={setDetail} />
        ) : tab === 'stats' ? (
          <TeamStats onTeam={setTeam} />
        ) : division.lineupConfirmed ? (
          <Simulation />
        ) : (
          <div className="glass-surface max-w-2xl rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900" role="note">
            <p className="font-semibold">Simulation is not available yet</p>
            <p className="mt-1">
              The organisers have not yet drawn the final-round line-up for {division.title.replace(' · Boys A Grade', '')}, so
              there are no knockout pairings to simulate. It will become available as soon as the line-up is published; no
              line-up is assumed in the meantime.
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
