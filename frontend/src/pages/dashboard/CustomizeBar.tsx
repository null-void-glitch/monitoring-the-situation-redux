// ©AngelaMos | 2026
// CustomizeBar.tsx
//
// Floating toolbar shown while customizing the layout: re-add hidden panels,
// reset to default, and exit customize mode. Fixed-positioned so it never
// participates in the dashboard's CSS grid.

import { FiPlus, FiRotateCcw, FiX } from 'react-icons/fi'
import { useLayoutStore } from '@/stores/layout'
import styles from './CustomizeBar.module.scss'
import { PANELS } from './panelRegistry'

export function CustomizeBar(): React.ReactElement {
  const hidden = useLayoutStore((s) => s.hidden)
  const showPanel = useLayoutStore((s) => s.showPanel)
  const reset = useLayoutStore((s) => s.reset)
  const setCustomizing = useLayoutStore((s) => s.setCustomizing)

  return (
    <div className={styles.bar} role="toolbar" aria-label="Customize layout">
      <span className={styles.label}>CUSTOMIZE</span>
      <span className={styles.hint}>
        Drag a panel by its handle to reorder or move between columns.
      </span>

      {hidden.length > 0 && (
        <span className={styles.hiddenGroup}>
          <span className={styles.hiddenLabel}>Hidden</span>
          {hidden.map((id) => (
            <button
              key={id}
              type="button"
              className={styles.chip}
              onClick={() => showPanel(id)}
              aria-label={`Show ${PANELS[id].label} panel`}
            >
              <FiPlus aria-hidden />
              {PANELS[id].label}
            </button>
          ))}
        </span>
      )}

      <span className={styles.actions}>
        <button type="button" className={styles.action} onClick={reset}>
          <FiRotateCcw aria-hidden />
          Reset
        </button>
        <button
          type="button"
          className={`${styles.action} ${styles.done}`}
          onClick={() => setCustomizing(false)}
        >
          <FiX aria-hidden />
          Done
        </button>
      </span>
    </div>
  )
}

CustomizeBar.displayName = 'CustomizeBar'
