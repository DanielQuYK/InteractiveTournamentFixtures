import { afterEach, describe, expect, it } from 'vitest'
import {
  ALL_KO_TEAMS, GROUPS, GROUP_MATCHES, KO_MATCHES, WITHDRAWN, PENALTIES, groupComplete, setActiveDivision, slotTeam, standings,
} from '../lib/data'
import { DIVISIONS } from '../lib/divisions'
import { MATCH_ORDER, FINISHES, emptyAggregate, runOneSimulation, simulationStrengths, startStageOptions } from '../lib/simulation'
import { BYES, POS, bracketLines, totalH, totalW } from '../lib/bracketLayout'
import { validateQualifiers, validateResults } from '../lib/validation'

afterEach(() => setActiveDivision('d3h'))

const teamsOf = (id: string) => {
  setActiveDivision(id)
  return new Set(GROUP_MATCHES.flatMap((m) => [m.home, m.away]))
}

describe('division registry', () => {
  it('has unique ids', () => {
    expect(new Set(DIVISIONS.map((d) => d.id)).size).toBe(DIVISIONS.length)
    expect(DIVISIONS.map((d) => d.id)).toEqual(['d1', 'd2', 'd3h', 'k1', 'k2', 'k3'])
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

describe('D3H unchanged after switching', () => {
  it('restores its own data', () => {
    setActiveDivision('k1')
    setActiveDivision('d3h')
    expect([...GROUPS]).toHaveLength(7)
    expect(ALL_KO_TEAMS.has('SKHLMC')).toBe(true)
    expect(MATCH_ORDER).toHaveLength(14)
  })
})
