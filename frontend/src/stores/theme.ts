// ©AngelaMos | 2026
// theme.ts
//
// Color-scheme switching. Each theme is a set of CSS-custom-property overrides
// scoped by `:root[data-theme="<id>"]` in styles/_themes.scss. This store just
// flips the `data-theme` attribute on <html> and persists the choice.

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

export type ThemeId = (typeof THEMES)[number]['id']

const DEFAULT_THEME: ThemeId = 'glow'

function applyTheme(id: ThemeId): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = id
  }
}

interface ThemeStore {
  theme: ThemeId
  setTheme: (id: ThemeId) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      setTheme: (id) => {
        applyTheme(id)
        set({ theme: id })
      },
    }),
    {
      name: 'monitor:theme',
      onRehydrateStorage: () => (state) => {
        applyTheme(state?.theme ?? DEFAULT_THEME)
      },
    }
  )
)

/** Apply the persisted theme before first paint (called from main.tsx). */
export function initTheme(): void {
  applyTheme(useThemeStore.getState().theme)
}
