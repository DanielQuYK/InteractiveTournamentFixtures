/**
 * Knockout results — the single place to record scores as each division's final round is played.
 * Add entries to the division's object below (D3H_RESULTS for Division Three, HK Island).
 *
 * Keys are match ids:
 *   R1–R6  Round of 14      Q1–Q4  Quarter-finals
 *   S1–S2  Semi-finals      TP     Third-place play-off     F  Final
 *
 * `score` is [home, away] at full time (35 minutes each half; there is no extra time). If the score is level,
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

/** Results for each division, keyed by division id. Division Three (HK Island) is the only one with knockout results so far. */
export const NO_RESULTS: Record<string, KoResult> = {}

export const D3H_RESULTS: Record<string, KoResult> = {
  R1: { score: [4, 1] }, // IKTMC 4–1 QC
  R2: { score: [3, 0] }, // KCC 3–0 LHYMSS
  R3: { score: [0, 2] }, // SJA 0–2 ISS
  R4: { score: [2, 3] }, // KWSC 2–3 CFSS
  R5: { score: [1, 1], pens: [4, 5] }, // HW 1–1 SKHTSK; SKHTSK won 5–4 on penalties
  R6: { score: [4, 1] }, // HKUGA 4–1 SPCC
  // Confirmed in the HKSSF final-round bracket amended 5.11.26 (issued 9 November 2026).
  Q1: { score: [0, 2] }, // SKHLMC 0–2 IKTMC
  Q2: { score: [2, 1] }, // KCC 2–1 ISS
  Q3: { score: [2, 2], pens: [4, 2] }, // CFSS 2–2 SKHTSK; CFSS won 4–2 on penalties
}
