// ©AngelaMos | 2026
// GlobeColorEditor.tsx
//
// Per-type color picker for globe blips and their associated particle-flow
// clouds, opened from DashboardControls. Independent of the color theme —
// these colors apply the same regardless of which theme is active.

import { FiArrowLeft, FiRotateCcw } from 'react-icons/fi'
import { GLOBE_COLOR_ROWS, useGlobeColorsStore } from '@/stores/globeColors'
import styles from './ThemeColorEditor.module.scss'

interface GlobeColorEditorProps {
  onBack: () => void
}

export function GlobeColorEditor({
  onBack,
}: GlobeColorEditorProps): React.ReactElement {
  const blipColors = useGlobeColorsStore((s) => s.blipColors)
  const setBlipColor = useGlobeColorsStore((s) => s.setBlipColor)
  const resetBlipColors = useGlobeColorsStore((s) => s.resetBlipColors)

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onBack}
          aria-label="Back to themes"
        >
          <FiArrowLeft aria-hidden />
        </button>
        <span className={styles.title}>Globe colors</span>
        <button
          type="button"
          className={styles.iconButton}
          onClick={resetBlipColors}
          aria-label="Reset globe colors to defaults"
          title="Reset to defaults"
        >
          <FiRotateCcw aria-hidden />
        </button>
      </div>
      <div className={styles.list}>
        <div className={styles.group}>
          <div className={styles.groupLabel}>Blips &amp; particle clouds</div>
          {GLOBE_COLOR_ROWS.map(({ label, types }) => {
            const value = blipColors[types[0]]
            return (
              <label key={label} className={styles.row}>
                <span className={styles.rowLabel}>{label}</span>
                <span className={styles.rowValue}>{value}</span>
                <input
                  type="color"
                  className={styles.swatch}
                  value={value}
                  onChange={(e) => setBlipColor(types, e.target.value)}
                />
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}

GlobeColorEditor.displayName = 'GlobeColorEditor'
