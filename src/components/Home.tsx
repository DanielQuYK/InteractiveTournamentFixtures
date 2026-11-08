import { useState } from 'react'
import { divisionsForGrade } from '../lib/divisions'
import { groupProgress, koProgress, stageOf } from '../lib/stage'

const GRADES = [
  { id: 'A', name: 'A Grade', available: true },
  { id: 'B', name: 'B Grade', available: true },
  { id: 'C', name: 'C Grade', available: false },
]

const savedGrade = () => {
  try {
    return sessionStorage.getItem('home-grade') === 'B' ? 'B' : 'A'
  } catch {
    return 'A'
  }
}

const TONE = {
  idle: 'border-amber-300 bg-amber-50 text-amber-950',
  active: 'border-emerald-300 bg-emerald-50 text-emerald-950',
  done: 'border-stone-300 bg-stone-100 text-stone-900',
}

/** A labelled "x of y played" progress bar. */
function Meter({ label, played, total, empty }: { label: string; played: number; total: number; empty?: string }) {
  return (
    <span className="block">
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className="font-medium text-stone-800">{empty ?? `${played} of ${total}`}</span>
      </span>
      <span
        className="mt-1 block h-1.5 overflow-hidden rounded-full bg-stone-100"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={played}
      >
        <span className="block h-full rounded-full bg-emerald-700" style={{ width: `${total ? (played / total) * 100 : 0}%` }} />
      </span>
    </span>
  )
}

export function Home({ onOpen }: { onOpen: (id: string) => void }) {
  const [grade, setGradeState] = useState(savedGrade)
  const setGrade = (g: string) => {
    setGradeState(g)
    try { sessionStorage.setItem('home-grade', g) } catch { /* keep working without storage */ }
  }
  const divisions = divisionsForGrade(grade === 'B' ? 'B' : 'A')
  // Divisions One and Two are the headline competitions (two large cards); Division Three has four regions.
  const rows = [
    { label: 'Division One and Division Two', items: divisions.filter((d) => d.level !== 'Division Three'), big: true },
    { label: 'Division Three', items: divisions.filter((d) => d.level === 'Division Three'), big: false },
  ]
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
        {rows.map((row) => (
          <section key={row.label} aria-labelledby={`row-${row.label}`}>
            <h2 id={`row-${row.label}`} className="mb-4 text-lg font-semibold tracking-tight">{row.label}</h2>
            <ul className={`grid gap-4 ${row.big ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
              {row.items.map((d) => {
                const g = groupProgress(d)
                const k = koProgress(d)
                const stage = stageOf(d)
                return (
                  <li key={d.id}>
                    <button
                      onClick={() => onOpen(d.id)}
                      className={`liquid glass-surface group flex h-full w-full flex-col rounded-xl border border-stone-200 bg-white text-left transition-colors hover:border-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                        row.big ? 'p-6 sm:p-8' : 'p-5'
                      }`}
                    >
                      <span className="text-xs font-medium uppercase tracking-wide text-emerald-800">{d.region || 'All regions'}</span>
                      <span className={`mt-1 font-semibold leading-snug ${row.big ? 'text-2xl sm:text-3xl' : 'text-lg'}`}>
                        {d.title.split(' · ')[0]}
                      </span>
                      <span className={`mt-1 text-stone-600 ${row.big ? 'text-base' : 'text-sm'}`}>{d.blurb}</span>
                      <span className={`mt-4 rounded-lg border px-3 py-2 ${TONE[stage.tone]}`}>
                        <span className="block text-[10px] font-semibold uppercase tracking-widest opacity-70">Latest stage</span>
                        <span className={`block font-semibold leading-snug ${row.big ? 'text-lg' : 'text-base'}`}>{stage.label}</span>
                        <span className="block text-xs leading-snug">{stage.detail}</span>
                      </span>
                      <span className="mt-auto space-y-2 pt-4 text-xs text-stone-600">
                        <Meter label="Group games played" played={g.played} total={g.total} />
                        <Meter
                          label="Knockout games played"
                          played={k.played}
                          total={k.total}
                          empty={d.koMatches.length ? undefined : 'Bracket not published'}
                        />
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
        <p className="border-t border-stone-200 pt-4 text-xs text-stone-500">
          Boys A and B Grade are available; C Grade will appear once its fixture documents are published. B Grade has fixtures
          only so far: no game has been played and no final-round bracket has been announced. Fixtures and results follow the
          organisers’ published documents.
        </p>
      </main>
    </div>
  )
}
