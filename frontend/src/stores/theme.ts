// ©AngelaMos | 2026
// theme.ts
//
// Color-scheme switching. Each preset is a set of CSS-custom-property
// overrides scoped by `:root[data-theme="<id>"]` in styles/_themes.scss.
// The 'custom' theme has no such block — instead its variables are applied
// as inline styles on <html> (highest specificity), so any preset's
// resolved colors can be used as a starting point and edited one at a time.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const THEMES = [
  { id: 'glow', label: 'Glow (dark)' },
  { id: 'glow-red', label: 'Glow Red' },
  { id: 'high-contrast', label: 'High Contrast' },
  { id: 'colorblind', label: 'Colorblind-safe' },
  { id: 'cyber-neon', label: 'Cyber Neon' },
  { id: 'synthwave-night', label: 'Synthwave Night' },
  { id: 'retro-gaming', label: 'Retro Gaming' },
  { id: 'scifi-synth', label: 'Sci-Fi Synth' },
  { id: 'futuristic-hud', label: 'Futuristic HUD' },
  { id: 'dark-tech', label: 'Dark Tech' },
  { id: 'b2b-minimal', label: 'B2B Minimal' },
  { id: 'neutral-cyber', label: 'Neutral Cyber' },
  { id: 'cyber-breach', label: 'Cyber Breach' },
  { id: 'cloud-computing', label: 'Cloud Computing' },
  { id: 'cozy-pastel', label: 'Cozy Pastel' },
  { id: 'light-cyber', label: 'Light Cyber' },
  { id: 'welcoming-cyber', label: 'Welcoming Cyber' },
  { id: 'clean-ui', label: 'Clean UI' },
  { id: 'hacker-mode', label: 'Hacker Mode' },
] as const

export type PresetThemeId = (typeof THEMES)[number]['id']
export type ThemeId = PresetThemeId | 'custom'

export const CUSTOM_THEME_ID: ThemeId = 'custom'

export interface EditableVar {
  var: string
  label: string
}

export interface EditableVarGroup {
  group: string
  vars: EditableVar[]
}

/** Every CSS custom property the custom-theme editor exposes, grouped for display. */
export const EDITABLE_VAR_GROUPS: EditableVarGroup[] = [
  {
    group: 'Surfaces',
    vars: [
      { var: '--bg', label: 'Background' },
      { var: '--bg-panel', label: 'Panel surface' },
      { var: '--bg-row-hover', label: 'Row hover' },
    ],
  },
  {
    group: 'Text',
    vars: [
      { var: '--fg-1', label: 'Primary text' },
      { var: '--fg-2', label: 'Secondary text' },
      { var: '--fg-3', label: 'Muted text' },
      { var: '--fg-4', label: 'Borders' },
      { var: '--rule-strong', label: 'Header rule' },
    ],
  },
  {
    group: 'Status',
    vars: [
      { var: '--ok', label: 'Live / healthy' },
      { var: '--amber', label: 'Stale / anomaly' },
    ],
  },
  {
    group: 'Taxonomy accents',
    vars: [
      { var: '--accent-bgp', label: 'BGP hijacks' },
      { var: '--accent-outage', label: 'Outages' },
      { var: '--accent-kev', label: 'Exploited CVEs' },
      { var: '--accent-ransomware', label: 'Ransomware' },
      { var: '--accent-dshield', label: 'Mass scan' },
      { var: '--accent-quake', label: 'Earthquakes' },
      { var: '--accent-iss', label: 'ISS / live' },
      { var: '--accent-spacewx', label: 'Space weather' },
      { var: '--accent-cve', label: 'CVE velocity' },
      { var: '--accent-wiki', label: 'News' },
      { var: '--accent-btc', label: 'Bitcoin' },
      { var: '--accent-eth', label: 'Ethereum' },
    ],
  },
  {
    group: 'Globe',
    vars: [{ var: '--globe-outline', label: 'Country outlines' }],
  },
]

const ALL_EDITABLE_VARS: string[] = EDITABLE_VAR_GROUPS.flatMap((g) =>
  g.vars.map((v) => v.var)
)

export type CustomColors = Partial<Record<string, string>>

const DEFAULT_THEME: ThemeId = 'glow'

function applyTheme(id: ThemeId): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = id
  }
}

/** Set (or clear, for missing entries) inline CSS-var overrides on <html>. */
function applyCustomColors(colors: CustomColors): void {
  if (typeof document === 'undefined') return
  const style = document.documentElement.style
  for (const varName of ALL_EDITABLE_VARS) {
    const value = colors[varName]
    if (value) style.setProperty(varName, value)
    else style.removeProperty(varName)
  }
}

/** Snapshot the currently-resolved value of every editable var (e.g. to seed
 *  the custom editor from whichever preset is active). */
function readResolvedColors(): CustomColors {
  if (typeof document === 'undefined') return {}
  const computed = getComputedStyle(document.documentElement)
  const result: CustomColors = {}
  for (const varName of ALL_EDITABLE_VARS) {
    const value = computed.getPropertyValue(varName).trim()
    if (value) result[varName] = value
  }
  return result
}

interface ThemeStore {
  theme: ThemeId
  customColors: CustomColors
  setTheme: (id: ThemeId) => void
  setCustomColor: (varName: string, value: string) => void
  /** Snapshot the active preset's resolved colors into customColors, without switching to it. */
  seedCustomFromCurrent: () => void
  /** Wipe custom overrides back to the Glow defaults. */
  resetCustomColors: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: DEFAULT_THEME,
      customColors: {},
      setTheme: (id) => {
        if (id === 'custom') {
          applyTheme(id)
          applyCustomColors(get().customColors)
        } else {
          applyCustomColors({})
          applyTheme(id)
        }
        set({ theme: id })
      },
      setCustomColor: (varName, value) => {
        const next = { ...get().customColors, [varName]: value }
        set({ customColors: next })
        if (get().theme === 'custom') {
          document.documentElement.style.setProperty(varName, value)
        }
      },
      seedCustomFromCurrent: () => {
        set({ customColors: readResolvedColors() })
      },
      resetCustomColors: () => {
        applyCustomColors({})
        const resolved = readResolvedColors()
        set({ customColors: resolved })
        if (get().theme === 'custom') applyCustomColors(resolved)
      },
    }),
    {
      name: 'monitor:theme',
      onRehydrateStorage: () => (state) => {
        const id = state?.theme ?? DEFAULT_THEME
        applyTheme(id)
        if (id === 'custom') applyCustomColors(state?.customColors ?? {})
      },
    }
  )
)

/** Apply the persisted theme before first paint (called from main.tsx). */
export function initTheme(): void {
  const state = useThemeStore.getState()
  applyTheme(state.theme)
  if (state.theme === 'custom') applyCustomColors(state.customColors)
}
