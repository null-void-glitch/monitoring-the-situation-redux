// ©AngelaMos | 2026
// globeColors.ts
//
// User-editable colors for globe blips and their associated particle-flow
// clouds. Kept separate from theme.ts because these colors aren't part of
// any preset theme block — they persist and apply the same regardless of
// which color theme is active.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GlobePointType } from './globeEvents'

export const DEFAULT_BLIP_COLORS: Record<GlobePointType, string> = {
  iss: '#4ade80',
  ransomware: '#c7fba5',
  outage: '#f59e0b',
  hijack: '#916cad',
  scan: '#466b5a',
  earthquake: '#ffffff',
  urlhaus: '#dc7d68',
  malwarebazaar: '#dc7d68',
}

export interface GlobeColorRow {
  label: string
  types: GlobePointType[]
}

/** One editor row per visual legend entry; a row can cover >1 underlying
 *  type (URLhaus + MalwareBazaar share a single "Malicious IPs" swatch). */
export const GLOBE_COLOR_ROWS: GlobeColorRow[] = [
  { label: 'ISS', types: ['iss'] },
  { label: 'Ransomware', types: ['ransomware'] },
  { label: 'Hijack', types: ['hijack'] },
  { label: 'Scan', types: ['scan'] },
  { label: 'Earthquake', types: ['earthquake'] },
  { label: 'Malicious IPs', types: ['urlhaus', 'malwarebazaar'] },
]

interface GlobeColorsStore {
  blipColors: Record<GlobePointType, string>
  setBlipColor: (types: GlobePointType[], color: string) => void
  resetBlipColors: () => void
}

export const useGlobeColorsStore = create<GlobeColorsStore>()(
  persist(
    (set) => ({
      blipColors: { ...DEFAULT_BLIP_COLORS },
      setBlipColor: (types, color) =>
        set((s) => {
          const next = { ...s.blipColors }
          for (const t of types) next[t] = color
          return { blipColors: next }
        }),
      resetBlipColors: () => set({ blipColors: { ...DEFAULT_BLIP_COLORS } }),
    }),
    { name: 'monitor:globe-colors' }
  )
)
