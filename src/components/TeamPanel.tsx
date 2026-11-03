import { useDialog } from '../lib/hooks'
import { type ReactNode } from 'react'
import { GROUP_MATCHES, KO_MATCHES, ROUND_NAME, VENUES, VENUE_SHORT, WITHDRAWN, fmtDate, koById, koWinner, slotTeam, standings, timeMinutes, type GroupMatch, type KoMatch, type Slot } from '../lib/data'
import { TeamBtn, describeSource, remarkText } from './shared'
import { groupSeed } from '../lib/stats'

export function TeamPanel({ team, onClose, onTeam }: { team: string; onClose: () => void; onTeam: (t: string) => void }) {
  const panelRef = useDialog<HTMLElement>(onClose)
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
      <aside ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`${team} fixtures`} className="isolate h-full outline-none w-full max-w-xl overflow-y-auto bg-stone-50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
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

export function KoLine({ m, team, onTeam }: { m: KoMatch; team: string; onTeam: (t: string) => void }) {
  const h = slotTeam(m.home), a = slotTeam(m.away)
  const candidates = (slot: Slot) => {
    if (slot.kind === 'team' || slotTeam(slot)) return null
    const source = koById(slot.of)
    const first = slotTeam(source.home), second = slotTeam(source.away)
    return first && second ? [first, second] : null
  }
  const sourceLines = (slot: Slot & { kind: 'winner' | 'loser' }) => {
    const source = koById(slot.of)
    const verb = slot.kind === 'winner' ? 'Winner of' : 'Loser of'
    return source.round === 'R14'
      ? [`${verb} Round of 14`, source.label.split(' – ')[1]]
      : [verb, source.label]
  }
  const teamName = (name: string, className = '') =>
    name === team
      ? <strong className={className}>{name}</strong>
      : <TeamBtn name={name} onTeam={onTeam} className={className} />
  const side = (slot: Slot, resolved: string | null, align: 'left' | 'right') => {
    const options = candidates(slot)
    const alignment = align === 'right' ? 'items-end text-right' : 'items-start text-left'
    let caption: string[] | null = null
    let content: ReactNode
    if (options) {
      content = (
        <ul className={`flex flex-col gap-1.5 ${alignment}`}>
          {options.map((name) => (
            <li key={name}>
              <div>{teamName(name, 'text-sm')}</div>
              <div className="text-[11px] text-stone-500">{groupSeed(name)}</div>
            </li>
          ))}
        </ul>
      )
      caption = sourceLines(slot as Slot & { kind: 'winner' | 'loser' })
    } else if (resolved) {
      content = (
        <div className={alignment}>
          <div>{teamName(resolved)}</div>
          <div className="text-[11px] text-stone-500">{groupSeed(resolved)}</div>
        </div>
      )
      if (slot.kind === 'team' && slot.seed.endsWith(' – bye')) caption = ['BYE']
      else if (slot.kind !== 'team') caption = sourceLines(slot)
    } else {
      content = <span className={`text-sm italic text-stone-500 ${align === 'right' ? 'text-right' : 'text-left'}`}>{describeSource(slot)}</span>
    }
    return (
      <div className={`flex min-w-0 flex-col ${alignment}`}>
        <div className="flex min-h-12 items-center">{content}</div>
        {caption && (
          <p className="mt-2 w-full max-w-40 border-t border-stone-200 pt-1.5 text-center text-[11px] italic leading-snug text-stone-500">
            {caption.map((line) => <span key={line} className="block">{line}</span>)}
          </p>
        )}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
      {side(m.home, h, 'left')}
      <span className="font-semibold tabular-nums text-stone-700">{m.score ? `${m.score[0]} – ${m.score[1]}` : 'v'}</span>
      {side(m.away, a, 'right')}
    </div>
  )
}

export function GroupLine({ m, team, onTeam }: { m: GroupMatch; team: string; onTeam: (t: string) => void }) {
  const home = m.home === team
  const opp = home ? m.away : m.home
  let result = ''
  if (m.hs !== null && m.as !== null) {
    const f = home ? m.hs : m.as, c = home ? m.as : m.hs
    result = f > c ? 'W' : f < c ? 'L' : 'D'
  }
  const color = result === 'W' ? 'bg-emerald-100 text-emerald-800' : result === 'L' ? 'bg-rose-100 text-rose-800' : result === 'D' ? 'bg-stone-200 text-stone-700' : 'bg-stone-100 text-stone-600'
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

