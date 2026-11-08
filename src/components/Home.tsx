import { useState } from 'react'
import { DIVISIONS } from '../lib/divisions'
import type { DivisionConfig } from '../lib/divisions'

const GRADES = [
  { id: 'A', name: 'A Grade', available: true },
  { id: 'B', name: 'B Grade', available: false },
  { id: 'C', name: 'C Grade', available: false },
]

/** Games with a recorded score out of all games that can be played (cancelled fixtures excluded). */
function progress(d: DivisionConfig) {
  const rows = d.groupsRaw.trim().split('\n').map((l) => l.split('|'))
  const live = rows.filter((r) => r[7] !== '-:-' && r[8] !== 'C' && !d.withdrawn[r[4]] && !d.withdrawn[r[5]])
  return { played: live.filter((r) => r[7].includes(':') && r[7] !== '-:-').length, total: live.length }
}

const LEVELS = [...new Set(DIVISIONS.map((d) => d.level))]

export function Home({ onOpen }: { onOpen: (id: string) => void }) {
  const [grade, setGrade] = useState('A')
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 antialiased">
      <header className="bg-emerald-950 text-white">
        <div className="mx-auto max-w-6xl px-3 pb-10 pt-10 sm:px-5 sm:pt-14">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">Inter-School Football Competition 2026–2027</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Choose a competition</h1>
          <p className="mt-2 max-w-xl text-sm text-emerald-200/80">
            Pick a grade, then a division and region, to see its group tables, final-round bracket, team statistics and
            simulations. Every competition is kept entirely separate.
          </p>
          <div className="mt-7 flex flex-wrap gap-2" role="group" aria-label="Grade">
            {GRADES.map((g) => (
              <button
                key={g.id}
                disabled={!g.available}
                aria-pressed={grade === g.id}
                onClick={() => setGrade(g.id)}
                className={`liquid liquid-dark rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
                  grade === g.id ? 'border-white bg-white text-emerald-950' : 'border-emerald-700 text-emerald-100'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {g.name}
                {!g.available && <span className="ml-2 text-[11px] font-normal uppercase tracking-wide">Not yet available</span>}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-3 py-8 sm:px-5 sm:py-10">
        {LEVELS.map((level) => (
          <section key={level} aria-labelledby={`level-${level}`}>
            <h2 id={`level-${level}`} className="mb-4 text-lg font-semibold tracking-tight">{level}</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {DIVISIONS.filter((d) => d.level === level).map((d) => {
                const p = progress(d)
                return (
                  <li key={d.id}>
                    <button
                      onClick={() => onOpen(d.id)}
                      className="liquid glass-surface group flex h-full w-full flex-col rounded-xl border border-stone-200 bg-white p-5 text-left transition-colors hover:border-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                    >
                      <span className="text-xs font-medium uppercase tracking-wide text-emerald-800">{d.region || 'All regions'}</span>
                      <span className="mt-1 text-lg font-semibold leading-snug">{d.title.replace(' · Boys A Grade', '')}</span>
                      <span className="mt-1 text-sm text-stone-600">{d.blurb}</span>
                      <span className="mt-4 flex items-center justify-between gap-3 text-xs text-stone-600">
                        <span>{p.played} of {p.total} group games played</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-medium ${
                            d.lineupConfirmed ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {d.lineupConfirmed ? 'Final round set' : 'Line-up to be drawn'}
                        </span>
                      </span>
                      <span className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
                        <span className="block h-full rounded-full bg-emerald-700" style={{ width: `${(p.played / Math.max(1, p.total)) * 100}%` }} />
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
        <p className="border-t border-stone-200 pt-4 text-xs text-stone-500">
          Grade A boys competitions only. B and C Grade will appear here once their fixture documents are available.
          Fixtures and results follow the organisers’ published documents.
        </p>
      </main>
    </div>
  )
}
