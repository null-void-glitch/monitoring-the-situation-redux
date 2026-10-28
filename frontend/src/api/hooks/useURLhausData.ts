// ©AngelaMos | 2026
// useURLhausData.ts

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { isValidURLhausEntry, type URLhausEntry } from '@/api/types'
import { API_ENDPOINTS, QUERY_KEYS } from '@/config'
import { apiClient } from '@/core/api'
import { pushUrlhausPoint } from '@/pages/dashboard/lifecycle'
import { useURLhausStore } from '@/stores/urlhaus'

const INTEL_LIMIT = 100
const STALE_MS = 60_000

const fetchURLhaus = async (): Promise<URLhausEntry[]> => {
  const res = await apiClient.get<unknown>(API_ENDPOINTS.INTEL.URLHAUS, {
    params: { limit: INTEL_LIMIT },
  })
  const valid = Array.isArray(res.data)
    ? res.data.filter(isValidURLhausEntry)
    : []

  // Batch lookup IPs
  const ipsToLookup = Array.from(
    new Set(
      valid
        .map((v) => {
          try {
            return new URL(v.url).hostname
          } catch {
            return ''
          }
        })
        .filter((host) => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host))
    )
  )

  if (ipsToLookup.length > 0) {
    try {
      const geoRes = await fetch('http://ip-api.com/batch', {
        method: 'POST',
        body: JSON.stringify(
          ipsToLookup.map((query) => ({
            query,
            fields: 'lat,lon,query,countryCode',
          }))
        ),
      })
      if (geoRes.ok) {
        const geoData = await geoRes.json()
        const geoMap = new Map<string, any>(geoData.map((d: any) => [d.query, d]))
        valid.forEach((v) => {
          try {
            const host = new URL(v.url).hostname
            const geo = geoMap.get(host)
            if (
              geo &&
              typeof geo.lat === 'number' &&
              typeof geo.lon === 'number'
            ) {
              ;(v as any).ipLat = geo.lat
              ;(v as any).ipLng = geo.lon
              ;(v as any).ipCountry = geo.countryCode
            }
          } catch {}
        })
      }
    } catch (e) {
      console.error('IP batch lookup failed', e)
    }
  }

  return valid
}

export function useURLhausData() {
  const items = useURLhausStore((s) => s.items)
  const push = useURLhausStore((s) => s.push)

  const { data } = useQuery({
    queryKey: QUERY_KEYS.INTEL.URLHAUS(),
    queryFn: fetchURLhaus,
    staleTime: STALE_MS,
  })

  useEffect(() => {
    if (!data) return
    for (const ev of data) {
      push(ev)
      pushUrlhausPoint(ev)
    }
  }, [data, push])

  return { items }
}
