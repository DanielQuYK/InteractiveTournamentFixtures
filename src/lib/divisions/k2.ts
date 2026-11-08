import type { DivisionConfig } from './types'
import { NO_RESULTS } from '../results'

const GROUPS_RAW = `
1|2|30-09|4:15 PM|MMWC|CHECSS|BS|0:2|
1|1|02-10|1:30 PM|SFXC|WKC|LF|2:0|W
1|3|17-10|2:45 PM|CHECSS|SFXC|KTP|1:4|
1|4|17-10|4:00 PM|WKC|MMWC|KTP|2:0|
1|5|05-11|3:30 PM|SFXC|MMWC|PK1|7:0|
1|6|06-11|1:30 PM|CHECSS|WKC|LF||
2|1|23-09|1:30 PM|SKHKH|K-LING|LF|1:4|
2|2|23-09|2:45 PM|SMCESPS|NWC|LF|1:4|
2|3|07-10|1:30 PM|K-LING|TYH|LF|1:0|
2|4|07-10|2:45 PM|SKHKH|SMCESPS|LF|0:0|
2|5|17-10|9:45 AM|NWC|SKHKH|THT|1:4|
2|6|17-10|11:00 AM|TYH|SMCESPS|THT|3:0|
2|7|26-10|4:15 PM|SMCESPS|K-LING|THT|0:6|
2|8|28-10|3:00 PM|NWC|TYH|BS|1:1|
2|9|02-11|3:00 PM|K-LING|NWC|SKM|4:2|
2|10|02-11|4:15 PM|TYH|SKHKH|SKM|1:3|
3|1|23-09|4:00 PM|WKIU|KTKLGSS|LF|0:2|
3|2|24-09|3:00 PM|NCC|FSS-KT|BS|1:5|
3|3|07-10|4:00 PM|KTKLGSS|SLCSS|LF|5:0|
3|4|08-10|3:00 PM|WKIU|NCC|BS|0:2|
3|5|20-10|3:00 PM|FSS-KT|WKIU|KTP|7:0|
3|6|20-10|4:15 PM|SLCSS|NCC|KTP|0:0|
3|7|28-10|4:15 PM|NCC|KTKLGSS|BS|1:6|
3|8|29-10|3:00 PM|FSS-KT|SLCSS|BS|3:0|
3|9|07-11|1:30 PM|KTKLGSS|FSS-KT|KTP||
3|10|07-11|2:45 PM|SLCSS|WKIU|KTP||
4|1|24-09|4:15 PM|CSL|SKHTKP|BS|1:2|
4|2|25-09|1:30 PM|LS|DLKP|LF|1:1|
4|3|10-10|1:30 PM|SKHTKP|YCIS|KTP|0:0|
4|4|10-10|2:45 PM|CSL|LS|KTP|2:4|
4|5|21-10|3:00 PM|DLKP|CSL|BS|1:3|
4|6|21-10|4:15 PM|YCIS|LS|BS|1:1|
4|7|29-10|4:15 PM|LS|SKHTKP|BS|2:5|
4|8|30-10|1:30 PM|DLKP|YCIS|LF|0:1|
4|9|07-11|4:00 PM|SKHTKP|DLKP|KTP||
4|10|07-11|8:30 AM|YCIS|CSL|THT||
5|1|25-09|2:45 PM|MDIST|TTCA|LF|0:3|
5|2|25-09|4:00 PM|RSEFHKMC|LSTWCM|LF|-|C
5|3|08-10|4:15 PM|TTCA|DMS-HW2C|BS|6:0|
5|4|09-10|1:30 PM|MDIST|RSEFHKMC|LF|-|C
5|5|09-10|1:30 PM|LSTWCM|MDIST|LF|0:0|A (29/9)
5|6|21-10|2:45 PM|DMS-HW2C|RSEFHKMC|LF|-|C
5|7|30-10|2:45 PM|RSEFHKMC|TTCA|LF|-|C
5|8|30-10|4:00 PM|LSTWCM|DMS-HW2C|LF|0:1|
5|9|09-11|1:30 PM|TTCA|LSTWCM|LF||
5|10|09-11|2:45 PM|DMS-HW2C|MDIST|LF||
6|1|27-09|9:30 AM|BTHC|UCC-THT|KTP|0:5|
6|2|28-09|4:15 PM|TKOGSS|PLKCKY|THT|0:3|
6|3|10-10|4:00 PM|UCC-THT|YCKMC|KTP|1:3|
6|4|11-10|9:30 AM|BTHC|TKOGSS|KTP|3:1|
6|5|21-10|4:00 PM|PLKCKY|BTHC|LF|2:0|
6|6|22-10|3:00 PM|YCKMC|TKOGSS|BS|2:1|
6|7|31-10|2:15 PM|TKOGSS|UCC-THT|PK1|1:3|
6|8|31-10|3:30 PM|PLKCKY|YCKMC|PK1|0:3|
6|9|08-11|9:30 AM|UCC-THT|PLKCKY|KTP||
6|10|08-11|10:45 AM|YCKMC|BTHC|KTP||
`

export const K2: DivisionConfig = {
  id: 'k2',
  level: 'Division Three',
  region: 'Kowloon 2',
  shortName: 'D3 · Kowloon 2',
  title: 'Division Three (K2) · Boys A Grade',
  blurb: '6 groups in progress; knockout line-up not yet drawn',
  documentDate: '27 October 2026',
  groupsRaw: GROUPS_RAW,
  withdrawn: {"RSEFHKMC": "Withdrew on 25 September 2026"},
  penalties: {},
  firstRoundName: 'Round of 12',
  lineupConfirmed: false,
  results: NO_RESULTS,
  koMatches: [
    { id: 'R1', label: 'Round of 12 – Match 1', round: 'R14', date: '2026-11-14', time: '2:45 PM', venue: 'KTP', home: { t: 'pending', seed: '2nd, group to be confirmed' }, away: { t: 'pending', seed: '2nd, group to be confirmed' } },
    { id: 'R2', label: 'Round of 12 – Match 2', round: 'R14', date: '2026-11-16', time: '1:30 PM', venue: 'LF', home: { t: 'pending', seed: '1st, group to be confirmed' }, away: { t: 'pending', seed: '2nd, group to be confirmed' } },
    { id: 'R3', label: 'Round of 12 – Match 3', round: 'R14', date: '2026-11-16', time: '2:45 PM', venue: 'LF', home: { t: 'pending', seed: '2nd, group to be confirmed' }, away: { t: 'pending', seed: '1st, group to be confirmed' } },
    { id: 'R4', label: 'Round of 12 – Match 4', round: 'R14', date: '2026-11-17', time: '3:00 PM', venue: 'KTP', home: { t: 'pending', seed: '2nd, group to be confirmed' }, away: { t: 'pending', seed: '2nd, group to be confirmed' } },
    { id: 'Q1', label: 'Quarter-final 1', round: 'QF', date: '2026-11-23', time: '2:45 PM', venue: 'LF', home: { t: 'pending', seed: '1st, group to be confirmed – bye' }, away: { t: 'w', of: 'R1' } },
    { id: 'Q2', label: 'Quarter-final 2', round: 'QF', date: '2026-11-23', time: '2:15 PM', venue: 'PK1', home: { t: 'w', of: 'R2' }, away: { t: 'pending', seed: '1st, group to be confirmed – bye' } },
    { id: 'Q3', label: 'Quarter-final 3', round: 'QF', date: '2026-11-24', time: '3:00 PM', venue: 'KTP', home: { t: 'pending', seed: '1st, group to be confirmed – bye' }, away: { t: 'w', of: 'R3' } },
    { id: 'Q4', label: 'Quarter-final 4', round: 'QF', date: '2026-11-25', time: '3:00 PM', venue: 'BS', home: { t: 'w', of: 'R4' }, away: { t: 'pending', seed: '1st, group to be confirmed – bye' } },
    { id: 'S1', label: 'Semi-final 1', round: 'SF', date: '2026-11-30', time: '1:30 PM', venue: 'LF', home: { t: 'w', of: 'Q1' }, away: { t: 'w', of: 'Q2' } },
    { id: 'S2', label: 'Semi-final 2', round: 'SF', date: '2026-11-30', time: '2:45 PM', venue: 'LF', home: { t: 'w', of: 'Q3' }, away: { t: 'w', of: 'Q4' } },
    { id: 'TP', label: 'Third-place play-off', round: 'TP', date: '2026-12-04', time: '2:45 PM', venue: 'LF', home: { t: 'l', of: 'S1' }, away: { t: 'l', of: 'S2' } },
    { id: 'F', label: 'Final', round: 'F', date: '2026-12-09', time: '9:45 AM', venue: 'KT', home: { t: 'w', of: 'S1' }, away: { t: 'w', of: 'S2' } },
  ],
}
