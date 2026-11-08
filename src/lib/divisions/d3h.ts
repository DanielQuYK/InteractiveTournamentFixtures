import type { DivisionConfig } from './types'
import { D3H_RESULTS } from '../results'

const GROUPS_RAW = `
1|1|27-09|9:30 AM|HKUGA|WESLEY|HV|1:0|
1|2|27-09|10:45 AM|LHYMSS|LSTLKK|HV|1:1|
1|3|10-10|2:45 PM|LSTLKK|HKUGA|HV|0:2|
1|4|10-10|4:00 PM|WESLEY|LHYMSS|HV|0:1|
1|5|18-10|9:30 AM|HKUGA|LHYMSS|HV|1:1|A (23/9)
1|6|18-10|10:45 AM|LSTLKK|WESLEY|HV|3:1|A (18/9), A (23/9)
2|1|28-09|4:15 PM|SKHLMC|CCHK|AB|-|C
2|2|29-09|3:00 PM|SPCC|ISFA|CB|1:5|
2|3|11-10|9:30 AM|ISFA|SKHLMC|HV|0:3|DQ* (-3 pts)
2|4|11-10|10:45 AM|CCHK|SPCC|HV|-|C
2|6|14-10|4:15 PM|ISFA|CCHK|SKP|-|C
2|5|20-10|4:15 PM|SKHLMC|SPCC|CB|1:1|
3|1|19-09|1:30 PM|HKTKP|KCC|HV|1:2|
3|2|19-09|2:45 PM|ABLMCC|KC|HV|0:2|W
3|4|29-09|3:00 PM|HKTKP|ABLMCC|HV|1:2|
3|3|29-09|4:15 PM|KCC|CFSS|CB|4:0|
3|5|04-10|9:30 AM|KC|HKTKP|HV|2:0|
3|6|04-10|10:45 AM|CFSS|ABLMCC|HV|3:0|
3|7|13-10|3:00 PM|ABLMCC|KCC|HV|0:4|
3|8|13-10|4:15 PM|KC|CFSS|HV|2:5|
3|9|20-10|3:00 PM|KCC|KC|HV|2:0|
3|10|20-10|4:15 PM|CFSS|HKTKP|HV|7:1|
4|1|19-09|4:00 PM|SPETER|HW|HV|3:3|
4|3|29-09|4:15 PM|HW|MSCHK|HV|0:0|
4|4|30-09|3:00 PM|SPETER|CSS|AB|3:6|
4|5|05-10|4:15 PM|QC|SPETER|AB|8:1|
4|6|06-10|3:00 PM|MSCHK|CSS|HV|0:0|
4|7|13-10|3:00 PM|CSS|HW|CB|0:2|
4|8|13-10|4:15 PM|QC|MSCHK|CB|2:2|
4|2|17-10|4:00 PM|CSS|QC|HV|1:3|
4|9|24-10|1:30 PM|HW|QC|CB|3:0|
4|10|24-10|2:45 PM|MSCHK|SPETER|CB|1:0|
5|1|20-09|10:45 AM|LCD|CANADIAN|HV|0:14|
5|2|22-09|3:00 PM|SKWGSS|CWCC|CB|4:0|
5|3|30-09|4:15 PM|CANADIAN|IKTMC|AB|6:0|
5|4|30-09|3:00 PM|LCD|SKWGSS|SKP|0:2|
5|5|06-10|4:15 PM|CWCC|LCD|HV|1:6|
5|6|07-10|3:00 PM|IKTMC|SKWGSS|AB|1:1|
5|7|14-10|3:00 PM|SKWGSS|CANADIAN|AB|0:4|
5|8|14-10|4:15 PM|CWCC|IKTMC|AB|0:2|
5|9|24-10|4:00 PM|CANADIAN|CWCC|CB|2:0|W
5|10|24-10|1:30 PM|IKTMC|LCD|HV|13:1|
6|1|22-09|3:00 PM|CGHC|BWFL|HV|0:2|W
6|2|22-09|4:15 PM|KWSC|RC|HV|3:2|
6|3|30-09|4:15 PM|BWFL|SJA|SKP|2:3|
6|4|03-10|1:30 PM|CGHC|KWSC|HV|2:4|
6|5|07-10|4:15 PM|RC|CGHC|AB|2:0|
6|6|07-10|3:00 PM|SJA|KWSC|SKP|0:2|W
6|7|14-10|3:00 PM|KWSC|BWFL|SKP|9:0|
6|8|20-10|3:00 PM|RC|SJA|CB|1:2|
6|9|24-10|2:45 PM|BWFL|RC|HV|2:2|
6|10|24-10|4:00 PM|SJA|CGHC|HV|4:0|
7|1|22-09|4:15 PM|HS|SKHTSK|CB|1:1|
7|2|23-09|3:00 PM|ISS|AICH|AB|3:2|
7|3|03-10|2:45 PM|SKHTSK|CCSC|HV|1:0|
7|4|03-10|4:00 PM|HS|ISS|HV|1:3|
7|5|07-10|4:15 PM|AICH|HS|SKP|4:3|
7|6|10-10|1:30 PM|CCSC|ISS|HV|0:10|
7|7|17-10|1:30 PM|ISS|SKHTSK|HV|1:3|
7|8|17-10|2:45 PM|AICH|CCSC|HV|1:4|
7|9|25-10|9:30 AM|SKHTSK|AICH|HV|2:3|
7|10|25-10|10:45 AM|CCSC|HS|HV|2:2|
`

export const D3H: DivisionConfig = {
  id: 'd3h',
  level: 'Division Three',
  region: 'Hong Kong Island',
  shortName: 'D3 · HK Island',
  title: 'Division Three (HK) · Boys A Grade',
  blurb: '7 groups, 14 teams in the final round',
  documentDate: '5 November 2026',
  groupsRaw: GROUPS_RAW,
  withdrawn: {"CCHK": "Withdrew on 22 September 2026"},
  penalties: {"ISFA": 3},
  firstRoundName: 'Round of 14',
  lineupConfirmed: true,
  results: D3H_RESULTS,
  koMatches: [
    { id: 'R1', label: 'Round of 14 – Match 1', round: 'R14', date: '2026-11-03', time: '3:00 PM', venue: 'CB', home: { t: 'team', team: 'IKTMC', seed: '2nd, Group 5' }, away: { t: 'team', team: 'QC', seed: '2nd, Group 4' } },
    { id: 'R2', label: 'Round of 14 – Match 2', round: 'R14', date: '2026-11-03', time: '4:15 PM', venue: 'CB', home: { t: 'team', team: 'KCC', seed: '1st, Group 3' }, away: { t: 'team', team: 'LHYMSS', seed: '2nd, Group 1' } },
    { id: 'R3', label: 'Round of 14 – Match 3', round: 'R14', date: '2026-11-03', time: '3:00 PM', venue: 'HV', home: { t: 'team', team: 'SJA', seed: '2nd, Group 6' }, away: { t: 'team', team: 'ISS', seed: '1st, Group 7' } },
    { id: 'R4', label: 'Round of 14 – Match 4', round: 'R14', date: '2026-11-03', time: '4:15 PM', venue: 'HV', home: { t: 'team', team: 'KWSC', seed: '1st, Group 6' }, away: { t: 'team', team: 'CFSS', seed: '2nd, Group 3' } },
    { id: 'R5', label: 'Round of 14 – Match 5', round: 'R14', date: '2026-11-04', time: '3:00 PM', venue: 'AB', home: { t: 'team', team: 'HW', seed: '1st, Group 4' }, away: { t: 'team', team: 'SKHTSK', seed: '2nd, Group 7' } },
    { id: 'R6', label: 'Round of 14 – Match 6', round: 'R14', date: '2026-11-04', time: '4:15 PM', venue: 'AB', home: { t: 'team', team: 'HKUGA', seed: '1st, Group 1' }, away: { t: 'team', team: 'SPCC', seed: '2nd, Group 2' } },
    { id: 'Q1', label: 'Quarter-final 1', round: 'QF', date: '2026-11-07', time: '1:30 PM', venue: 'HV', home: { t: 'team', team: 'SKHLMC', seed: '1st, Group 2 – bye' }, away: { t: 'w', of: 'R1' } },
    { id: 'Q2', label: 'Quarter-final 2', round: 'QF', date: '2026-11-07', time: '2:45 PM', venue: 'HV', home: { t: 'w', of: 'R2' }, away: { t: 'w', of: 'R3' } },
    { id: 'Q3', label: 'Quarter-final 3', round: 'QF', date: '2026-11-08', time: '9:30 AM', venue: 'HV', home: { t: 'w', of: 'R4' }, away: { t: 'w', of: 'R5' } },
    { id: 'Q4', label: 'Quarter-final 4', round: 'QF', date: '2026-11-10', time: '3:00 PM', venue: 'HV', home: { t: 'w', of: 'R6' }, away: { t: 'team', team: 'CANADIAN', seed: '1st, Group 5 – bye' } },
    { id: 'S1', label: 'Semi-final 1', round: 'SF', date: '2026-11-18', time: '3:00 PM', venue: 'AB', home: { t: 'w', of: 'Q1' }, away: { t: 'w', of: 'Q2' } },
    { id: 'S2', label: 'Semi-final 2', round: 'SF', date: '2026-11-18', time: '3:00 PM', venue: 'SKP', home: { t: 'w', of: 'Q3' }, away: { t: 'w', of: 'Q4' } },
    { id: 'TP', label: 'Third-place play-off', round: 'TP', date: '2026-12-02', time: '3:00 PM', venue: 'AB', home: { t: 'l', of: 'S1' }, away: { t: 'l', of: 'S2' } },
    { id: 'F', label: 'Final', round: 'F', date: '2026-12-07', time: '2:15 PM', venue: 'KT', home: { t: 'w', of: 'S1' }, away: { t: 'w', of: 'S2' } },
  ],
}
