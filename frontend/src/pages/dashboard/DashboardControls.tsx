// ©AngelaMos | 2026
// DashboardControls.tsx
//
// Top-strip controls: color-theme picker + a toggle for layout customize mode.

import { useEffect, useRef, useState } from 'react'
import { FiDroplet, FiGrid } from 'react-icons/fi'
import { useLayoutStore } from '@/stores/layout'
import { CUSTOM_THEME_ID, THEMES, useThemeStore } from '@/stores/theme'
import styles from './DashboardControls.module.scss'
import { GlobeColorEditor } from './GlobeColorEditor'
import { ThemeColorEditor } from './ThemeColorEditor'

export function DashboardControls(): React.ReactElement {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const customColors = useThemeStore((s) => s.customColors)
  const seedCustomFromCurrent = useThemeStore((s) => s.seedCustomFromCurrent)
  const customizing = useLayoutStore((s) => s.customizing)
  const setCustomizing = useLayoutStore((s) => s.setCustomizing)

  const [menuOpen, setMenuOpen] = useState(false)
  const [view, setView] = useState<'presets' | 'editor' | 'globe'>('presets')
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(e: PointerEvent): void {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  function openMenu(): void {
    setView('presets')
    setMenuOpen((o) => !o)
  }

  function openCustomEditor(): void {
    if (Object.keys(customColors).length === 0) seedCustomFromCurrent()
    setTheme(CUSTOM_THEME_ID)
    setView('editor')
  }

  return (
    <>
      <div className={styles.themeWrap} ref={wrapRef}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={openMenu}
          aria-label="Color theme"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <FiDroplet aria-hidden />
        </button>
        {menuOpen && view === 'presets' && (
          <div className={styles.menu} role="menu">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="menuitemradio"
                aria-checked={theme === t.id}
                className={`${styles.menuItem} ${theme === t.id ? styles.menuItemActive : ''}`}
                onClick={() => {
                  setTheme(t.id)
                  setMenuOpen(false)
                }}
              >
                {t.label}
              </button>
            ))}
            <div className={styles.menuDivider} />
            <button
              type="button"
              role="menuitemradio"
              aria-checked={theme === CUSTOM_THEME_ID}
              className={`${styles.menuItem} ${theme === CUSTOM_THEME_ID ? styles.menuItemActive : ''}`}
              onClick={openCustomEditor}
            >
              Custom…
            </button>
            <div className={styles.menuDivider} />
            <button
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => setView('globe')}
            >
              Globe colors…
            </button>
          </div>
        )}
        {menuOpen && view === 'editor' && (
          <div className={`${styles.menu} ${styles.menuWide}`} role="menu">
            <ThemeColorEditor onBack={() => setView('presets')} />
          </div>
        )}
        {menuOpen && view === 'globe' && (
          <div className={`${styles.menu} ${styles.menuWide}`} role="menu">
            <GlobeColorEditor onBack={() => setView('presets')} />
          </div>
        )}
      </div>

      <button
        type="button"
        className={`${styles.iconButton} ${customizing ? styles.iconButtonActive : ''}`}
        onClick={() => setCustomizing(!customizing)}
        aria-label="Customize layout"
        aria-pressed={customizing}
      >
        <FiGrid aria-hidden />
      </button>
    </>
  )
}

DashboardControls.displayName = 'DashboardControls'
