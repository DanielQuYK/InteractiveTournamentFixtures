import { useMemo, useState } from 'react'
import { DIVISIONS, divisionsForGrade } from '../lib/divisions'
import type { DivisionConfig } from '../lib/divisions'
import { groupProgress, koProgress, stageOf } from '../lib/stage'
import { Icon } from './Icon'
import { PitchArt } from './PitchArt'

const GRADES = [
  { id: 'A', name: 'A Grade', available: true },
  { id: 'B', name: 'B Grade', available: true },
  { id: 'C', name: 'C Grade', available: false },
]

/** Every school abbreviation with the competitions it appears in, for the finder. */
const TEAM_INDEX = (() => {
  const map = new Map<string, { id: string; title: string }[]>()
  for (const d of DIVISIONS) {
    for (const t of new Set(d.groupsRaw.trim().split('\n').flatMap((l) => [l.split('|')[4], l.split('|')[5]]))) {
      map.set(t, [...(map.get(t) ?? []), { id: d.id, title: d.title }])
    }
  }
  return map
})()

const teamCount = (d: DivisionConfig) =>
  new Set(d.groupsRaw.trim().split('\n').flatMap((l) => [l.split('|')[4], l.split('|')[5]]).filter((t) => !d.withdrawn[t])).size

const savedGrade = () => {
  try {
    return sessionStorage.getItem('home-grade') === 'B' ? 'B' : 'A'
  } catch {
    return 'A'
  }
}

const TONE = {
  idle: { box: 'border-amber-300/70 bg-amber-50/80 text-amber-950', dot: 'text-amber-500' },
  active: { box: 'border-emerald-300/70 bg-emerald-50/80 text-emerald-950', dot: 'text-emerald-500' },
  done: { box: 'border-stone-300 bg-stone-100/80 text-stone-900', dot: 'text-stone-400' },
}

/** A circular "x of y played" gauge with its label; the numbers are real text, the ring is decoration. */
function Ring({ label, played, total, empty }: { label: string; played: number; total: number; empty?: string }) {
  const r = 17
  const c = 2 * Math.PI * r
  const share = total ? played / total : 0
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="relative block h-11 w-11 shrink-0"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={played}
      >
        <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90" aria-hidden="true">
          <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4.5" className="stroke-stone-200" />
          <circle
            cx="22" cy="22" r={r} fill="none" strokeWidth="4.5" strokeLinecap="round"
            className="stroke-emerald-600 transition-[stroke-dashoffset] duration-700"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - share)}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums text-stone-800">
          {empty ? '–' : `${Math.round(share * 100)}%`}
        </span>
      </span>
      <span className="min-w-0 text-[11px] leading-tight text-stone-600">
        <span className="block">{label}</span>
        <span className="block text-xs font-semibold text-stone-900">{empty ?? `${played} of ${total}`}</span>
      </span>
    </span>
  )
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="glass-dark rounded-2xl px-4 py-3">
      <p className="font-display text-2xl font-semibold tabular-nums text-white sm:text-3xl">{value}</p>
      <p className="text-[11px] uppercase tracking-widest text-emerald-200/80">{label}</p>
    </div>
  )
}

export function Home({ onOpen }: { onOpen: (id: string) => void }) {
  const [grade, setGradeState] = useState(savedGrade)
  const setGrade = (g: string) => {
    setGradeState(g)
    try { sessionStorage.setItem('home-grade', g) } catch { /* keep working without storage */ }
  }
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const found = needle
    ? [...TEAM_INDEX].filter(([team]) => team.toLowerCase().includes(needle)).sort(([a], [b]) => a.localeCompare(b)).slice(0, 8)
    : []
  const divisions = divisionsForGrade(grade === 'B' ? 'B' : 'A')
  // Divisions One and Two are the headline competitions (two large cards); Division Three has four regions.
  const rows = [
    { label: 'Division One and Division Two', items: divisions.filter((d) => d.level !== 'Division Three'), big: true },
    { label: 'Division Three', items: divisions.filter((d) => d.level === 'Division Three'), big: false },
  ]
  const totals = useMemo(() => {
    const list = divisionsForGrade(grade === 'B' ? 'B' : 'A')
    return {
      competitions: list.length,
      schools: list.reduce((n, d) => n + teamCount(d), 0),
      groupGames: list.reduce((n, d) => n + groupProgress(d).played, 0),
      knockoutGames: list.reduce((n, d) => n + koProgress(d).played, 0),
    }
  }, [grade])
  let card = 0

  return (
    <div className="page-bg min-h-screen text-stone-900">
      <header className="aurora text-white">
        <PitchArt />
        <div className="mx-auto max-w-6xl px-3 pb-14 pt-12 sm:px-5 sm:pb-20 sm:pt-20">
          <p className="rise inline-flex items-center gap-2 rounded-full glass-dark px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-200">
            <Icon name="ball" size={14} /> Inter-School Football Competition 2026–2027
          </p>
          <h1 className="rise mt-5 max-w-3xl text-4xl font-semibold leading-[1.02] sm:text-6xl" style={{ animationDelay: '80ms' }}>
            <span className="text-gradient">Choose a competition</span>
          </h1>
          <p className="rise mt-4 max-w-xl text-sm leading-relaxed text-emerald-100/80 sm:text-base" style={{ animationDelay: '160ms' }}>
            Pick a grade, then a division and region, to see its group tables, final-round bracket, leaderboard, team statistics and
            simulations. Every competition is kept entirely separate.
          </p>

          <div className="rise mt-8 grid gap-4 lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-start" style={{ animationDelay: '240ms' }}>
            <div>
              <label htmlFor="team-finder" className="sr-only">Find a school</label>
              <div className="glass-dark flex items-center gap-2 rounded-full px-4 py-2.5 focus-within:border-white/50 focus-within:shadow-[0_0_0_4px_rgba(110,231,183,0.18)]">
                <Icon name="search" size={16} className="shrink-0 text-emerald-200" />
                <input
                  id="team-finder"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a school, e.g. HKUGA"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-emerald-200/60"
                />
              </div>
              {needle && (
                <ul className="mt-2 max-h-72 overflow-auto rounded-2xl border border-white/20 bg-emerald-950/85 text-sm shadow-2xl backdrop-blur-xl" aria-label="Matching schools" role="status">
                  {found.length === 0 && <li className="px-4 py-3 text-emerald-200">No school matches “{query}”.</li>}
                  {found.map(([team, where]) => (
                    <li key={team} className="border-b border-white/10 px-4 py-2.5 last:border-0">
                      <span className="font-semibold">{team}</span>
                      <span className="mt-1.5 flex flex-wrap gap-1.5">
                        {where.map((w) => (
                          <button
                            key={w.id}
                            onClick={() => onOpen(w.id)}
                            className="rounded-full border border-emerald-400/40 px-2.5 py-0.5 text-xs text-emerald-100 transition-colors hover:bg-emerald-400/20 focus-visible:outline-2 focus-visible:outline-emerald-300"
                          >
                            {w.title.replace(' · Boys ', ' · ')}
                          </button>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="glass-dark mt-4 inline-flex rounded-full p-1" role="group" aria-label="Grade">
                {GRADES.map((g) => (
                  <button
                    key={g.id}
                    disabled={!g.available}
                    aria-pressed={grade === g.id}
                    onClick={() => setGrade(g.id)}
                    className={`rounded-full px-5 py-2 text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-45 ${
                      grade === g.id ? 'bg-white text-emerald-950 shadow-lg' : 'text-emerald-100 hover:bg-white/10'
                    }`}
                  >
                    {g.name}
                    {!g.available && <span className="ml-2 text-[10px] font-normal uppercase tracking-wide">Not yet available</span>}
                  </button>
                ))}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label={`${grade} Grade at a glance`}>
              <Stat value={totals.competitions} label="Competitions" />
              <Stat value={totals.schools} label="Schools" />
              <Stat value={totals.groupGames} label="Group games played" />
              <Stat value={totals.knockoutGames} label="Knockout games played" />
            </dl>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-6 max-w-6xl space-y-10 px-3 pb-12 sm:px-5">
        {rows.map((row) => (
          <section key={row.label} aria-labelledby={`row-${row.label}`}>
            <h2 id={`row-${row.label}`} className="mb-4 flex items-center gap-3 text-lg font-semibold tracking-tight text-stone-800">
              {row.label}
              <span className="h-px flex-1 bg-gradient-to-r from-stone-300 to-transparent" aria-hidden="true" />
            </h2>
            <ul className={`grid gap-4 ${row.big ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
              {row.items.map((d) => {
                const g = groupProgress(d)
                const k = koProgress(d)
                const stage = stageOf(d)
                const tone = TONE[stage.tone]
                const delay = `${(card++) * 70}ms`
                return (
                  <li key={d.id} className="rise" style={{ animationDelay: delay }}>
                    <button
                      onClick={() => onOpen(d.id)}
                      className={`liquid spot spot-card group flex h-full w-full flex-col rounded-3xl border border-stone-200 bg-white/85 text-left backdrop-blur transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                        row.big ? 'p-6 sm:p-8' : 'p-5'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                          <Icon name="pin" size={12} /> {d.region || 'All regions'}
                        </span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-white transition-transform duration-300 group-hover:translate-x-0.5 group-hover:bg-emerald-700">
                          <Icon name="arrow" size={15} />
                        </span>
                      </span>
                      <span className={`mt-4 font-display font-semibold leading-tight tracking-tight ${row.big ? 'text-3xl sm:text-4xl' : 'text-xl'}`}>
                        {d.title.split(' · ')[0]}
                      </span>
                      <span className={`mt-1.5 text-stone-600 ${row.big ? 'text-base' : 'text-sm'}`}>{d.blurb}</span>
                      <span className={`mt-4 rounded-2xl border px-3.5 py-2.5 ${tone.box}`}>
                        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest opacity-70">
                          <span className={`live-dot ${tone.dot} ${stage.tone === 'active' ? '' : '[&::after]:hidden'}`} aria-hidden="true" /> Latest stage
                        </span>
                        <span className={`mt-0.5 block font-display font-semibold leading-snug ${row.big ? 'text-xl' : 'text-lg'}`}>{stage.label}</span>
                        <span className="block text-xs leading-snug">{stage.detail}</span>
                      </span>
                      <span className="mt-auto grid gap-3 pt-5 sm:grid-cols-2">
                        <Ring label="Group games played" played={g.played} total={g.total} />
                        <Ring
                          label="Knockout games played"
                          played={k.played}
                          total={k.total}
                          empty={d.koMatches.length ? undefined : 'Not published'}
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
