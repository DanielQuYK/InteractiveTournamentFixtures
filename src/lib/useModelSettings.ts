import { useMemo } from 'react'
import { usePersistentState } from './hooks'
import {
  isDefaultParams,
  sanitizeOverrides,
  sanitizeParams,
  type ModelParams,
  type RatingOverrides,
} from './modelParams'

/**
 * The user's edits to the simulation model, kept for the browser session. Only the changed
 * values are stored, and everything read from here has been forced into its allowed range.
 */
export function useModelSettings() {
  const [editedParams, setEditedParams] = usePersistentState<Partial<ModelParams>>('model-params', {})
  const [editedRatings, setEditedRatings] = usePersistentState<RatingOverrides>('model-overrides', {})
  const params = useMemo(() => sanitizeParams(editedParams), [editedParams])
  const overrides = useMemo(() => sanitizeOverrides(editedRatings), [editedRatings])

  return {
    params,
    overrides,
    editedKeys: Object.keys(editedParams) as (keyof ModelParams)[],
    customised: !isDefaultParams(params) || Object.keys(overrides).length > 0,
    setParam<K extends keyof ModelParams>(key: K, value: ModelParams[K]) {
      setEditedParams((current) => ({ ...current, [key]: value }))
    },
    resetParam(key: keyof ModelParams) {
      setEditedParams((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
    },
    setRating(team: string, field: 'attack' | 'weakness', value: number) {
      setEditedRatings((current) => ({ ...current, [team]: { ...current[team], [field]: value } }))
    },
    resetRating(team: string, field?: 'attack' | 'weakness') {
      setEditedRatings((current) => {
        const next = { ...current }
        if (!field) delete next[team]
        else {
          const entry = { ...next[team] }
          delete entry[field]
          if (entry.attack === undefined && entry.weakness === undefined) delete next[team]
          else next[team] = entry
        }
        return next
      })
    },
    resetAll() {
      setEditedParams({})
      setEditedRatings({})
    },
  }
}

export type ModelSettings = ReturnType<typeof useModelSettings>
