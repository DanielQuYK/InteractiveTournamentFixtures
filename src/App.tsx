import { usePersistentState } from './lib/hooks'
import { useEffect, useState } from 'react'
import { type Detail, type Tab } from './components/shared'
import { GroupStage } from './components/GroupStage'
import { Knockout } from './components/Knockout'
import { TeamPanel } from './components/TeamPanel'
import { MatchModal } from './components/MatchModal'
import { TeamStats } from './components/TeamStats'
import { Simulation } from './components/Simulation'

export default function App() {
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
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">Inter-School Football Competition 2026–2027</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Division Three (HK) · Boys A Grade</h1>
          <p className="mt-1 text-sm text-emerald-200/80">Group stage results and final round (single knock-out)</p>
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
        ) : (
          <Simulation />
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

