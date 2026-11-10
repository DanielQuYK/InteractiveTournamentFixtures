import type { DivisionConfig } from './types'
import { NO_RESULTS } from '../results'

const GROUPS_RAW = `
1|1|02-10|2:45 PM|STCC|HLC|LF|5:0|
1|2|02-10|4:00 PM|EVANGEL|HTYC|LF|1:0|
1|3|14-10|4:15 PM|HTYC|STCC|KBP|1:3|
1|4|14-10|1:30 PM|HLC|EVANGEL|LF|0:1|
1|5|06-11|2:45 PM|STCC|EVANGEL|LF|0:2|
1|6|06-11|4:00 PM|HTYC|HLC|LF|0:2|
2|1|19-09|1:30 PM|WTSMC|PCMS|KTP|0:15|
2|2|19-09|2:45 PM|KTS|CDGFSS|KTP|0:1|
2|4|04-10|9:30 AM|WTSMC|KTS|KTP|3:3|
2|3|10-10|8:30 AM|PCMS|WWS|THT|3:0|A (3/10)
2|5|14-10|2:45 PM|CDGFSS|WTSMC|LF|1:1|
2|6|14-10|4:00 PM|WWS|KTS|LF|0:0|
2|7|24-10|11:00 AM|KTS|PCMS|THT|0:6|
2|8|26-10|1:00 PM|CDGFSS|WWS|KBP|4:0|
2|9|03-11|3:00 PM|PCMS|CDGFSS|KTP|7:0|
2|10|03-11|4:15 PM|WWS|WTSMC|KTP|4:0|
3|1|19-09|4:00 PM|CCSS|CSWCSS|KTP|0:3|
3|2|21-09|1:30 PM|CYT|PLKVKTC|LF|0:10|
3|3|06-10|3:00 PM|CSWCSS|QES|KTP|4:3|
3|4|06-10|4:15 PM|CCSS|CYT|KTP|1:1|
3|5|15-10|3:00 PM|PLKVKTC|CCSS|BS|6:0|
3|6|15-10|4:15 PM|QES|CYT|BS|1:0|
3|7|26-10|3:00 PM|CYT|CSWCSS|KBP|0:5|
3|8|26-10|4:15 PM|PLKVKTC|QES|KBP|4:1|
3|9|04-11|3:00 PM|CSWCSS|PLKVKTC|BS|1:1|
3|10|04-11|4:15 PM|QES|CCSS|BS|1:0|
4|1|21-09|2:45 PM|MKES|NDC|LF|0:5|
4|2|21-09|4:00 PM|BCKSS|CCCKT|LF|0:13|
4|3|04-10|10:45 AM|NDC|SSS|KTP|7:3|
4|4|05-10|1:30 PM|MKES|BCKSS|LF|3:1|
4|5|15-10|2:15 PM|CCCKT|MKES|PK1|1:1|
4|6|15-10|3:30 PM|SSS|BCKSS|PK1|3:1|
4|7|26-10|1:30 PM|BCKSS|NDC|LF|0:5|
4|8|26-10|2:45 PM|CCCKT|SSS|LF|8:1|
4|9|04-11|1:30 PM|NDC|CCCKT|LF|1:0|
4|10|04-11|2:45 PM|SSS|MKES|LF|2:3|
5|1|22-09|3:00 PM|NP2C|CS|KTP|6:0|
5|2|22-09|4:15 PM|PLKNO.1C|SKSS|KTP|0:5|
5|3|05-10|2:45 PM|CS|PLKNPL|LF|4:0|
5|4|05-10|4:00 PM|NP2C|PLKNO.1C|LF|0:0|
5|5|16-10|1:30 PM|SKSS|NP2C|LF|2:1|
5|6|16-10|2:45 PM|PLKNPL|PLKNO.1C|LF|1:1|
5|7|26-10|4:00 PM|PLKNO.1C|CS|LF|1:1|
5|8|26-10|2:15 PM|SKSS|PLKNPL|PK1|5:2|
5|9|04-11|4:00 PM|CS|SKSS|LF|1:1|
5|10|05-11|3:00 PM|PLKNPL|NP2C|BS|3:1|
6|1|23-09|3:00 PM|HGSS|JCGSS|BS|6:0|
6|2|23-09|4:15 PM|CMASS|KTSS|BS|1:4|
6|3|07-10|3:00 PM|JCGSS|HGC|BS|0:3|
6|4|07-10|4:15 PM|HGSS|CMASS|BS|10:0|
6|5|22-10|3:30 PM|KTSS|HGSS|PK1|1:6|
6|6|23-10|4:00 PM|HGC|CMASS|LF|3:1|
6|7|26-10|3:30 PM|CMASS|JCGSS|PK1|5:0|
6|8|26-10|3:00 PM|KTSS|HGC|THT|2:2|
6|9|05-11|4:15 PM|JCGSS|KTSS|BS|0:2|W
6|10|05-11|2:15 PM|HGC|HGSS|PK1|1:0|
`

export const K1: DivisionConfig = {
  id: 'k1',
  grade: 'A',
  level: 'Division Three',
  region: 'Kowloon 1',
  shortName: 'D3 · Kowloon 1',
  title: 'Division Three (K1) · Boys A Grade',
  blurb: '6 groups, 12 teams in the final round',
  documentDate: '27 October 2026',
  asOf: '2026-11-06',
  groupsRaw: GROUPS_RAW,
  withdrawn: {},
  penalties: {},
  firstRoundName: 'Round of 12',
  lineupConfirmed: true,
  results: NO_RESULTS,
  koMatches: [
    { id: 'R1', label: 'Round of 12 – Match 1', round: 'R14', date: '2026-11-12', time: '3:00 PM', venue: 'BS', home: { t: 'team', team: 'HGSS', seed: '2nd, Group 6' }, away: { t: 'team', team: 'CS', seed: '2nd, Group 5' } },
    { id: 'R2', label: 'Round of 12 – Match 2', round: 'R14', date: '2026-11-13', time: '1:30 PM', venue: 'LF', home: { t: 'team', team: 'NDC', seed: '1st, Group 4' }, away: { t: 'team', team: 'CSWCSS', seed: '2nd, Group 3' } },
    { id: 'R3', label: 'Round of 12 – Match 3', round: 'R14', date: '2026-11-13', time: '2:45 PM', venue: 'LF', home: { t: 'team', team: 'CDGFSS', seed: '2nd, Group 2' }, away: { t: 'team', team: 'PLKVKTC', seed: '1st, Group 3' } },
    { id: 'R4', label: 'Round of 12 – Match 4', round: 'R14', date: '2026-11-14', time: '1:30 PM', venue: 'KTP', home: { t: 'team', team: 'STCC', seed: '2nd, Group 1' }, away: { t: 'team', team: 'CCCKT', seed: '2nd, Group 4' } },
    { id: 'Q1', label: 'Quarter-final 1', round: 'QF', date: '2026-11-21', time: '1:30 PM', venue: 'KTP', home: { t: 'team', team: 'EVANGEL', seed: '1st, Group 1 – bye' }, away: { t: 'w', of: 'R1' } },
    { id: 'Q2', label: 'Quarter-final 2', round: 'QF', date: '2026-11-21', time: '2:45 PM', venue: 'KTP', home: { t: 'w', of: 'R2' }, away: { t: 'team', team: 'PCMS', seed: '1st, Group 2 – bye' } },
    { id: 'Q3', label: 'Quarter-final 3', round: 'QF', date: '2026-11-22', time: '9:30 AM', venue: 'KTP', home: { t: 'team', team: 'SKSS', seed: '1st, Group 5 – bye' }, away: { t: 'w', of: 'R3' } },
    { id: 'Q4', label: 'Quarter-final 4', round: 'QF', date: '2026-11-23', time: '1:30 PM', venue: 'LF', home: { t: 'w', of: 'R4' }, away: { t: 'team', team: 'HGC', seed: '1st, Group 6 – bye' } },
    { id: 'S1', label: 'Semi-final 1', round: 'SF', date: '2026-11-28', time: '2:15 PM', venue: 'PK1', home: { t: 'w', of: 'Q1' }, away: { t: 'w', of: 'Q2' } },
    { id: 'S2', label: 'Semi-final 2', round: 'SF', date: '2026-11-30', time: '2:15 PM', venue: 'PK1', home: { t: 'w', of: 'Q3' }, away: { t: 'w', of: 'Q4' } },
    { id: 'TP', label: 'Third-place play-off', round: 'TP', date: '2026-12-04', time: '1:30 PM', venue: 'LF', home: { t: 'l', of: 'S1' }, away: { t: 'l', of: 'S2' } },
    { id: 'F', label: 'Final', round: 'F', date: '2026-12-08', time: '12:00 PM', venue: 'KT', home: { t: 'w', of: 'S1' }, away: { t: 'w', of: 'S2' } },
  ],
}
