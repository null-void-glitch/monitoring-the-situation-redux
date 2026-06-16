// ©AngelaMos | 2026
// Globe.tsx

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import GlobeGL, { type GlobeMethods } from 'react-globe.gl'
import { useGlobeEvents } from '@/stores/globeEvents'
import { useHeartbeat } from '@/stores/heartbeat'
import { useThemeStore } from '@/stores/theme'
import styles from './Globe.module.scss'
import { panTo } from './globeCamera'
import { useGlobePoints, useGlobeRings } from './globeLayers'
import { CountryPanel } from './CountryPanel'
import { ThreatParticleSystem } from './threatParticles'

const GLOBE_AUTO_ROTATE_SPEED = 1.0
const GLOBE_RESUME_DELAY_MS = 3_000
const ATMOSPHERE_COLOR = '#1f2937'
const ATMOSPHERE_ALTITUDE = 0.12
const RING_COLOR = '#e5e5e5'
const RING_MAX_RADIUS = 4
const RING_PROPAGATION_SPEED = 4
const RING_REPEAT_PERIOD = 0
const COUNTRIES_URL = '/world-countries-110m.geo.json'
const COUNTRY_OUTLINE_COLOR = '#404040'
const COUNTRY_FILL_TRANSPARENT = 'rgba(0,0,0,0)'
const COUNTRY_ALTITUDE = 0.005

// Read a CSS custom property off <html> (set by the active theme).
function readCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return v || fallback
}

const LEGEND_ITEMS = [
  { color: '#4ade80', label: 'ISS' },
  { color: '#facc15', label: 'Ransomware' },
  { color: '#f59e0b', label: 'Outage' },
  { color: '#ef4444', label: 'Hijack' },
  { color: '#60a5fa', label: 'Scan' },
  { color: '#a855f7', label: 'Earthquake' },
] as const

export interface CountryFeature {
  type: 'Feature'
  properties: Record<string, unknown>
  geometry: {
    type: string
    coordinates: unknown
  }
}

interface CountriesData {
  type: 'FeatureCollection'
  features: CountryFeature[]
}

const GLOBE_DEFAULT_LAT = 15
const GLOBE_DEFAULT_LNG = 10
const GLOBE_DEFAULT_ALTITUDE = 2.5

export const Globe = memo(function Globe(): React.ReactElement {
  const wrapRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const viewInitRef = useRef(false)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [countries, setCountries] = useState<CountryFeature[]>([])
  const [selectedCountry, setSelectedCountry] = useState<CountryFeature | null>(null)

  const points = useGlobePoints()
  const rings = useGlobeRings()
  const rawPoints = useGlobeEvents((s) => s.points)
  const focusEvent = useGlobeEvents((s) => s.focusEvent)

  // Stable reference for custom layer data to prevent react-globe.gl from destroying our WebGL buffers on re-render
  const customLayerData = useMemo(() => [{}], [])

  // 1. Particle System
  const particleSys = useMemo(() => new ThreatParticleSystem(), [])
  
  useEffect(() => {
    const hijacks = rawPoints.filter(p => p.type === 'hijack')
    const scans = rawPoints.filter(p => p.type === 'scan')
    particleSys.syncEvents(hijacks, scans)
  }, [rawPoints, particleSys])

  // 2. Outages
  const outageMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of rawPoints) {
      if (p.type === 'outage' && p.meta?.country) {
        const count = (p.meta.asnsCount as number) || 1
        const cname = p.meta.country as string
        m.set(cname, Math.max(m.get(cname) || 0, count))
      }
    }
    return m
  }, [rawPoints])

  const [pulseTime, setPulseTime] = useState(0)

  // Run global animation loop for particles (60fps) and pulsing (10fps)
  useEffect(() => {
    let handle: number
    let lastTick = 0
    const loop = (time: number) => {
      handle = requestAnimationFrame(loop)
      
      // 60fps WebGL uniform update for smooth particle flow
      particleSys.update()

      // 10fps pulse time update to avoid thrashing React state
      if (outageMap.size > 0 && time - lastTick > 100) {
        lastTick = time
        setPulseTime(Date.now() / 1000.0)
      }
    }
    handle = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(handle)
  }, [outageMap, particleSys])

  // Country outline color follows the active theme (e.g. red for glow-red).
  const theme = useThemeStore((s) => s.theme)
  const outlineColor = useMemo(() => {
    void theme // re-read the CSS var whenever the active theme changes
    return readCssVar('--globe-outline', COUNTRY_OUTLINE_COLOR)
  }, [theme])
  // react-globe.gl re-runs polygon accessors when the data ref changes, so
  // hand it a fresh array whenever the theme (and thus outline color) changes.
  const polygonData = useMemo(() => {
    void theme
    return countries.slice()
  }, [countries, theme])

  useEffect(() => {
    let cancelled = false
    fetch(COUNTRIES_URL)
      .then((res) => res.json() as Promise<CountriesData>)
      .then((fc) => {
        if (cancelled) return
        setCountries(fc.features)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setSize({
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      })
    })
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (size.w === 0) return
    const globe = globeRef.current
    if (!globe) return

    if (!viewInitRef.current) {
      viewInitRef.current = true
      globe.pointOfView(
        {
          lat: GLOBE_DEFAULT_LAT,
          lng: GLOBE_DEFAULT_LNG,
          altitude: GLOBE_DEFAULT_ALTITUDE,
        },
        0
      )
    }

    const controls = globe.controls()
    if (!controls) return

    controls.autoRotate = true
    controls.autoRotateSpeed = GLOBE_AUTO_ROTATE_SPEED

    const onStart = () => {
      if (resumeTimerRef.current !== null) clearTimeout(resumeTimerRef.current)
      controls.autoRotate = false
    }
    const onEnd = () => {
      resumeTimerRef.current = setTimeout(() => {
        controls.autoRotate = true
      }, GLOBE_RESUME_DELAY_MS)
    }

    controls.addEventListener('start', onStart)
    controls.addEventListener('end', onEnd)

    return () => {
      controls.removeEventListener('start', onStart)
      controls.removeEventListener('end', onEnd)
      if (resumeTimerRef.current !== null) clearTimeout(resumeTimerRef.current)
    }
  }, [size.w])

  useEffect(() => {
    if (!focusEvent) return
    const controls = globeRef.current?.controls()
    if (controls) {
      if (resumeTimerRef.current !== null) clearTimeout(resumeTimerRef.current)
      controls.autoRotate = false
    }
    panTo(globeRef, focusEvent.lat, focusEvent.lng)
  }, [focusEvent])

  return (
    <div ref={wrapRef} className={styles.globeWrap}>
      {size.w > 0 && size.h > 0 && (
        <GlobeGL
          ref={globeRef}
          width={size.w}
          height={size.h}
          polygonsData={polygonData}
          polygonAltitude={(polygon) => {
            const name = (polygon as CountryFeature).properties?.name as string
            return outageMap.has(name) ? COUNTRY_ALTITUDE + 0.01 : COUNTRY_ALTITUDE
          }}
          polygonCapColor={(polygon) => {
            const p = polygon as CountryFeature
            if (selectedCountry && p === selectedCountry) {
              return 'rgba(255, 255, 255, 0.2)'
            }
            const name = p.properties?.name as string
            const asnCount = outageMap.get(name)
            if (asnCount !== undefined) {
              const speed = Math.max(1, Math.min(10, asnCount / 10)) * Math.PI
              const rawAlpha = 0.2 + 0.5 * Math.max(0, Math.sin(pulseTime * speed))
              const alpha = Math.round(rawAlpha * 10) / 10
              return `rgba(239, 68, 68, ${alpha})` // #ef4444
            }
            return COUNTRY_FILL_TRANSPARENT
          }}
          polygonSideColor={() => COUNTRY_FILL_TRANSPARENT}
          polygonStrokeColor={() => outlineColor}
          polygonsTransitionDuration={0}
          onPolygonClick={(polygon) => setSelectedCountry(polygon as CountryFeature)}
          pointsData={points}
          pointsMerge
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointAltitude="altitude"
          pointRadius="radius"
          onPointClick={(point) => {
            const p = point as { type?: string }
            if (p.type === 'iss') {
              window.open('https://www.sen.com/live', '_blank')
            }
          }}
          ringsData={rings}
          ringLat="lat"
          ringLng="lng"
          ringColor={() => RING_COLOR}
          ringMaxRadius={RING_MAX_RADIUS}
          ringPropagationSpeed={RING_PROPAGATION_SPEED}
          ringRepeatPeriod={RING_REPEAT_PERIOD}
          atmosphereColor={ATMOSPHERE_COLOR}
          atmosphereAltitude={ATMOSPHERE_ALTITUDE}
          backgroundColor="rgba(0,0,0,0)"
          customLayerData={customLayerData}
          customThreeObject={particleSys.getObject}
          customThreeObjectUpdate={particleSys.update}
        />
      )}
      <div className={styles.dragHint}>drag to rotate</div>
      <div className={styles.legend}>
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className={styles.legendRow}>
            <div
              className={styles.legendDot}
              style={{ background: item.color }}
            />
            {item.label}
          </div>
        ))}
      </div>
      {selectedCountry && (
        <CountryPanel 
          country={selectedCountry} 
          onClose={() => setSelectedCountry(null)} 
        />
      )}
      <HeartbeatDot />
    </div>
  )
})

const HB_STALE_MS = 12_000

function HeartbeatDot(): React.ReactElement {
  const lastTs = useHeartbeat((s) => s.lastTs)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1_000)
    return () => clearInterval(id)
  }, [])

  void tick
  const isLive = lastTs !== null && Date.now() - lastTs < HB_STALE_MS
  const isConnecting = lastTs === null

  const dotClass = isConnecting
    ? styles.hbConnecting
    : isLive
      ? styles.hbLive
      : styles.hbDead

  const label = isConnecting ? 'CONNECTING' : isLive ? 'LIVE' : 'NO SIGNAL'

  return (
    <div className={styles.hbWrap}>
      <div className={dotClass}>
        {isLive && <div className={styles.hbRing} />}
      </div>
      <span className={styles.hbLabel}>{label}</span>
    </div>
  )
}

Globe.displayName = 'Globe'
