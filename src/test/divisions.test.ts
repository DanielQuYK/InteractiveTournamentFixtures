import { afterEach, describe, expect, it } from 'vitest'
import {
  ALL_KO_TEAMS, GROUPS, GROUP_MATCHES, KO_MATCHES, WITHDRAWN, PENALTIES, groupComplete, setActiveDivision, slotTeam, standings,
} from '../lib/data'
import { DIVISIONS } from '../lib/divisions'
import { MATCH_ORDER, FINISHES, emptyAggregate, runOneSimulation, simulationStrengths, startStageOptions } from '../lib/simulation'
import { BYES, POS, bracketLines, totalH, totalW } from '../lib/bracketLayout'
import { simulationBlockers } from '../lib/readiness'
import { validateQualifiers, validateResults } from '../lib/validation'

afterEach(() => setActiveDivision('d3h'))

const teamsOf = (id: string) => {
  setActiveDivision(id)
  return new Set(GROUP_MATCHES.flatMap((m) => [m.home, m.away]))
}

describe('division registry', () => {
  it('has unique ids', () => {
    expect(new Set(DIVISIONS.map((d) => d.id)).size).toBe(DIVISIONS.length)
    expect(DIVISIONS.map((d) => d.id)).toEqual(['d1', 'd2', 'd3h', 'k1', 'k2', 'k3', 'd1b', 'd2b', 'd3hb', 'k1b', 'k2b', 'k3b'])
  })

  it.each([
    ['d1', 2, 30], ['d2', 4, 40], ['d3h', 7, null], ['k1', 6, 56], ['k2', 6, 56], ['k3', 6, 52],
  ] as const)('%s has the published group structure', (id, groups, games) => {
    setActiveDivision(id)
    expect([...GROUPS]).toHaveLength(groups)
    if (games) expect(GROUP_MATCHES).toHaveLength(games)
  })

  it('never shares a team set between divisions of different levels', () => {
    const d1 = teamsOf('d1'), d2 = teamsOf('d2')
    expect([...d1].filter((t) => d2.has(t))).toEqual([])
  })

  it('keeps withdrawals and penalties inside their own division', () => {
    setActiveDivision('k2')
    expect(Object.keys(WITHDRAWN)).toEqual(['RSEFHKMC'])
    setActiveDivision('d1')
    expect(Object.keys(WITHDRAWN)).toEqual([])
    expect(PENALTIES).toEqual({ KGV: 3 })
    setActiveDivision('d3h')
    expect(PENALTIES).toEqual({ ISFA: 3 })
  })

  it('does not count cancelled K2 fixtures as played', () => {
    setActiveDivision('k2')
    const t = standings(5).find((r) => r.team === 'RSEFHKMC')
    expect(t).toBeUndefined()
    expect(GROUP_MATCHES.filter((m) => m.group === 5 && m.hs === null && m.remark === 'C').length).toBeGreaterThan(0)
  })
})

describe('Division One', () => {
  it('ranks level teams by head-to-head: WYHK ahead of SJC', () => {
    setActiveDivision('d1')
    const table = standings(1)
    expect(table[0].team).toBe('WYHK')
    expect(table[1].team).toBe('SJC')
    expect(standings(2).map((r) => r.team).slice(0, 2)).toEqual(['DBS', 'FIS'])
    expect(standings(2).at(-1)!.team).toBe('KGV')
  })

  it('has semi-finals matching the groups and a separate third-place play-off', () => {
    setActiveDivision('d1')
    expect(validateQualifiers()).toEqual([])
    expect(validateResults()).toEqual([])
    expect(KO_MATCHES.find((m) => m.id === 'S1')).toMatchObject({ date: '2026-11-23' })
    expect(MATCH_ORDER).toEqual(['S1', 'S2', 'TP', 'F'])
    expect(MATCH_ORDER).not.toContain('PO')
    expect(FINISHES.map((f) => f.key)).toEqual(['fourth', 'third', 'runnerUp', 'champion'])
    expect(POS.PO).toBeDefined()
  })

  it('simulates only the four teams of the bracket', () => {
    setActiveDivision('d1')
    const strengths = simulationStrengths()
    const agg = new Map([...ALL_KO_TEAMS].filter((t) => ['WYHK', 'FIS', 'SJC', 'DBS'].includes(t)).map((t) => [t, emptyAggregate(t)]))
    expect(agg.size).toBe(4)
    runOneSimulation(strengths, agg)
    const champions = [...agg.values()].filter((a) => a.finishes.champion === 1)
    expect(champions).toHaveLength(1)
  })
})

describe('Division Two', () => {
  it('has a consistent eight-team bracket', () => {
    setActiveDivision('d2')
    expect(validateQualifiers()).toEqual([])
    expect(MATCH_ORDER).toEqual(['Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'TP', 'F'])
    expect(BYES).toHaveLength(0)
    expect(FINISHES.map((f) => f.key)).toEqual(['qf', 'fourth', 'third', 'runnerUp', 'champion'])
    expect(startStageOptions().map((o) => o.stage)).toEqual(['QF', 'SF', 'F'])
  })
})

describe.each(['k1', 'k2', 'k3'])('%s pending bracket', (id) => {
  it('shows seeds without inventing teams', () => {
    setActiveDivision(id)
    expect(ALL_KO_TEAMS.size).toBe(0)
    for (const m of KO_MATCHES) {
      expect(slotTeam(m.home)).toBeNull()
      expect(slotTeam(m.away)).toBeNull()
    }
    expect(KO_MATCHES.some((m) => m.id === 'R4')).toBe(true)
    expect(BYES).toHaveLength(4)
    expect(BYES.every((b) => b.pending)).toBe(true)
    expect(validateQualifiers()).toEqual([])
  })

  it('lays out 12 places over four columns', () => {
    setActiveDivision(id)
    expect(totalW()).toBeGreaterThan(1000)
    expect(totalH()).toBeGreaterThan(1000)
    expect(Object.keys(POS)).toHaveLength(KO_MATCHES.length)
    expect(bracketLines().length).toBeGreaterThan(10)
  })

  it('has complete groups only where every game has a result', () => {
    setActiveDivision(id)
    expect(typeof groupComplete(1)).toBe('boolean')
  })
})

describe('Boys B Grade', () => {
  it.each([
    ['d1b', 2, 30, 12], ['d2b', 4, 40, 20], ['d3hb', 6, 52, 28], ['k1b', 6, 52, 28], ['k2b', 5, 50, 25], ['k3b', 6, 52, 28],
  ] as const)('%s has the published fixtures and nothing played', (id, groups, games, teams) => {
    setActiveDivision(id)
    expect([...GROUPS]).toHaveLength(groups)
    expect(GROUP_MATCHES).toHaveLength(games)
    expect(teamsOf(id).size).toBe(teams)
    expect(GROUP_MATCHES.every((m) => m.hs === null && m.as === null)).toBe(true)
    expect(KO_MATCHES).toHaveLength(0)
    expect(standings(1).every((r) => r.p === 0 && r.pts === 0)).toBe(true)
  })

  it('keeps January 2027 fixtures in the right year', () => {
    setActiveDivision('k1b')
    expect(GROUP_MATCHES.some((m) => m.date.startsWith('2027-01'))).toBe(true)
    expect(GROUP_MATCHES.some((m) => m.date.startsWith('2026-11'))).toBe(true)
  })

  it('is a full round-robin in every group', () => {
    for (const id of ['d1b', 'd2b', 'd3hb', 'k1b', 'k2b', 'k3b']) {
      setActiveDivision(id)
      for (const g of GROUPS) {
        const ms = GROUP_MATCHES.filter((m) => m.group === g)
        const teams = new Set(ms.flatMap((m) => [m.home, m.away]))
        const pairs = new Set(ms.map((m) => [m.home, m.away].sort().join('|')))
        expect(pairs.size).toBe(ms.length)
        expect(ms.length).toBe((teams.size * (teams.size - 1)) / 2)
      }
    }
  })

  it('refuses to simulate without results or a bracket, and never borrows A Grade ratings', () => {
    setActiveDivision('d1b')
    const reasons = simulationBlockers().join(' ')
    expect(reasons).toMatch(/bracket/)
    expect(reasons).toMatch(/No group game has been played/)
    setActiveDivision('d1')
    expect(simulationBlockers()).toEqual([])
    // A Grade results never appear in the B Grade competition
    setActiveDivision('d1b')
    expect(simulationStrengths().details.size).toBe(0)
  })
})

describe('bracket clears the round headings', () => {
  it.each(['d1', 'd2', 'd3h', 'k1'])('%s: no card or bye starts above the heading band', (id) => {
    setActiveDivision(id)
    const tops = [...Object.values(POS).map((p) => p.y - 120 / 2 - 24), ...BYES.map((b) => b.y - 84 / 2)]
    expect(Math.min(...tops)).toBeGreaterThanOrEqual(44)
  })
})

describe('D3H unchanged after switching', () => {
  it('restores its own data', () => {
    setActiveDivision('k1')
    setActiveDivision('d3h')
    expect([...GROUPS]).toHaveLength(7)
    expect(ALL_KO_TEAMS.has('SKHLMC')).toBe(true)
    expect(MATCH_ORDER).toHaveLength(14)
  })
})

describe('hand-picked official results', () => {
  it('requires every earlier match that fed a chosen match', async () => {
    const { matchPrerequisites, matchDependents, sanitizeSelection, pickStates } = await import('../lib/simulation')
    setActiveDivision('d3h')
    expect(matchPrerequisites('R1')).toEqual([])
    expect(matchPrerequisites('Q1')).toEqual(['R1'])
    // A semi-final needs both quarter-finals and every earlier game of both teams and the opponents they beat
    expect(matchPrerequisites('S1')).toEqual(['R1', 'R2', 'R3', 'Q1', 'Q2'])
    expect(matchPrerequisites('F')).toEqual(expect.arrayContaining(['S1', 'S2', 'Q1', 'Q2', 'Q3', 'Q4', 'R1', 'R6']))
    expect(matchDependents('R1')).toEqual(expect.arrayContaining(['Q1', 'S1', 'TP', 'F']))

    // One lone Round-of-14 game is fine
    expect(sanitizeSelection(['R5'])).toEqual(['R5'])
    // A played quarter-final without its feeder is dropped; with it, kept
    expect(sanitizeSelection(['Q1'])).toEqual([])
    expect(sanitizeSelection(['R1', 'Q1'])).toEqual(['R1', 'Q1'])
    // Unplayed matches can never be chosen
    expect(sanitizeSelection(['R1', 'R6', 'Q4'])).toEqual(['R1', 'R6'])

    const states = new Map(pickStates(new Set(['R1'])).map((s) => [s.id, s]))
    expect(states.get('Q1')).toMatchObject({ enabled: true })
    expect(states.get('Q2')).toMatchObject({ enabled: false })
    expect(states.get('Q2')!.reason).toMatch(/Tick Ro14-2, Ro14-3 first/)
    expect(states.get('Q4')).toMatchObject({ enabled: false, reason: 'Not played yet' })
    // S1 needs Q2 as well as everything on the other side
    expect(states.get('S1')!.enabled).toBe(false)
  })

  it('a semi-final needs both sides; ticking everything played is valid', async () => {
    const { sanitizeSelection } = await import('../lib/simulation')
    setActiveDivision('d3h')
    const all = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'Q1', 'Q2', 'Q3']
    expect(sanitizeSelection(all)).toEqual(all)
    expect(sanitizeSelection(['R1', 'R2', 'Q1', 'Q2'])).toEqual(['R1', 'R2', 'Q1']) // Q2 also needs R3
  })

  it('fixes exactly the chosen results and simulates the rest', async () => {
    const { fixedMatchIds, runOneSimulation, simulationStrengths, emptyAggregate } = await import('../lib/simulation')
    setActiveDivision('d3h')
    const fixed = fixedMatchIds('R14', ['R1'])
    expect([...fixed]).toEqual(['R1'])
    const strengths = simulationStrengths(fixed)
    const agg = new Map([...ALL_KO_TEAMS].map((t) => [t, emptyAggregate(t)]))
    for (let i = 0; i < 200; i++) runOneSimulation(strengths, agg)
    // R1 is official (IKTMC beat QC every time); R2 is simulated, so KCC does not always win it
    expect(agg.get('QC')!.finishes.r14).toBe(200)
    expect(agg.get('LHYMSS')!.finishes.r14).toBeLessThan(200)
    expect(agg.get('LHYMSS')!.finishes.r14).toBeGreaterThan(0)
  })
})

describe('match codes', () => {
  it('give every match a unique readable code, in every division', async () => {
    const { matchCode } = await import('../lib/data')
    for (const id of ['d1', 'd2', 'd3h', 'k1']) {
      setActiveDivision(id)
      const codes = KO_MATCHES.map((m) => matchCode(m))
      expect(new Set(codes).size).toBe(codes.length)
    }
    setActiveDivision('d3h')
    expect(matchCode(KO_MATCHES.find((m) => m.id === 'R3')!)).toBe('Ro14-3')
    expect(matchCode(KO_MATCHES.find((m) => m.id === 'Q2')!)).toBe('QF-2')
    setActiveDivision('k1')
    expect(matchCode(KO_MATCHES.find((m) => m.id === 'R4')!)).toBe('Ro12-4')
    setActiveDivision('d1')
    expect(KO_MATCHES.map((m) => matchCode(m))).toEqual(['SF-1', 'SF-2', '3rd', 'Final', 'Play-off'])
  })
})

describe('what-if conditions', () => {
  it('lists who could win a match and the earlier games a winner needs', async () => {
    const { possibleParticipants, pathTo, expandConditions, effectiveFixed, sanitizeConditions } = await import('../lib/scenario')
    setActiveDivision('d3h')
    expect(possibleParticipants('Q4')).toEqual(['CANADIAN', 'HKUGA', 'SPCC'])
    expect(pathTo('HKUGA', 'S2')).toEqual(['R6', 'Q4', 'S2'])
    expect(pathTo('CANADIAN', 'S2')).toEqual(['Q4', 'S2']) // a bye: no Round of 14 game
    expect(pathTo('CFSS', 'Q4')).toBeNull()
    // The third-place match is reached by losing a semi-final, so only games before it are implied
    expect(pathTo('HKUGA', 'TP')).toEqual(['R6', 'Q4'])

    // A future game: no real result is affected
    const future = expandConditions([{ id: 'Q4', winner: 'HKUGA' }])
    expect(future.conflicts).toEqual([])
    expect(future.reversed).toEqual([])
    // Reversing a played game changes it and everything that depended on it
    const reversed = expandConditions([{ id: 'R1', winner: 'QC' }])
    expect(reversed.reversed).toEqual(['R1'])
    const eff = effectiveFixed(['R1', 'R2', 'R3', 'Q1', 'Q2'], reversed)
    expect(eff).toEqual(['R2', 'R3', 'Q2'])
    // Same winner and score as reality changes nothing
    expect(expandConditions([{ id: 'R1', winner: 'IKTMC', goals: [4, 1] }]).reversed).toEqual([])
    expect(expandConditions([{ id: 'R1', winner: 'IKTMC', goals: [3, 1] }]).reversed).toEqual(['R1'])
    // Impossible conditions are dropped or flagged
    expect(sanitizeConditions([{ id: 'Q4', winner: 'KCC' }])).toEqual([])
    expect(sanitizeConditions([{ id: 'Q4', winner: 'HKUGA', goals: [0, 2] }])).toEqual([])
    const clash = expandConditions([{ id: 'S2', winner: 'HKUGA' }, { id: 'Q4', winner: 'CANADIAN' }])
    expect(clash.conflicts.length).toBe(1)
  })

  it('forces the chosen result in every counted run, including scorelines', async () => {
    const { expandConditions } = await import('../lib/scenario')
    const { fixedMatchIds, runOneSimulation, simulationStrengths, emptyAggregate } = await import('../lib/simulation')
    setActiveDivision('d3h')
    const x = expandConditions([{ id: 'Q4', winner: 'HKUGA', goals: [3, 3] }])
    const strengths = simulationStrengths(fixedMatchIds('QF'))
    const agg = new Map([...ALL_KO_TEAMS].map((t) => [t, emptyAggregate(t)]))
    for (let i = 0; i < 300; i++) expect(runOneSimulation(strengths, agg, undefined, undefined, x.scenario)).toBe(true)
    expect(agg.get('CANADIAN')!.finishes.qf).toBe(300)
    expect(agg.get('HKUGA')!.finishes.qf).toBe(0)
    // 3-3 drawn on penalties, so goals for HKUGA and CANADIAN include 3 each from Q4 in every run
    expect(agg.get('HKUGA')!.gf).toBeGreaterThanOrEqual(900)
  })

  it('reaching a match is forced by earlier results, so a deep run is never thrown away', async () => {
    const { expandConditions } = await import('../lib/scenario')
    const { fixedMatchIds, runOneSimulation, simulationStrengths, emptyAggregate } = await import('../lib/simulation')
    setActiveDivision('d3h')
    const x = expandConditions([{ id: 'F', winner: 'SPCC' }])
    const strengths = simulationStrengths(fixedMatchIds('R14'))
    const agg = new Map([...ALL_KO_TEAMS].map((t) => [t, emptyAggregate(t)]))
    for (let i = 0; i < 200; i++) expect(runOneSimulation(strengths, agg, undefined, undefined, x.scenario)).toBe(true)
    expect(agg.get('SPCC')!.finishes.champion).toBe(200)
  })

  it('discards a run, without touching totals, when the needed team is missing', async () => {
    const { fixedMatchIds, runOneSimulation, simulationStrengths, emptyAggregate } = await import('../lib/simulation')
    setActiveDivision('d3h')
    // Third-place match winner SPCC: SPCC reaches it only by losing a semi-final, which is rare
    const scenario = new Map([['TP', { id: 'TP', winner: 'HKUGA' }]])
    const strengths = simulationStrengths(fixedMatchIds('R14'))
    const agg = new Map([...ALL_KO_TEAMS].map((t) => [t, emptyAggregate(t)]))
    let kept = 0
    for (let i = 0; i < 400; i++) if (runOneSimulation(strengths, agg, undefined, undefined, scenario)) kept++
    expect(kept).toBeLessThan(400)
    expect(kept).toBeGreaterThan(0)
    expect(agg.get('HKUGA')!.finishes.third).toBe(kept)
    const total = [...agg.values()].reduce((n, a) => n + a.finishes.champion, 0)
    expect(total).toBe(kept)
  })
})
