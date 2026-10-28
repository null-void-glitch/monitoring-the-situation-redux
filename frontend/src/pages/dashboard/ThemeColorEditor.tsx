// ©AngelaMos | 2026
// ThemeColorEditor.tsx
//
// Per-variable color picker for the 'custom' theme, opened from
// DashboardControls once the user selects "Custom…" from the theme menu.

import { FiArrowLeft, FiRotateCcw } from 'react-icons/fi'
import { EDITABLE_VAR_GROUPS, useThemeStore } from '@/stores/theme'
import styles from './ThemeColorEditor.module.scss'

interface ThemeColorEditorProps {
  onBack: () => void
}

export function ThemeColorEditor({
  onBack,
}: ThemeColorEditorProps): React.ReactElement {
  const customColors = useThemeStore((s) => s.customColors)
  const setCustomColor = useThemeStore((s) => s.setCustomColor)
  const resetCustomColors = useThemeStore((s) => s.resetCustomColors)

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
        <span className={styles.title}>Custom colors</span>
        <button
          type="button"
          className={styles.iconButton}
          onClick={resetCustomColors}
          aria-label="Reset to Glow defaults"
          title="Reset to Glow defaults"
        >
          <FiRotateCcw aria-hidden />
        </button>
      </div>
      <div className={styles.list}>
        {EDITABLE_VAR_GROUPS.map((group) => (
          <div key={group.group} className={styles.group}>
            <div className={styles.groupLabel}>{group.group}</div>
            {group.vars.map(({ var: varName, label }) => {
              const value = customColors[varName] ?? '#000000'
              return (
                <label key={varName} className={styles.row}>
                  <span className={styles.rowLabel}>{label}</span>
                  <span className={styles.rowValue}>{value}</span>
                  <input
                    type="color"
                    className={styles.swatch}
                    value={value}
                    onChange={(e) => setCustomColor(varName, e.target.value)}
                  />
                </label>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

ThemeColorEditor.displayName = 'ThemeColorEditor'
