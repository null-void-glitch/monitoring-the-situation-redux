// ©AngelaMos | 2026
// SortablePanel.tsx
//
// Wraps a registry panel in a dnd-kit sortable item and supplies the
// PanelChrome context so <Panel> can render drag/collapse/hide controls.

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useLayoutStore } from '@/stores/layout'
import { PanelChromeContext } from './panelChrome'
import { PANELS, type PanelId } from './panelRegistry'
import styles from './SortablePanel.module.scss'

export function SortablePanel({ id }: { id: PanelId }): React.ReactElement {
  const customizing = useLayoutStore((s) => s.customizing)
  const collapsed = useLayoutStore((s) => s.collapsed.includes(id))
  const toggleCollapsed = useLayoutStore((s) => s.toggleCollapsed)
  const hidePanel = useLayoutStore((s) => s.hidePanel)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: !customizing })

  const Component = PANELS[id].Component

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    zIndex: isDragging ? 2 : undefined,
  }

  const className = [styles.item, customizing ? styles.customizing : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={className}
      data-panel-id={id}
    >
      <PanelChromeContext.Provider
        value={{
          customizing,
          collapsed,
          onToggleCollapse: () => toggleCollapsed(id),
          onHide: () => hidePanel(id),
          dragAttributes: attributes as unknown as Record<string, unknown>,
          dragListeners: listeners as unknown as Record<
            string,
            (event: unknown) => void
          >,
        }}
      >
        <Component />
      </PanelChromeContext.Provider>
    </div>
  )
}

SortablePanel.displayName = 'SortablePanel'
