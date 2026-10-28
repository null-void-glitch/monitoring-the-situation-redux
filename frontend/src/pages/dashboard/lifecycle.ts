// ©AngelaMos | 2026
// lifecycle.ts

import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { SNAPSHOT_KEY, type Snapshot, useSnapshot } from '@/api/snapshot'
import {
  type BgpHijack,
  type CveEvent,
  type DShieldData,
  type EarthquakePayload,
  type GdeltSpike,
  type InternetOutage,
  type IssPosition,
  isValidBgpHijack,
  isValidCoinbaseTick,
  isValidCveEvent,
  isValidDShieldData,
  isValidEarthquakePayload,
  isValidGdeltSpike,
  isValidInternetOutage,
  isValidIssPosition,
  isValidKevEntry,
  isValidMBSample,
  isValidMBSampleList,
  isValidRansomwareVictim,
  isValidRssFeed,
  isValidRssFeedList,
  isValidURLhausEntry,
  isValidURLhausEntryList,
  isValidWikiItn,
  isValidWikiItnList,
  type KevEntry,
  type MBSample,
  type RansomwareVictim,
  type RssFeed,
  type URLhausEntry,
  type WikiItn,
} from '@/api/types'
import { browserDriver, createDashboardWS, type WSEvent } from '@/api/ws'
import { unlockOnFirstGesture } from '@/lib/audio'
import { COUNTRY_CENTROIDS, getCentroid } from '@/lib/countryCentroids'
import { useIssHistoryStore } from '@/stores/issHistory'

const COUNTRY_KEYS = Object.keys(COUNTRY_CENTROIDS)

function getRandomLandCoordinates() {
  const randomCountry =
    COUNTRY_KEYS[Math.floor(Math.random() * COUNTRY_KEYS.length)]
  const c = getCentroid(randomCountry)!
  return {
    lat: c.lat + (Math.random() - 0.5) * 5,
    lng: c.lng + (Math.random() - 0.5) * 5,
  }
}

function getUrlhausCoordinates(url: string) {
  try {
    const hostname = new URL(url).hostname
    const parts = hostname.split('.')
    if (parts.length > 1) {
      const tld = parts.pop()?.toUpperCase()
      if (tld) {
        const c = getCentroid(tld)
        if (c) {
          return {
            lat: c.lat + (Math.random() - 0.5) * 2,
            lng: c.lng + (Math.random() - 0.5) * 2,
          }
        }
      }
    }
  } catch (e) {
    // Ignore invalid urls
  }
  return getRandomLandCoordinates()
}

import { useBgpHijackStore } from '@/stores/bgpHijack'
import { useCveStore } from '@/stores/cve'
import { useEarthquakeStore } from '@/stores/earthquake'
import { type SourceKey, useFreshness } from '@/stores/freshness'
import { useGlobeEvents } from '@/stores/globeEvents'
import { useHeartbeat } from '@/stores/heartbeat'
import { useKevStore } from '@/stores/kev'
import { useMalwareBazaarStore } from '@/stores/malwarebazaar'
import { useOutageStore } from '@/stores/outage'
import { usePrices } from '@/stores/prices'
import { useRansomwareStore, victimKey } from '@/stores/ransomware'
import { useTicker } from '@/stores/ticker'
import { useURLhausStore } from '@/stores/urlhaus'

const ALL_TOPICS: readonly string[] = [
  'heartbeat',
  'scan_firehose',
  'internet_outage',
  'bgp_hijack',
  'cve_new',
  'kev_added',
  'ransomware_victim',
  'coinbase_price',
  'earthquake',
  'space_weather',
  'wiki_itn',
  'gdelt_spike',
  'iss_position',
  'rss_feed',
  'urlhaus_url',
  'malwarebazaar_sample',
]

const WS_URL = '/api/v1/ws'
const GLOBE_RING_TTL_MS = 4_000
const GLOBE_EVICT_INTERVAL_MS = 5 * 60_000

export function useDashboardLifecycle(): void {
  const { data: snapshot, isSuccess } = useSnapshot()
  const queryClient = useQueryClient()
  const wsRef = useRef<ReturnType<typeof createDashboardWS> | null>(null)
  const globeSeededRef = useRef(false)

  useEffect(() => {
    unlockOnFirstGesture()
  }, [])

  useEffect(() => {
    if (!snapshot || globeSeededRef.current) return
    globeSeededRef.current = true
    seedGlobeFromSnapshot(snapshot)
  }, [snapshot])

  useEffect(() => {
    if (!isSuccess) return

    const ws = createDashboardWS({
      driver: () => browserDriver(WS_URL, [...ALL_TOPICS]),
      topics: [...ALL_TOPICS],
      onEvent: (ev) => routeEvent(ev, queryClient),
    })
    wsRef.current = ws
    ws.connect()
    ws.setReady()

    return () => {
      ws.disconnect()
      wsRef.current = null
    }
  }, [isSuccess, queryClient])

  useEffect(() => {
    const id = setInterval(() => {
      useGlobeEvents.getState().evict(Date.now())
    }, GLOBE_EVICT_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  void snapshot
}

function routeEvent(ev: WSEvent, queryClient: QueryClient): void {
  if (ev.ch === 'heartbeat') {
    useHeartbeat.getState().beat()
    useFreshness.getState().ping('ws')
    return
  }
  const data = ev.data
  if (data === undefined || data === null) return
  dispatchEvent(ev.ch, data, queryClient)
}

function dispatchEvent(
  ch: string,
  data: unknown,
  queryClient: QueryClient
): void {
  const ping = useFreshness.getState().ping
  switch (ch) {
    case 'cve_new':
      if (isValidCveEvent(data)) {
        handleCve(data)
        ping('cve')
      }
      break
    case 'kev_added':
      if (isValidKevEntry(data)) {
        handleKev(data)
        ping('kev')
      }
      break
    case 'ransomware_victim':
      if (isValidRansomwareVictim(data)) {
        handleRansomware(data)
        ping('ransomware')
      }
      break
    case 'coinbase_price':
      if (isValidCoinbaseTick(data)) {
        handleCoinbase(data)
        pingCoinbaseChannel(data.symbol, ping)
      }
      break
    case 'urlhaus_url':
      if (isValidURLhausEntry(data)) {
        handleUrlhaus(data)
        ping('urlhaus')
      }
      break
    case 'malwarebazaar_sample':
      if (isValidMBSample(data)) {
        handleMalwareBazaar(data)
        ping('malwarebazaar')
      }
      break
    case 'earthquake':
      if (isValidEarthquakePayload(data)) {
        handleEarthquake(data)
        ping('quake')
      }
      break
    case 'iss_position':
      if (isValidIssPosition(data)) {
        handleIss(data, queryClient)
        ping('iss')
      }
      break
    case 'wiki_itn':
      if (isValidWikiItn(data)) {
        handleWiki(data)
        ping('wiki')
      } else if (isValidWikiItnList(data)) {
        data.forEach(handleWiki)
        ping('wiki')
      }
      break
    case 'rss_feed':
      if (isValidRssFeed(data)) {
        handleRss(data)
        ping('rss')
      } else if (isValidRssFeedList(data)) {
        data.forEach(handleRss)
        ping('rss')
      }
      break
    case 'gdelt_spike':
      if (isValidGdeltSpike(data)) handleGdelt(data)
      break
    case 'internet_outage':
      if (isValidInternetOutage(data)) {
        handleOutage(data, queryClient)
        ping('outage')
      }
      break
    case 'bgp_hijack':
      if (isValidBgpHijack(data)) {
        handleHijack(data, queryClient)
        ping('bgp')
      }
      break
    case 'scan_firehose':
      if (isValidDShieldData(data)) {
        handleScanFirehose(data, queryClient)
        ping('dshield')
      }
      break
    case 'space_weather':
      mergeIntoSnapshot(queryClient, ch, data)
      ping('spacewx')
      break
    default:
      break
  }
}

function pingCoinbaseChannel(symbol: string, ping: (k: SourceKey) => void): void {
  if (symbol === 'BTC-USD') ping('btc')
  else if (symbol === 'ETH-USD') ping('eth')
}

function handleCve(p: CveEvent): void {
  useCveStore.getState().push(p)
  useTicker.getState().push({
    id: `cve-tick-${p.CveID}`,
    source: 'CVE',
    headline: `${p.CveID} · ${p.Severity}`,
    ts: Date.now(),
  })
}

function handleKev(p: KevEntry): void {
  useKevStore.getState().push(p)
}

function handleRansomware(p: RansomwareVictim): void {
  useRansomwareStore.getState().push(p)
  pushRansomwarePoint(p)
  useTicker.getState().push({
    id: `rw-tick-${victimKey(p)}`,
    source: 'RANSOM',
    headline: `${p.group_name} · ${p.post_title}`,
    ts: Date.now(),
  })
}

export async function pushUrlhausPoint(
  p: URLhausEntry & { ipLat?: number; ipLng?: number; ipCountry?: string }
): Promise<void> {
  let coords =
    typeof p.ipLat === 'number' && typeof p.ipLng === 'number'
      ? { lat: p.ipLat, lng: p.ipLng }
      : null

  if (!coords) {
    try {
      const hostname = new URL(p.url).hostname
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        const res = await fetch(
          `http://ip-api.com/json/${hostname}?fields=lat,lon,countryCode`
        )
        if (res.ok) {
          const data = await res.json()
          if (typeof data.lat === 'number' && typeof data.lon === 'number') {
            coords = { lat: data.lat, lng: data.lon }
            p.ipLat = data.lat
            p.ipLng = data.lon
            p.ipCountry = data.countryCode
          }
        }
      }
    } catch (e) {}
  }

  if (!coords) {
    coords = getUrlhausCoordinates(p.url)
  }

  useGlobeEvents.getState().pushPoint({
    id: `uh-point-${p.id}`,
    type: 'urlhaus',
    lat: coords.lat,
    lng: coords.lng,
    emittedAt: Date.now(),
    meta: { url: p.url },
  })
}

export function handleUrlhaus(p: URLhausEntry): void {
  useURLhausStore.getState().push(p)
  useTicker.getState().push({
    id: `uh-tick-${p.id}`,
    source: 'URLHAUS',
    headline: `Threat URL: ${p.url}`,
    ts: Date.now(),
  })
  pushUrlhausPoint(p)
}

export function handleMalwareBazaar(p: MBSample): void {
  useMalwareBazaarStore.getState().push(p)
  useTicker.getState().push({
    id: `mb-tick-${p.sha256_hash}`,
    source: 'BAZAAR',
    headline: `Sample: ${p.file_name || p.sha256_hash.substring(0, 12)}`,
    ts: Date.now(),
  })
}

export function pushRansomwarePoint(p: RansomwareVictim): void {
  if (!p.country) return
  const c = getCentroid(p.country)
  if (!c) return
  useGlobeEvents.getState().pushPoint({
    id: `rw-${victimKey(p)}`,
    type: 'ransomware',
    lat: c.lat + (Math.random() - 0.5) * 5,
    lng: c.lng + (Math.random() - 0.5) * 5,
    emittedAt: Date.now(),
    meta: {
      group_name: p.group_name,
      post_title: p.post_title,
      country: p.country,
    },
  })
}

function handleOutage(p: InternetOutage, queryClient: QueryClient): void {
  useOutageStore.getState().push(p)
  pushOutagePoints(p)
  mergeIntoSnapshot(queryClient, 'internet_outage', p)
}

function pushOutagePoints(p: InternetOutage): void {
  if (!Array.isArray(p.locations)) return
  const now = Date.now()
  for (const loc of p.locations) {
    const c = getCentroid(loc)
    if (!c) continue
    useGlobeEvents.getState().pushPoint({
      id: `outage-${p.id}-${loc}`,
      type: 'outage',
      lat: c.lat + (Math.random() - 0.5) * 5,
      lng: c.lng + (Math.random() - 0.5) * 5,
      emittedAt: now,
      meta: {
        reason: p.reason,
        type: p.outageType,
        country: loc,
        asnsCount: p.asns?.length ?? 0,
      },
    })
  }
}

function handleHijack(p: BgpHijack, queryClient: QueryClient): void {
  useBgpHijackStore.getState().push(p)
  pushHijackPoint(p)
  mergeIntoSnapshot(queryClient, 'bgp_hijack', p)
  if (!p.duration || p.duration === 0) {
    const n = p.prefixes?.length ?? 0
    useTicker.getState().push({
      id: `bgp-tick-${p.id}`,
      source: 'BGP',
      headline: `ASN ${p.hijacker_asn || '?'} · ${n} prefix${n !== 1 ? 'es' : ''} hijacked`,
      ts: Date.now(),
    })
  }
}

export function pushHijackPoint(p: BgpHijack): void {
  const country = p.enrichment?.country
  if (!country && (!p.enrichment?.lat || !p.enrichment?.lng)) return
  if ((p.confidence_score ?? 0) < 8) return
  if (p.duration && p.duration > 0) return

  let lat: number | undefined
  let lng: number | undefined

  if (p.enrichment?.lat !== undefined && p.enrichment?.lng !== undefined) {
    lat = p.enrichment.lat + (Math.random() - 0.5) * 0.5
    lng = p.enrichment.lng + (Math.random() - 0.5) * 0.5
  } else if (country) {
    const c = getCentroid(country)
    if (c) {
      lat = c.lat + (Math.random() - 0.5) * 5
      lng = c.lng + (Math.random() - 0.5) * 5
    }
  }

  if (lat === undefined || lng === undefined) return

  useGlobeEvents.getState().pushPoint({
    id: `hijack-${p.id}`,
    type: 'hijack',
    lat,
    lng,
    emittedAt: Date.now(),
    meta: {
      asn: p.hijacker_asn,
      isp: p.enrichment?.isp,
      prefixes: p.prefixes?.length,
      country: country,
      confidenceScore: p.confidence_score,
    },
  })
}

function handleScanFirehose(p: DShieldData, queryClient: QueryClient): void {
  pushScanPoints(p)
  mergeIntoSnapshot(queryClient, 'scan_firehose', p)
}

function pushScanPoints(p: DShieldData): void {
  const now = Date.now()
  for (const src of p.topips ?? []) {
    let lat: number | undefined
    let lng: number | undefined

    if (src.lat !== undefined && src.lng !== undefined) {
      lat = src.lat + (Math.random() - 0.5) * 0.5
      lng = src.lng + (Math.random() - 0.5) * 0.5
    } else if (src.country) {
      const c = getCentroid(src.country)
      if (c) {
        lat = c.lat + (Math.random() - 0.5) * 5
        lng = c.lng + (Math.random() - 0.5) * 5
      }
    }

    if (lat === undefined || lng === undefined) continue

    useGlobeEvents.getState().pushPoint({
      id: `scan-${src.source}`,
      type: 'scan',
      lat,
      lng,
      emittedAt: now,
      meta: {
        source: src.source,
        reports: src.reports,
        targets: src.targets,
        country: src.country,
      },
    })
  }
}

function handleCoinbase(p: {
  symbol: string
  ts: string
  price: string
  volume_24h?: string
}): void {
  const tsMs = new Date(p.ts).getTime()
  const minute = Math.floor(tsMs / 60_000) * 60_000
  const prices = usePrices.getState()

  prices.pushTick({
    symbol: p.symbol,
    ts: tsMs,
    price: p.price,
    volume24h: p.volume_24h,
  })

  const bars = prices.history[p.symbol] ?? []
  const existing = bars.find((b) => b.minute === minute)
  const num = Number(p.price)

  prices.pushMinute({
    symbol: p.symbol,
    minute,
    open: existing?.open ?? p.price,
    high: existing ? String(Math.max(Number(existing.high), num)) : p.price,
    low: existing ? String(Math.min(Number(existing.low), num)) : p.price,
    close: p.price,
    volume: p.volume_24h,
  })
}

function handleEarthquake(p: EarthquakePayload): void {
  useEarthquakeStore.getState().push(p)
  const coords = p.geometry?.coordinates
  if (!Array.isArray(coords)) return
  const lng = coords[0]
  const lat = coords[1]
  const mag = p.properties?.mag ?? 0
  if (typeof lat !== 'number' || typeof lng !== 'number' || mag <= 4.5) return
  const now = Date.now()
  useGlobeEvents.getState().pushPoint({
    id: `eq-${p.id}`,
    type: 'earthquake',
    lat,
    lng,
    emittedAt: now,
    meta: p.properties,
  })
  useGlobeEvents.getState().pushRing({
    id: `eq-ring-${p.id}-${now}`,
    lat,
    lng,
    emittedAt: now,
    ttlMs: GLOBE_RING_TTL_MS,
  })
}

function handleIss(p: IssPosition, queryClient: QueryClient): void {
  useIssHistoryStore.getState().pushPosition(p.latitude, p.longitude, 0.08)
  mergeIntoSnapshot(queryClient, 'iss_position', p)
}

function handleWiki(p: WikiItn): void {
  if (!p.text) return
  const id = `wiki-${p.slug || p.text}`
  useTicker.getState().push({
    id,
    source: 'Wikipedia',
    headline: p.text,
    ts: Date.now(),
    href: p.slug ? `https://en.wikipedia.org/wiki/${p.slug}` : undefined,
  })
}

function handleRss(p: RssFeed): void {
  useTicker.getState().push({
    id: `rss-${p.link}`,
    source: p.source,
    headline: p.title,
    ts: p.published ? new Date(p.published).getTime() : Date.now(),
    href: p.link,
  })
}

function handleGdelt(p: GdeltSpike): void {
  useTicker.getState().push({
    id: `gdelt-${p.theme}-${p.time}`,
    source: 'GDELT',
    headline: `${p.theme} spike (z=${p.zscore.toFixed(2)}, n=${p.count})`,
    ts: Date.now(),
  })
}

function mergeIntoSnapshot(
  queryClient: QueryClient,
  topic: string,
  data: unknown
): void {
  queryClient.setQueryData<Record<string, unknown>>(SNAPSHOT_KEY, (prev) => ({
    ...(prev ?? {}),
    [topic]: data,
  }))
}

function seedGlobeFromSnapshot(snap: Snapshot): void {
  const eq = snap.earthquake
  if (isValidEarthquakePayload(eq)) {
    useEarthquakeStore.getState().push(eq)
    const coords = eq.geometry?.coordinates
    if (Array.isArray(coords)) {
      const lng = coords[0]
      const lat = coords[1]
      const mag = eq.properties?.mag ?? 0
      if (typeof lat === 'number' && typeof lng === 'number' && mag > 5) {
        useGlobeEvents.getState().pushPoint({
          id: `eq-${eq.id}`,
          type: 'earthquake',
          lat,
          lng,
          emittedAt: Date.now(),
          meta: eq.properties,
        })
      }
    }
  }

  const iss = snap.iss_position
  if (isValidIssPosition(iss)) {
    useIssHistoryStore.getState().pushPosition(iss.latitude, iss.longitude, 0.08)
  }

  const rw = snap.ransomware_victim
  if (isValidRansomwareVictim(rw)) {
    pushRansomwarePoint(rw)
    useTicker.getState().push({
      id: `rw-tick-${victimKey(rw)}`,
      source: 'RANSOM',
      headline: `${rw.group_name} · ${rw.post_title}`,
      ts: Date.now(),
    })
  }

  const uh = snap.urlhaus_url
  if (isValidURLhausEntry(uh)) {
    handleUrlhaus(uh)
  } else if (isValidURLhausEntryList(uh)) {
    uh.forEach(handleUrlhaus)
  }

  const mb = snap.malwarebazaar_sample
  if (isValidMBSample(mb)) {
    handleMalwareBazaar(mb)
  } else if (isValidMBSampleList(mb)) {
    mb.forEach(handleMalwareBazaar)
  }

  const outage = snap.internet_outage
  if (isValidInternetOutage(outage)) {
    useOutageStore.getState().push(outage)
    pushOutagePoints(outage)
  }

  const hijack = snap.bgp_hijack
  if (isValidBgpHijack(hijack)) {
    useBgpHijackStore.getState().push(hijack)
    pushHijackPoint(hijack)
    if (!hijack.duration || hijack.duration === 0) {
      const n = hijack.prefixes?.length ?? 0
      useTicker.getState().push({
        id: `bgp-tick-${hijack.id}`,
        source: 'BGP',
        headline: `ASN ${hijack.hijacker_asn || '?'} · ${n} prefix${n !== 1 ? 'es' : ''} hijacked`,
        ts: Date.now(),
      })
    }
  }

  const scan = snap.scan_firehose
  if (isValidDShieldData(scan)) pushScanPoints(scan)

  const wiki = snap.wiki_itn
  if (isValidWikiItn(wiki) && wiki.text) {
    handleWiki(wiki)
  } else if (isValidWikiItnList(wiki)) {
    wiki.forEach(handleWiki)
  }

  const rss = snap.rss_feed
  if (isValidRssFeed(rss)) {
    handleRss(rss)
  } else if (isValidRssFeedList(rss)) {
    rss.forEach(handleRss)
  }
}
