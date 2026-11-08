import { afterEach, describe, expect, it } from 'vitest'
import { setActiveDivision } from '../lib/data'
import { DIVISIONS, divisionById } from '../lib/divisions'
import { groupProgress, koProgress, stageOf } from '../lib/stage'
import { leaderboard } from '../lib/leaderboard'

afterEach(() => setActiveDivision('d3h'))
const stage = (id: string) => stageOf(divisionById(id)!)
const row = (mode: 'stage' | 'full', team: string) => leaderboard(mode).rows.find((r) => r.team === team)!

describe('latest stage', () => {
  it('Division Three HK: quarter-finals with one awaiting result and one still to play', () => {
    const s = stage('d3h')
    expect(s.label).toBe('Quarter-finals')
    expect(s.detail).toContain('2 of 4 played')
    expect(s.detail).toContain('1 awaiting a result')
    expect(s.detail).toContain('1 to play')
    expect(s.detail).toContain('1 score to be confirmed'.replace('1 score', '2 scores'))
    expect(koProgress(divisionById('d3h')!)).toEqual({ played: 8, total: 14 })
  })

  it('Division One and Two have not started the knockout', () => {
    expect(stage('d1').label).toBe('Semi-finals')
    expect(stage('d1').detail).toMatch(/^Awaiting all 2 games to start/)
    expect(stage('d2').label).toBe('Quarter-finals')
    expect(stage('d2').detail).toMatch(/^Awaiting all 4 games to start/)
  })

  it('Kowloon A Grade and every B Grade competition are still in the group stage', () => {
    for (const id of ['k1', 'k2', 'k3', 'd1b', 'd2b', 'd3hb', 'k1b', 'k2b', 'k3b']) expect(stage(id).label).toBe('Group stage')
    expect(stage('d1b').detail).toMatch(/^Awaiting the first game of 30/)
    expect(stage('d1b').tone).toBe('idle')
  })

  it('counts group games without cancelled or withdrawn fixtures', () => {
    expect(groupProgress(divisionById('k2')!).total).toBeLessThan(56)
    for (const d of DIVISIONS) expect(groupProgress(d).played).toBeLessThanOrEqual(groupProgress(d).total)
  })
})

describe('leaderboard by stage reached (Division Three HK)', () => {
  it('ties teams knocked out in the same round', () => {
    setActiveDivision('d3h')
    for (const t of ['QC', 'LHYMSS', 'SJA', 'KWSC', 'HW', 'SPCC']) {
      const r = row('stage', t)
      expect(r.rank).toBe('9=')
      expect([r.best, r.worst]).toEqual([9, 14])
    }
    for (const t of ['SKHLMC', 'SKHTSK']) expect(row('stage', t).rank).toBe('5=')
  })

  it('shows ranges for teams still in and ranks non-qualifiers below the bracket', () => {
    setActiveDivision('d3h')
    expect(row('stage', 'IKTMC').rank).toBe('1–4')
    expect(row('stage', 'KCC').rank).toBe('1–8')
    const exit = leaderboard('stage').rows.filter((r) => r.status === 'Out: group stage')
    expect(exit.length).toBeGreaterThan(0)
    expect(exit.every((r) => r.best === 15)).toBe(true)
    expect(leaderboard('stage').rows.find((r) => r.team === 'CCHK')!.status).toBe('Withdrew')
  })
})

describe('full ranking', () => {
  it('separates teams out at the same stage by points, then goal difference (per game when games differ)', () => {
    setActiveDivision('d3h')
    const block = leaderboard('full').rows.filter((r) => r.tier === 'Out in the round of 14')
    const share = (r: (typeof block)[number]) => r.groupPos / r.groupSize
    for (let i = 1; i < block.length; i++) {
      const a = block[i - 1], b = block[i]
      if (share(a) !== share(b)) expect(share(a)).toBeLessThan(share(b))
      else expect(a.ppg! > b.ppg! || (a.ppg === b.ppg && a.gdpg! >= b.gdpg!)).toBe(true)
    }
    expect(block[0].rank).toBe('9')
    expect(block.every((r) => r.basis === 'per game')).toBe(true)
  })

  it('reports knockout contributions separately from totals', () => {
    setActiveDivision('d3h')
    const r = leaderboard('full').rows.find((x) => x.team === 'IKTMC')!
    // IKTMC won R1 4-1 and Q1 2-0 (reported)
    expect(r.gf.knockout).toBe(6)
    expect(r.ga.knockout).toBe(1)
    expect(r.gd.knockout).toBe(5)
    expect(r.pts.knockout).toBe(6)
    expect(r.games.knockout).toBe(2)
    expect(r.gf.total).toBeGreaterThanOrEqual(r.gf.knockout)
    // A penalty-decided draw is a point each, not a win
    const skh = leaderboard('full').rows.find((x) => x.team === 'SKHTSK')!
    expect(skh.pts.knockout).toBe(1 + 1)
  })

  it('never lets group record overrule a knockout result', () => {
    setActiveDivision('d3h')
    const rows = leaderboard('full').rows
    const worstSettled = Math.max(...rows.filter((r) => r.status.startsWith('Out: Quarter')).map((r) => r.best))
    expect(rows.filter((r) => r.status.startsWith('Out: Round')).every((r) => r.best > worstSettled)).toBe(true)
  })
})

describe('Division One', () => {
  it('places the group third-place play-off at 5-6 and the rest at 7-12', () => {
    setActiveDivision('d1')
    const lb = leaderboard('full')
    const po = lb.rows.filter((r) => r.tier === 'Group third-place play-off')
    expect(po.map((r) => r.team).sort()).toEqual(['HKIS', 'LSC'])
    expect(po.every((r) => r.rank === '5–6')).toBe(true)
    const rest = lb.rows.filter((r) => r.status === 'Out: group stage')
    expect(rest).toHaveLength(6)
    expect(rest.map((r) => r.rank)).toEqual(['7', '8', '9', '10', '11', '12'])
    // Everyone played five games, so totals are compared directly, not averages
    expect(rest.every((r) => r.games.total === 5 && r.basis === 'totals')).toBe(true)
    for (let i = 1; i < rest.length; i++) expect(rest[i - 1].pts.total >= rest[i].pts.total).toBe(true)
    expect(po.every((r) => r.games.total === 5 && r.games.knockout === 0)).toBe(true) // 6 once the play-off is played
    expect(lb.rows.filter((r) => r.tier === 'Still in the competition')).toHaveLength(4)
  })

  it('shares places 7= in the stage version', () => {
    setActiveDivision('d1')
    expect(leaderboard('stage').rows.filter((r) => r.rank === '7=')).toHaveLength(6)
  })
})

describe('competitions without a knockout yet', () => {
  it('gives a provisional group-record table for Kowloon A Grade', () => {
    setActiveDivision('k1')
    const lb = leaderboard('full')
    expect(lb.knockoutKnown).toBe(false)
    expect(lb.rows.every((r) => r.status === 'Group stage')).toBe(true)
    expect(lb.rows[0].rank).toBe('1')
  })

  it('has no ranks before any B Grade game', () => {
    setActiveDivision('k2b')
    expect(leaderboard('full').rows.every((r) => r.rank === '–')).toBe(true)
  })

  it('leaves withdrawn K2 team unranked', () => {
    setActiveDivision('k2')
    const r = leaderboard('full').rows.find((x) => x.team === 'RSEFHKMC')!
    expect(r.withdrawn).toBe(true)
  })
})

describe('teams that missed the knockout in unequal groups (Division Three HK)', () => {
  it('does not rank the last team of a small group above mid-table teams from bigger groups', () => {
    setActiveDivision('d3h')
    const out = leaderboard('full').rows.filter((r) => r.status === 'Out: group stage')
    expect(out.every((r) => r.basis === 'per game')).toBe(true)
    const pos = (t: string) => out.findIndex((r) => r.team === t)
    // ISFA finished last of 3, WESLEY last of 4: both rank below 3rd-of-5 and 4th-of-5 teams
    expect(pos('ISFA')).toBeGreaterThan(pos('CSS'))
    expect(pos('ISFA')).toBeGreaterThan(pos('SKWGSS'))
    expect(pos('WESLEY')).toBeGreaterThan(pos('MSCHK'))
    // best placed: 3rd in a five-team group
    expect(out[0].groupPos / out[0].groupSize).toBeLessThanOrEqual(out[out.length - 1].groupPos / out[out.length - 1].groupSize)
  })
})
