import type { KoResult } from '../results'

export type KoRound = 'R14' | 'QF' | 'SF' | 'TP' | 'F' | 'PO'

/** A place in a fixture: a named team, the winner or loser of another match, or a seed whose team is not yet known. */
export type KoSlotSpec =
  | { t: 'team'; team: string; seed: string }
  | { t: 'w'; of: string }
  | { t: 'l'; of: string }
  | { t: 'pending'; seed: string }

export interface KoMatchSpec {
  id: string
  label: string
  round: KoRound
  date: string
  time: string
  venue: string
  home: KoSlotSpec
  away: KoSlotSpec
}

/** Everything that defines one division or district: its groups, final-round bracket and results. */
export interface DivisionConfig {
  id: string
  level: string
  region: string
  shortName: string
  title: string
  blurb: string
  /** Date of the organiser's latest fixture document. */
  documentDate: string
  /** group|game|dd-mm|time|home|away|venue|score|remark */
  groupsRaw: string
  withdrawn: Record<string, string>
  /** Points deducted after disqualification. */
  penalties: Record<string, number>
  /** Name of the first knockout round, e.g. "Round of 14" or "Quarter-finals". */
  firstRoundName: string
  /** False while the final-round line-up has not been drawn. */
  lineupConfirmed: boolean
  results: Record<string, KoResult>
  koMatches: KoMatchSpec[]
}
