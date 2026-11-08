import type { DivisionConfig } from './types'
import { NO_RESULTS } from '../results'

const GROUPS_RAW = `
1|2|20-09|9:30 AM|SLS|CPSS|SKP|1:1|
1|1|21-09|2:15 PM|PLKLFC|SYSS|PK1|0:4|
1|5|28-09|2:15 PM|CPSS|PLKLFC|PK1|12:0|
1|6|28-09|3:30 PM|CREATIVE|SLS|PK1|0:2|
1|4|05-10|2:15 PM|PLKLFC|SLS|PK1|1:7|
1|3|05-10|3:30 PM|SYSS|CREATIVE|PK1|1:3|
1|7|10-10|1:30 PM|SLS|SYSS|CB|4:0|
1|8|10-10|2:45 PM|CPSS|CREATIVE|CB|1:0|
1|9|27-10|3:00 PM|SYSS|CPSS|CB|1:3|
1|10|27-10|4:15 PM|CREATIVE|PLKLFC|CB|4:0|
2|1|21-09|3:30 PM|MSC|KTMC|PK1|0:7|
2|2|21-09|4:15 PM|SEKSS-WK|DMS-HW|SKM|4:3|
2|3|28-09|3:00 PM|KTMC|GTEYC|SKM|11:0|
2|5|08-10|2:15 PM|DMS-HW|MSC|PK1|1:1|
2|6|08-10|3:30 PM|GTEYC|SEKSS-WK|PK1|0:11|
2|7|12-10|2:15 PM|SEKSS-WK|KTMC|PK1|0:7|
2|8|12-10|3:30 PM|DMS-HW|GTEYC|PK1|2:0|W
2|4|26-10|3:00 PM|MSC|SEKSS-WK|AB|1:4|A (6/10)
2|9|29-10|2:15 PM|KTMC|DMS-HW|PK1|1:1|
2|10|29-10|3:30 PM|GTEYC|MSC|PK1|0:9|
3|2|19-09|8:30 AM|DMS-BW|SJACS|THT|5:1|
3|1|20-09|10:45 AM|SSCS|IS|SKP|2:3|
3|3|23-09|4:15 PM|IS|SS|SKP|0:0|
3|4|24-09|3:30 PM|SSCS|DMS-BW|PK1|0:0|
3|5|10-10|4:00 PM|SJACS|SSCS|CB|0:4|
3|6|11-10|9:30 AM|SS|DMS-BW|SKP|0:4|
3|7|17-10|1:30 PM|DMS-BW|IS|CB|2:1|
3|8|17-10|2:45 PM|SJACS|SS|CB|1:0|
3|10|21-10|3:00 PM|SS|SSCS|AB|0:4|A (6/10)
3|9|21-10|4:15 PM|IS|SJACS|AB|3:0|A (6/10)
4|1|19-09|9:45 AM|MFS|VSA|THT|1:1|
4|3|23-09|3:00 PM|VSA|DMS-GP|SKP|6:1|
4|4|24-09|2:15 PM|MFS|CSK|PK1|1:3|
4|2|02-10|4:30 PM|CSK|SPC|AB|0:0|A (15/9)
4|5|06-10|3:00 PM|SPC|MFS|CB|2:1|
4|6|06-10|4:15 PM|DMS-GP|CSK|CB|3:2|
4|8|14-10|4:15 PM|SPC|DMS-GP|SKP|1:2|A (30/9)
4|10|17-10|8:30 AM|DMS-GP|MFS|THT|2:0|
4|9|17-10|4:00 PM|VSA|SPC|CB|2:3|
4|7|28-10|3:00 PM|CSK|VSA|AB|1:4|A (6/10)
`

export const D2: DivisionConfig = {
  id: 'd2',
  level: 'Division Two',
  region: '',
  shortName: 'D2',
  title: 'Division Two · Boys A Grade',
  blurb: '4 groups, 8 teams in the final round',
  documentDate: '27 October 2026',
  groupsRaw: GROUPS_RAW,
  withdrawn: {},
  penalties: {},
  firstRoundName: 'Quarter-finals',
  lineupConfirmed: true,
  results: NO_RESULTS,
  koMatches: [
    { id: 'Q1', label: 'Quarter-final 1', round: 'QF', date: '2026-11-10', time: '3:00 PM', venue: 'CB', home: { t: 'team', team: 'DMS-GP', seed: '1st, Group 4' }, away: { t: 'team', team: 'SEKSS-WK', seed: '2nd, Group 2' } },
    { id: 'Q2', label: 'Quarter-final 2', round: 'QF', date: '2026-11-11', time: '3:00 PM', venue: 'AB', home: { t: 'team', team: 'SLS', seed: '2nd, Group 1' }, away: { t: 'team', team: 'DMS-BW', seed: '1st, Group 3' } },
    { id: 'Q3', label: 'Quarter-final 3', round: 'QF', date: '2026-11-11', time: '3:00 PM', venue: 'KBP', home: { t: 'team', team: 'KTMC', seed: '1st, Group 2' }, away: { t: 'team', team: 'SPC', seed: '2nd, Group 4' } },
    { id: 'Q4', label: 'Quarter-final 4', round: 'QF', date: '2026-11-11', time: '3:00 PM', venue: 'SKP', home: { t: 'team', team: 'IS', seed: '2nd, Group 3' }, away: { t: 'team', team: 'CPSS', seed: '1st, Group 1' } },
    { id: 'S1', label: 'Semi-final 1', round: 'SF', date: '2026-11-16', time: '3:00 PM', venue: 'KBP', home: { t: 'w', of: 'Q1' }, away: { t: 'w', of: 'Q2' } },
    { id: 'S2', label: 'Semi-final 2', round: 'SF', date: '2026-11-16', time: '3:00 PM', venue: 'SKM', home: { t: 'w', of: 'Q3' }, away: { t: 'w', of: 'Q4' } },
    { id: 'TP', label: 'Third-place play-off', round: 'TP', date: '2026-12-03', time: '2:15 PM', venue: 'PK1', home: { t: 'l', of: 'S1' }, away: { t: 'l', of: 'S2' } },
    { id: 'F', label: 'Final', round: 'F', date: '2026-12-08', time: '9:45 AM', venue: 'KT', home: { t: 'w', of: 'S1' }, away: { t: 'w', of: 'S2' } },
  ],
}
