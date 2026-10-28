// ©AngelaMos | 2026
// issHistory.ts

import { create } from 'zustand'

export interface IssHistoryPoint {
  lat: number
  lng: number
  altitude: number
  ts: number
}

interface IssHistoryStore {
  history: IssHistoryPoint[]
  pushPosition: (lat: number, lng: number, altitude: number) => void
}

const MAX_HISTORY_POINTS = 200

export const useIssHistoryStore = create<IssHistoryStore>((set) => ({
  history: [],
  pushPosition: (lat, lng, altitude) =>
    set((state) => {
      // Don't add a duplicate point if it hasn't moved
      const last = state.history[state.history.length - 1]
      if (last && last.lat === lat && last.lng === lng) {
        return state
      }

      const newPoint: IssHistoryPoint = { lat, lng, altitude, ts: Date.now() }

      // Append new point, and slice to keep only the last MAX_HISTORY_POINTS
      return {
        history: [...state.history, newPoint].slice(-MAX_HISTORY_POINTS),
      }
    }),
}))
