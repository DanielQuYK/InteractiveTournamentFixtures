import type { DivisionConfig } from './types'
import { NO_RESULTS } from '../results'

const GROUPS_RAW = `
1|2|27-09|10:45 AM|NAMS|LKYMS|KTP|1:2|
1|1|28-09|3:00 PM|TKPS|LCCS|THT|6:0|
1|3|13-10|3:00 PM|LKYMS|TKPS|KTP|2:12|
1|4|13-10|4:15 PM|LCCS|NAMS|KTP|7:0|
1|5|10-11|3:00 PM|TKPS|NAMS|KTP||
1|6|10-11|4:15 PM|LKYMS|LCCS|KTP||
2|1|28-09|4:00 PM|MKC|PTAL|LF|10:0|
2|2|28-09|4:15 PM|PLKCHYT|MYC|SKM|3:0|
2|3|14-10|3:00 PM|MYC|MKC|BS|0:10|
2|4|14-10|4:15 PM|PTAL|PLKCHYT|BS|0:1|
2|6|30-10|2:45 PM|MYC|PTAL|LF|1:0|A (20/10)
2|5|09-11|4:00 PM|MKC|PLKCHYT|LF||
3|9|28-09|4:15 PM|SKHLKY|LSTYKH|KBP|3:0|
3|10|29-09|3:00 PM|WFN|BHNK|KTP|2:0|W
3|1|09-10|2:45 PM|BHNK|SKHLKY|LF|0:2|W
3|2|09-10|4:00 PM|HKTAYY3|LSTYKH|LF|1:2|
3|3|22-10|4:15 PM|SKHLKY|WFN|BS|0:3|
3|4|22-10|2:15 PM|BHNK|HKTAYY3|PK1|0:2|W
3|5|02-11|1:00 PM|LSTYKH|BHNK|KBP|2:0|W
3|6|02-11|3:00 PM|WFN|HKTAYY3|KBP|2:0|W
3|7|09-11|3:30 PM|HKTAYY3|SKHLKY|PK1|0:2|W
3|8|09-11|3:00 PM|LSTYKH|WFN|SKM||
4|1|28-09|1:30 PM|UCC-KE|HPCCSS|LF|4:0|
4|2|29-09|4:15 PM|RCPHKMC|SMHYC|KTP|0:5|
4|3|11-10|10:45 AM|HPCCSS|HTMS-THT|KTP|6:1|
4|4|12-10|1:30 PM|UCC-KE|RCPHKMC|LF|5:0|
4|5|16-10|4:00 PM|SMHYC|UCC-KE|LF|1:2|
4|6|23-10|1:30 PM|HTMS-THT|RCPHKMC|LF|3:1|
4|7|02-11|4:15 PM|RCPHKMC|HPCCSS|KBP|0:1|
4|8|02-11|1:30 PM|SMHYC|HTMS-THT|LF|4:0|
4|10|07-11|9:45 AM|HTMS-THT|UCC-KE|THT|0:2|
4|9|09-11|4:15 PM|HPCCSS|SMHYC|SKM||
5|3|28-09|2:45 PM|PCCSS|KTGS|LF|2:0|
5|4|30-09|3:00 PM|SHSS|LKPFC|BS|14:0|
5|1|12-10|2:45 PM|SHSS|PCCSS|LF|0:2|
5|2|12-10|4:00 PM|LKPFC|KCS|LF|0:15|
5|6|17-10|1:30 PM|KTGS|LKPFC|KTP|1:0|
5|5|23-10|2:45 PM|KCS|SHSS|LF|1:0|
5|7|02-11|2:45 PM|LKPFC|PCCSS|LF|1:7|
5|8|02-11|4:00 PM|KCS|KTGS|LF|3:0|
5|9|07-11|11:00 AM|PCCSS|KCS|THT|0:3|
5|10|11-11|1:30 PM|KTGS|SHSS|LF||
6|3|10-10|9:45 AM|QUALIED|HTSS-TKO|THT|5:1|
6|4|10-10|11:00 AM|LA|LYC|THT|1:5|
6|1|21-10|1:30 PM|LA|QUALIED|LF|0:7|A (6/10)
6|2|21-10|2:45 PM|LYC|KLSS|LF|3:2|A (6/10)
6|5|24-10|8:30 AM|KLSS|LA|THT|6:0|
6|6|24-10|9:45 AM|HTSS-TKO|LYC|THT|3:4|
6|7|02-11|2:15 PM|LYC|QUALIED|PK1|0:2|
6|8|02-11|3:30 PM|KLSS|HTSS-TKO|PK1|4:0|
6|9|11-11|2:45 PM|QUALIED|KLSS|LF||
6|10|11-11|4:00 PM|HTSS-TKO|LA|LF||
`

export const K3: DivisionConfig = {
  id: 'k3',
  grade: 'A',
  level: 'Division Three',
  region: 'Kowloon 3',
  shortName: 'D3 · Kowloon 3',
  title: 'Division Three (K3) · Boys A Grade',
  blurb: '6 groups in progress; knockout line-up not yet drawn',
  documentDate: '27 October 2026',
  asOf: '2026-11-09',
  groupsRaw: GROUPS_RAW,
  withdrawn: {},
  penalties: {},
  firstRoundName: 'Round of 12',
  lineupConfirmed: false,
  results: NO_RESULTS,
  koMatches: [
    { id: 'R1', label: 'Round of 12 – Match 1', round: 'R14', date: '2026-11-18', time: '1:30 PM', venue: 'LF', home: { t: 'pending', seed: '2nd, group to be confirmed' }, away: { t: 'pending', seed: '2nd, group to be confirmed' } },
    { id: 'R2', label: 'Round of 12 – Match 2', round: 'R14', date: '2026-11-18', time: '2:45 PM', venue: 'LF', home: { t: 'pending', seed: '1st, group to be confirmed' }, away: { t: 'pending', seed: '2nd, group to be confirmed' } },
    { id: 'R3', label: 'Round of 12 – Match 3', round: 'R14', date: '2026-11-20', time: '1:30 PM', venue: 'LF', home: { t: 'pending', seed: '2nd, group to be confirmed' }, away: { t: 'pending', seed: '1st, group to be confirmed' } },
    { id: 'R4', label: 'Round of 12 – Match 4', round: 'R14', date: '2026-11-20', time: '2:45 PM', venue: 'LF', home: { t: 'pending', seed: '2nd, group to be confirmed' }, away: { t: 'pending', seed: '2nd, group to be confirmed' } },
    { id: 'Q1', label: 'Quarter-final 1', round: 'QF', date: '2026-11-26', time: '3:00 PM', venue: 'BS', home: { t: 'pending', seed: '1st, group to be confirmed – bye' }, away: { t: 'w', of: 'R1' } },
    { id: 'Q2', label: 'Quarter-final 2', round: 'QF', date: '2026-11-26', time: '2:15 PM', venue: 'PK1', home: { t: 'w', of: 'R2' }, away: { t: 'pending', seed: '1st, group to be confirmed – bye' } },
    { id: 'Q3', label: 'Quarter-final 3', round: 'QF', date: '2026-11-27', time: '1:30 PM', venue: 'LF', home: { t: 'pending', seed: '1st, group to be confirmed – bye' }, away: { t: 'w', of: 'R3' } },
    { id: 'Q4', label: 'Quarter-final 4', round: 'QF', date: '2026-11-27', time: '2:45 PM', venue: 'LF', home: { t: 'w', of: 'R4' }, away: { t: 'pending', seed: '1st, group to be confirmed – bye' } },
    { id: 'S1', label: 'Semi-final 1', round: 'SF', date: '2026-12-02', time: '1:30 PM', venue: 'LF', home: { t: 'w', of: 'Q1' }, away: { t: 'w', of: 'Q2' } },
    { id: 'S2', label: 'Semi-final 2', round: 'SF', date: '2026-12-02', time: '2:45 PM', venue: 'LF', home: { t: 'w', of: 'Q3' }, away: { t: 'w', of: 'Q4' } },
    { id: 'TP', label: 'Third-place play-off', round: 'TP', date: '2026-12-07', time: '1:30 PM', venue: 'LF', home: { t: 'l', of: 'S1' }, away: { t: 'l', of: 'S2' } },
    { id: 'F', label: 'Final', round: 'F', date: '2026-12-09', time: '12:00 PM', venue: 'KT', home: { t: 'w', of: 'S1' }, away: { t: 'w', of: 'S2' } },
  ],
}
