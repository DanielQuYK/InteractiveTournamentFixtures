import { type ReactNode } from 'react'
import { useDialog } from '../lib/hooks'
import { KO_MATCHES, ROUND_NAME, VENUES, VENUE_SHORT, fmtDate, koById, koPlayed, koWinner, slotTeam, type Slot } from '../lib/data'
import { type Detail, TeamBtn, describeSource, remarkText } from './shared'
import { groupPlaceText } from '../lib/stats'
import { PredictionToggle } from './MatchPredictionPanel'
import { TBC_REMARK, beatLine, winnerGoals } from '../lib/matchText'

/* ---------- Match detail modal ---------- */

export function MatchModal({ detail, onClose, onTeam }: { detail: Detail; onClose: () => void; onTeam: (t: string) => void }) {
  const dialogRef = useDialog<HTMLDivElement>(onClose)

  let title = '', subtitle = '', date = '', time = '', venue = '', status = ''
  let home: string | null = null, away: string | null = null
  let homeLabel = '', awayLabel = '', score = 'v', extra: string[] = []
  let homeSlot: Slot | null = null, awaySlot: Slot | null = null
  let penalties = ''
  let winnerName: string | null = null

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
    homeSlot = m.home; awaySlot = m.away
    const star = m.scoreTbc ? '*' : ''
    if (m.score) score = `${m.score[0]} : ${m.score[1]}${star}`
    else if (m.scoreTbc) score = 'TBC*'
    if (m.pens) penalties = `Pens ${m.pens[0]} : ${m.pens[1]}${star}`
    status = koPlayed(m) ? (m.score ? 'Full time' : 'Winner confirmed') : home && away ? 'Scheduled' : 'Awaiting earlier results'
    winnerName = koWinner(m)
    const info = winnerGoals(m)
    if (info?.pens && winnerName) {
      extra.push(`${winnerName} won ${info.pens[0]}–${info.pens[1]} on penalties after a ${info.goals[0]}–${info.goals[1]} full-time score${m.scoreTbc ? '*' : ''}.`)
    }
    if (m.scoreTbc) extra.push(TBC_REMARK)
    const next = KO_MATCHES.find((x) => (x.home.kind === 'winner' && x.home.of === m.id) || (x.away.kind === 'winner' && x.away.of === m.id))
    if (next) extra.push(`The winner advances to ${next.label} on ${fmtDate(next.date)}, ${next.time}, ${VENUE_SHORT[next.venue]}.`)
    if (m.round === 'SF') extra.push('The loser proceeds to the third-place play-off on 2 December 2026.')
    if (m.round === 'F') extra.push('The winner is crowned champion of Division Three (HK) Boys A Grade.')
    if (m.round === 'TP') extra.push('Contested by the two losing semi-finalists.')
    if (!koPlayed(m)) extra.push('Knockout matches are decided on the day; the first-named team is the home team.')
  }

  // Exactly two possible occupants: the feeder match has both teams confirmed
  // but has not been decided yet.
  const candidates = (slot: Slot | null): { teams: string[]; label: string } | null => {
    if (!slot || slot.kind === 'team' || slotTeam(slot)) return null
    const src = koById(slot.of)
    const a = slotTeam(src.home), b = slotTeam(src.away)
    if (!a || !b) return null
    return { teams: [a, b], label: `${slot.kind === 'winner' ? 'Winner' : 'Loser'} of ${src.label}` }
  }

  const sourceLines = (slot: Slot & { kind: 'winner' | 'loser' }): string[] => {
    const src = koById(slot.of)
    const verb = slot.kind === 'winner' ? 'Winner of' : 'Loser of'
    if (src.round === 'R14') return [`${verb} Round of 14`, src.label.split(' – ')[1]]
    return [verb, src.label]
  }

  // Each side has a main area (aligned with the score) and an optional caption
  // beneath it, so captions on both sides sit on a shared baseline.
  const sideParts = (name: string | null, label: string, align: 'left' | 'right', slot: Slot | null) => {
    const justify = align === 'right' ? 'justify-end' : 'justify-start'
    const textAlign = align === 'right' ? 'text-right' : 'text-left'
    const options = candidates(slot)
    let main: ReactNode
    let caption: string[] | null = null
    if (options) {
      main = (
        <ul className="space-y-2">
          {options.teams.map((t) => (
            <li key={t} className={textAlign}>
              <TeamBtn name={t} onTeam={onTeam} className="text-lg" />
              <div className="text-xs text-stone-500">{groupPlaceText(t)}</div>
            </li>
          ))}
        </ul>
      )
      caption = sourceLines(slot as Slot & { kind: 'winner' | 'loser' })
    } else {
      const shownSeed = name ? groupPlaceText(name) : ''
      main = (
        <div className={textAlign}>
          {name ? <TeamBtn name={name} onTeam={onTeam} className="text-xl" /> : <span className="text-sm italic text-stone-500">{label}</span>}
          {shownSeed && <div className="mt-0.5 text-xs text-stone-500">{shownSeed}</div>}
        </div>
      )
      if (slot && name) {
        if (slot.kind === 'team') caption = slot.seed.endsWith(' – bye') ? ['BYE'] : ['Qualified from', groupPlaceText(name)]
        else {
          const source = beatLine(koById(slot.of))
          caption = source ? [...sourceLines(slot), source] : sourceLines(slot)
        }
      }
    }
    const tone = !name || !winnerName ? '' : name === winnerName ? 'border-emerald-300 bg-emerald-100 text-emerald-950' : 'border-rose-300 bg-rose-100 text-rose-950'
    return {
      main: (
        <div className={`flex items-center ${justify}`}>
          <div className={`liquid min-w-0 max-w-full rounded-xl border px-3 py-2 ${tone || 'border-transparent'}`}>{main}</div>
        </div>
      ),
      caption,
      justify,
    }
  }

  const left = sideParts(home, homeLabel, 'left', homeSlot)
  const right = sideParts(away, awayLabel, 'right', awaySlot)
  const hasCaption = Boolean(left.caption || right.caption)
  const captionBox = (lines: string[] | null, justify: string) => (
    <div className={`flex ${justify}`}>
      {lines && (
        <p className="mt-3 w-full max-w-48 border-t border-stone-200 pt-2 text-center text-xs italic leading-snug text-stone-500">
          {lines.map((l) => <span key={l} className="block">{l}</span>)}
        </p>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/30 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Match details" className="relative max-h-[92vh] w-full max-w-2xl overflow-x-hidden overflow-y-auto rounded-2xl border border-white/60 bg-white/90 shadow-2xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="liquid absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-stone-600">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12" /></svg>
        </button>
        <div className="px-6 pb-2 pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">{title}</p>
          <p className="text-sm text-stone-500">{subtitle}</p>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 px-4 py-5 sm:px-6">
          {left.main}
          <div className="text-center">
            <div className="whitespace-nowrap text-3xl font-semibold tabular-nums">{score}</div>
            {penalties && <div className="whitespace-nowrap text-sm font-medium tabular-nums text-stone-700">{penalties}</div>}
            <div className="mt-1 whitespace-nowrap text-[11px] uppercase tracking-wide text-stone-500">{status}</div>
          </div>
          {right.main}
          {hasCaption && (
            <>
              {captionBox(left.caption, left.justify)}
              <div />
              {captionBox(right.caption, right.justify)}
            </>
          )}
        </div>
        <dl className="space-y-2 border-t border-stone-200 px-6 py-4 text-sm">
          <div className="flex gap-3"><dt className="w-16 text-stone-500">Date</dt><dd>{fmtDate(date, true)}</dd></div>
          <div className="flex gap-3"><dt className="w-16 text-stone-500">Kick-off</dt><dd>{time}</dd></div>
          <div className="flex gap-3"><dt className="w-16 text-stone-500">Venue</dt><dd>{venue}</dd></div>
        </dl>
        {extra.length > 0 && (
          <div className="space-y-1 border-t border-stone-200 bg-stone-50/80 px-6 py-4 text-xs text-stone-600">
            {extra.map((e) => <p key={e} className={`break-words ${e === TBC_REMARK ? 'font-medium text-amber-800' : ''}`}>{e}</p>)}
          </div>
        )}
        {/* Only offered once both teams are confirmed: otherwise there is no single pairing to describe. */}
        {detail.kind === 'ko' && home && away && <PredictionToggle matchId={detail.id} />}
      </div>
    </div>
  )
}

