// ©AngelaMos | 2026
// DashboardControls.tsx
//
// Top-strip controls: color-theme picker + a toggle for layout customize mode.

import { useEffect, useRef, useState } from 'react'
import { FiDroplet, FiGrid } from 'react-icons/fi'
import { useLayoutStore } from '@/stores/layout'
import { THEMES, useThemeStore } from '@/stores/theme'
import styles from './DashboardControls.module.scss'

export function DashboardControls(): React.ReactElement {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const customizing = useLayoutStore((s) => s.customizing)
  const setCustomizing = useLayoutStore((s) => s.setCustomizing)

  const [menuOpen, setMenuOpen] = useState(false)
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

  return (
    <>
      <div className={styles.themeWrap} ref={wrapRef}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Color theme"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <FiDroplet aria-hidden />
        </button>
        {menuOpen && (
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
