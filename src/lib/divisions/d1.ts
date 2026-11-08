import type { DivisionConfig } from './types'
import { NO_RESULTS } from '../results'

const GROUPS_RAW = `
1|1|21-09|3:00 PM|SJC|WYHK|AB|0:1|
1|2|21-09|4:15 PM|YWC|WIS|AB|3:1|
1|3|21-09|3:00 PM|TSIS|LSC|SKM|0:2|
1|4|28-09|3:00 PM|WIS|SJC|AB|1:3|
1|5|28-09|1:00 PM|WYHK|LSC|KBP|3:0|
1|6|28-09|3:00 PM|YWC|TSIS|KBP|2:2|
1|7|05-10|1:00 PM|SJC|LSC|KBP|5:0|
1|8|05-10|3:00 PM|WIS|TSIS|KBP|2:2|
1|9|05-10|4:15 PM|WYHK|YWC|KBP|2:1|
1|12|12-10|4:15 PM|WIS|WYHK|AB|1:0|
1|10|14-10|1:00 PM|TSIS|SJC|KBP|0:1|
1|11|14-10|3:00 PM|LSC|YWC|KBP|2:0|
1|13|24-10|2:15 PM|SJC|YWC|PK1|3:1|
1|15|24-10|3:30 PM|LSC|WIS|PK1|2:2|
1|14|26-10|4:15 PM|TSIS|WYHK|SKM|0:1|
2|1|19-09|1:30 PM|DBS|CIS|CB|3:2|
2|2|19-09|2:45 PM|HKIS|KGV|CB|3:0|
2|3|19-09|4:00 PM|FIS|WYK|CB|4:1|
2|10|23-09|1:00 PM|FIS|DBS|KBP|1:1|
2|11|23-09|3:00 PM|WYK|HKIS|KBP|0:5|
2|12|23-09|4:15 PM|KGV|CIS|KBP|2:4|
2|4|30-09|2:15 PM|KGV|DBS|PK1|2:12|
2|14|05-10|3:00 PM|FIS|CIS|AB|3:0|
2|13|05-10|3:00 PM|DBS|HKIS|SKM|4:0|
2|15|05-10|4:15 PM|WYK|KGV|SKM|3:1|
2|9|12-10|3:00 PM|CIS|HKIS|AB|0:0|
2|7|12-10|3:00 PM|DBS|WYK|SKM|1:0|
2|8|12-10|4:15 PM|KGV|FIS|SKM|0:6|DQ* (-3 pts)
2|5|26-10|3:00 PM|CIS|WYK|SKM|0:1|
2|6|28-10|4:15 PM|HKIS|FIS|AB|3:3|
`

export const D1: DivisionConfig = {
  id: 'd1',
  grade: 'A',
  level: 'Division One',
  region: '',
  shortName: 'D1',
  title: 'Division One · Boys A Grade',
  blurb: '2 groups, 4 teams in the final round',
  documentDate: '27 October 2026',
  asOf: '2026-10-27',
  groupsRaw: GROUPS_RAW,
  withdrawn: {},
  penalties: {"KGV": 3},
  firstRoundName: 'Semi-finals',
  lineupConfirmed: true,
  results: NO_RESULTS,
  koMatches: [
    { id: 'S1', label: 'Semi-final 1', round: 'SF', date: '2026-11-23', time: '3:15 PM', venue: 'KBP', home: { t: 'team', team: 'WYHK', seed: '1st, Group 1' }, away: { t: 'team', team: 'FIS', seed: '2nd, Group 2' } },
    { id: 'S2', label: 'Semi-final 2', round: 'SF', date: '2026-11-23', time: '3:15 PM', venue: 'SKM', home: { t: 'team', team: 'SJC', seed: '2nd, Group 1' }, away: { t: 'team', team: 'DBS', seed: '1st, Group 2' } },
    { id: 'TP', label: 'Third-place play-off', round: 'TP', date: '2026-12-02', time: '3:15 PM', venue: 'KBP', home: { t: 'l', of: 'S1' }, away: { t: 'l', of: 'S2' } },
    { id: 'F', label: 'Final', round: 'F', date: '2026-12-07', time: '4:30 PM', venue: 'KT', home: { t: 'w', of: 'S1' }, away: { t: 'w', of: 'S2' } },
    { id: 'PO', label: 'Group third-place play-off', round: 'PO', date: '2026-11-30', time: '3:15 PM', venue: 'SKM', home: { t: 'team', team: 'LSC', seed: '3rd, Group 1' }, away: { t: 'team', team: 'HKIS', seed: '3rd, Group 2' } },
  ],
}
