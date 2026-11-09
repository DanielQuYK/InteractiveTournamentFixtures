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

describe('bracket result picker', () => {
  it.each(['d1', 'd2', 'd3h'])('%s: shows a checkbox per match with readable codes', async (id) => {
    const { ResultPicker } = await import('../components/ResultPicker')
    setActiveDivision(id)
    const html = renderToStaticMarkup(<ResultPicker selected={[]} onChange={noop} />)
    expect((html.match(/role="checkbox"/g) ?? []).length).toBeGreaterThanOrEqual(4)
    expect(html).toContain('Tick every played result')
    // Match codes such as Ro14-5 must never wrap onto two lines
    expect(html).toMatch(/whitespace-nowrap[^>]*>(Ro14-\d|QF-\d|SF-\d|Final)</)
    if (id === 'd3h') {
      expect(html).toContain('Ro14-1')
      expect(html).toContain('Not played yet')
      expect(html).toContain('With earlier games')
    }
  })
})

describe('match codes stay on one line in every bracket', () => {
  it.each(['d1', 'd2', 'd3h', 'k1'])('%s', async (id) => {
    const { Knockout } = await import('../components/Knockout')
    setActiveDivision(id)
    const html = renderToStaticMarkup(<Knockout onTeam={noop} onMatch={noop} />)
    const pills = html.match(/<span class="whitespace-nowrap font-medium">[^<]*</g) ?? []
    expect(pills.length).toBeGreaterThanOrEqual(4)
  })
})
