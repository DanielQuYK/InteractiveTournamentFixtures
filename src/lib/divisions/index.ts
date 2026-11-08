import { D1 } from './d1'
import { D2 } from './d2'
import { D3H } from './d3h'
import { K1 } from './k1'
import { K2 } from './k2'
import { K3 } from './k3'
import type { DivisionConfig } from './types'

export type { DivisionConfig, KoMatchSpec, KoRound, KoSlotSpec } from './types'

/** Every division available, in the order shown on the home page. */
export const DIVISIONS: DivisionConfig[] = [D1, D2, D3H, K1, K2, K3]

export const divisionById = (id: string) => DIVISIONS.find((d) => d.id === id)
