// ©AngelaMos | 2026
// Dashboard.tsx

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { PanelId } from '@/pages/dashboard/panelRegistry'
import { Globe } from '@/pages/globe/Globe'
import { type ColumnSide, useLayoutStore } from '@/stores/layout'
import { useUIStore } from '@/stores/ui'
import { About } from './About'
import { AlertBanner } from './AlertBanner'
import { BottomTicker } from './BottomTicker'
import { CustomizeBar } from './CustomizeBar'
import styles from './Dashboard.module.scss'
import { useDashboardLifecycle } from './lifecycle'
import { presentationMode } from './presentationMode'
import { SortablePanel } from './SortablePanel'
import { StatusFooter } from './StatusFooter'
import { TimezoneTickerBar } from './TimezoneTickerBar'
import { TopStrip } from './TopStrip'

const COLUMN_DROP_PREFIX = 'col:'

function columnOf(
  id: string,
  left: PanelId[],
  right: PanelId[]
): ColumnSide | null {
  if (left.includes(id as PanelId)) return 'left'
  if (right.includes(id as PanelId)) return 'right'
  return null
}

function targetColumnOf(
  overId: string,
  left: PanelId[],
  right: PanelId[]
): ColumnSide | null {
  if (overId === `${COLUMN_DROP_PREFIX}left`) return 'left'
  if (overId === `${COLUMN_DROP_PREFIX}right`) return 'right'
  return columnOf(overId, left, right)
}

function Column({
  side,
  ids,
}: {
  side: ColumnSide
  ids: PanelId[]
}): React.ReactElement {
  const { setNodeRef } = useDroppable({ id: `${COLUMN_DROP_PREFIX}${side}` })
  return (
    <aside ref={setNodeRef} className={styles[side]}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {ids.map((id) => (
          <SortablePanel key={id} id={id} />
        ))}
      </SortableContext>
    </aside>
  )
}

export function Dashboard(): React.ReactElement {
  useDashboardLifecycle()
  presentationMode.useGlobalShortcut()
  const isPresentation = useUIStore((s) => s.presentationMode)

  const left = useLayoutStore((s) => s.left)
  const right = useLayoutStore((s) => s.right)
  const customizing = useLayoutStore((s) => s.customizing)
  const setColumns = useLayoutStore((s) => s.setColumns)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Live cross-column move while dragging.
  function handleDragOver(event: DragOverEvent): void {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    const state = useLayoutStore.getState()
    const from = columnOf(activeId, state.left, state.right)
    const to = targetColumnOf(overId, state.left, state.right)
    if (!from || !to || from === to) return

    const fromArr = (from === 'left' ? state.left : state.right).filter(
      (id) => id !== activeId
    )
    const toArr = [...(to === 'left' ? state.left : state.right)]
    let index = overId.startsWith(COLUMN_DROP_PREFIX)
      ? toArr.length
      : toArr.indexOf(overId as PanelId)
    if (index < 0) index = toArr.length
    toArr.splice(index, 0, activeId as PanelId)

    // Exactly one of from/to is 'left' (two columns, from !== to).
    setColumns(
      from === 'left' ? fromArr : toArr,
      from === 'right' ? fromArr : toArr
    )
  }

  // Same-column reorder on drop (cross-column already applied in dragOver).
  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    const state = useLayoutStore.getState()
    const from = columnOf(activeId, state.left, state.right)
    const to = targetColumnOf(overId, state.left, state.right)
    if (!from || !to || from !== to) return

    const arr = from === 'left' ? state.left : state.right
    const oldIndex = arr.indexOf(activeId as PanelId)
    const newIndex = overId.startsWith(COLUMN_DROP_PREFIX)
      ? arr.length - 1
      : arr.indexOf(overId as PanelId)
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return

    const reordered = arrayMove(arr, oldIndex, newIndex)
    setColumns(
      from === 'left' ? reordered : state.left,
      from === 'right' ? reordered : state.right
    )
  }

  const rootClass = isPresentation
    ? `${styles.root} ${styles.presentation}`
    : styles.root

  return (
    <div className={rootClass}>
      <div className={styles.rotateBanner} aria-hidden="true">
        ↻ Rotate for a better view
      </div>
      <TopStrip />
      <AlertBanner />
      <TimezoneTickerBar />
      <main className={styles.grid}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <Column side="left" ids={left} />
          <section className={styles.center}>
            <Globe />
          </section>
          <Column side="right" ids={right} />
        </DndContext>
      </main>
      <BottomTicker />
      <StatusFooter />
      <About />
      {customizing && !isPresentation && <CustomizeBar />}
    </div>
  )
}

Dashboard.displayName = 'Dashboard'
