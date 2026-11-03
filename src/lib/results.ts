/**
 * Knockout results — the single place to record scores as the final round is played.
 *
 * Keys are match ids:
 *   R1–R6  Round of 14      Q1–Q4  Quarter-finals
 *   S1–S2  Semi-finals      TP     Third-place play-off     F  Final
 *
 * `score` is [home, away] after normal and extra time. If the score is level,
 * add `pens: [home, away]` for the shoot-out. Example:
 *
 *   R1: { score: [2, 1] },
 *   R2: { score: [1, 1], pens: [4, 3] },
 *
 * Entries are checked automatically; any problem is reported in the Knockout tab.
 */
export interface KoResult {
  score: [number, number]
  pens?: [number, number]
}

export const KO_RESULTS: Record<string, KoResult> = {}
