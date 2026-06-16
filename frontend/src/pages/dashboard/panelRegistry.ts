// ©AngelaMos | 2026
// panelRegistry.ts
//
// Single source of truth for which panels exist, what they render, and where
// they live by default. The dashboard layout (order / visibility / collapse)
// is data-driven off these ids — see stores/layout.ts.

import type { ComponentType } from 'react'
import { BGPHijackPanel } from '@/pages/panels/BGPHijackPanel'
import { BTCPanel } from '@/pages/panels/BTCPanel'
import { CVEVelocityPanel } from '@/pages/panels/CVEVelocityPanel'
import { DShieldPanel } from '@/pages/panels/DShieldPanel'
import { EarthquakePanel } from '@/pages/panels/EarthquakePanel'
import { ETHPanel } from '@/pages/panels/ETHPanel'
import { ISSPanel } from '@/pages/panels/ISSPanel'
import { KEVPanel } from '@/pages/panels/KEVPanel'
import { OutagePanel } from '@/pages/panels/OutagePanel'
import { RansomwarePanel } from '@/pages/panels/RansomwarePanel'
import { SpaceWeatherPanel } from '@/pages/panels/SpaceWeatherPanel'
import { DaxPanel, FtsePanel, HangSengPanel, NasdaqPanel, NikkeiPanel } from '@/pages/panels/StockPanel'
import { WikiPanel } from '@/pages/panels/WikiPanel'

export type PanelId =
  | 'btc'
  | 'eth'
  | 'nasdaq'
  | 'dax'
  | 'ftse'
  | 'nikkei'
  | 'hangseng'
  | 'spacewx'
  | 'iss'
  | 'quake'
  | 'cve'
  | 'wiki'
  | 'bgp'
  | 'outage'
  | 'kev'
  | 'ransomware'
  | 'dshield'

export interface PanelDef {
  id: PanelId
  /** Human label shown in the customize bar / hidden-panel chips. */
  label: string
  Component: ComponentType
}

export const PANELS: Record<PanelId, PanelDef> = {
  btc: { id: 'btc', label: 'BTC', Component: BTCPanel },
  eth: { id: 'eth', label: 'ETH', Component: ETHPanel },
  nasdaq: { id: 'nasdaq', label: 'NASDAQ', Component: NasdaqPanel },
  dax: { id: 'dax', label: 'DAX', Component: DaxPanel },
  ftse: { id: 'ftse', label: 'FTSE', Component: FtsePanel },
  nikkei: { id: 'nikkei', label: 'NIKKEI', Component: NikkeiPanel },
  hangseng: { id: 'hangseng', label: 'HANG SENG', Component: HangSengPanel },
  spacewx: {
    id: 'spacewx',
    label: 'Space Weather',
    Component: SpaceWeatherPanel,
  },
  iss: { id: 'iss', label: 'ISS', Component: ISSPanel },
  quake: { id: 'quake', label: 'Earthquakes', Component: EarthquakePanel },
  cve: { id: 'cve', label: 'CVE Velocity', Component: CVEVelocityPanel },
  wiki: { id: 'wiki', label: 'Wikipedia', Component: WikiPanel },
  bgp: { id: 'bgp', label: 'BGP Hijacks', Component: BGPHijackPanel },
  outage: { id: 'outage', label: 'Outages', Component: OutagePanel },
  kev: { id: 'kev', label: 'KEV', Component: KEVPanel },
  ransomware: {
    id: 'ransomware',
    label: 'Ransomware',
    Component: RansomwarePanel,
  },
  dshield: { id: 'dshield', label: 'DShield', Component: DShieldPanel },
}

// Default layout — mirrors the original hardcoded Dashboard arrangement.
export const DEFAULT_LEFT: PanelId[] = [
  'btc',
  'eth',
  'nasdaq',
  'dax',
  'ftse',
  'nikkei',
  'hangseng',
  'spacewx',
  'iss',
  'quake',
  'cve',
  'wiki',
]
export const DEFAULT_RIGHT: PanelId[] = [
  'bgp',
  'outage',
  'kev',
  'ransomware',
  'dshield',
]

export const ALL_PANEL_IDS: PanelId[] = [...DEFAULT_LEFT, ...DEFAULT_RIGHT]

export function isPanelId(value: unknown): value is PanelId {
  return typeof value === 'string' && value in PANELS
}
