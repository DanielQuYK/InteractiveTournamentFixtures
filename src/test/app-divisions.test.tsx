import { afterEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { GroupStage } from '../components/GroupStage'
import { Knockout } from '../components/Knockout'
import { TeamStats } from '../components/TeamStats'
import { Simulation } from '../components/Simulation'
import { Home } from '../components/Home'
import { DIVISIONS } from '../lib/divisions'
import { GROUP_MATCHES, setActiveDivision } from '../lib/data'
import { simulationBlockers } from '../lib/readiness'

afterEach(() => setActiveDivision('d3h'))
const noop = () => {}

describe('home page', () => {
  it('lists every division and marks other grades unavailable', () => {
    const html = renderToStaticMarkup(<Home onOpen={noop} />)
    for (const d of DIVISIONS) if (d.grade === 'A') expect(html).toContain(d.title.split(' · ')[0])
    expect(html).toContain('Not yet available')
    expect(html).toContain('lg:grid-cols-4')
    expect(html).toContain('Latest stage')
    expect(html).toContain('Knockout games played')
  })
})

describe.each(DIVISIONS.map((d) => d.id))('%s views', (id) => {
  it('renders each tab using only its own teams', () => {
    setActiveDivision(id)
    const own = new Set(GROUP_MATCHES.flatMap((m) => [m.home, m.away]))
    const others = new Set(
      DIVISIONS.filter((d) => d.id !== id).flatMap((d) => d.groupsRaw.trim().split('\n').flatMap((l) => [l.split('|')[4], l.split('|')[5]])),
    )
    const foreign = [...others].filter((t) => !own.has(t))
    const html = [
      renderToStaticMarkup(<GroupStage onTeam={noop} onMatch={noop} />),
      renderToStaticMarkup(<Knockout onTeam={noop} onMatch={noop} />),
      renderToStaticMarkup(<TeamStats onTeam={noop} />),
      simulationBlockers().length === 0 ? renderToStaticMarkup(<Simulation />) : '',
    ].join('\n')
    expect(html.length).toBeGreaterThan(1000)
    // Team abbreviations appear as whole words; none from another division may leak in
    const words = new Set(html.match(/[A-Z][A-Z0-9-]{1,9}/g))
    expect(foreign.filter((t) => words.has(t) && !own.has(t))).toEqual([])
  })
})
