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
  score?: [number, number]
  pens?: [number, number]
  /**
   * Use when only the winner is known: `{ winner: 'SKHTSK', scoreTbc: true }`.
   */
  winner?: string
  /** Score entered but not yet double-checked: shows an asterisk and a remark. Remove once confirmed. */
  scoreTbc?: boolean
}

export const KO_RESULTS: Record<string, KoResult> = {
  R1: { score: [4, 1] }, // IKTMC 4–1 QC
  R2: { score: [3, 0] }, // KCC 3–0 LHYMSS
  R3: { score: [0, 2] }, // SJA 0–2 ISS
  R4: { score: [2, 3] }, // KWSC 2–3 CFSS
  // HW v SKHTSK: 1–1, SKHTSK won 5–4 on penalties. scoreTbc shows an asterisk and a remark
  // everywhere this score appears; delete `scoreTbc` once the score is double-checked.
  R5: { score: [1, 1], pens: [4, 5], scoreTbc: true },
  R6: { score: [4, 1] }, // HKUGA 4–1 SPCC
}
