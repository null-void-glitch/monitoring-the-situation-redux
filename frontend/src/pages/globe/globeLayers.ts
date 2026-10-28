// ©AngelaMos | 2026
// globeLayers.ts

import { useMemo } from 'react'
import { useGlobeColorsStore } from '@/stores/globeColors'
import { type GlobePointType, useGlobeEvents } from '@/stores/globeEvents'

const ALTITUDE_BY_TYPE: Record<GlobePointType, number> = {
  iss: 0.005,
  earthquake: 0.005,
  hijack: 0.005,
  ransomware: 0.005,
  outage: 0.005,
  scan: 0.005,
  urlhaus: 0.005,
  malwarebazaar: 0.005,
}

const RADIUS_BY_TYPE: Record<GlobePointType, number> = {
  iss: 0.6,
  earthquake: 0.55,
  hijack: 0.55,
  ransomware: 0.5,
  outage: 1.5,
  scan: 0.5,
  urlhaus: 0.3,
  malwarebazaar: 0.3,
}

export interface GlobePointDatum {
  id: string
  type: GlobePointType
  lat: number
  lng: number
  color: string
  altitude: number
  radius: number
}

export interface GlobeRingDatum {
  id: string
  lat: number
  lng: number
}

export function useGlobePoints(): GlobePointDatum[] {
  const points = useGlobeEvents((s) => s.points)
  const blipColors = useGlobeColorsStore((s) => s.blipColors)
  return useMemo(
    () =>
      points
        .filter((p) => p.type !== 'outage')
        .map((p) => ({
          id: p.id,
          type: p.type,
          lat: p.lat,
          lng: p.lng,
          color: blipColors[p.type],
          altitude: ALTITUDE_BY_TYPE[p.type],
          radius: RADIUS_BY_TYPE[p.type],
        })),
    [points, blipColors]
  )
}

export function useGlobeRings(): GlobeRingDatum[] {
  const rings = useGlobeEvents((s) => s.rings)
  return useMemo(
    () =>
      rings.map((r) => ({
        id: r.id,
        lat: r.lat,
        lng: r.lng,
      })),
    [rings]
  )
}
