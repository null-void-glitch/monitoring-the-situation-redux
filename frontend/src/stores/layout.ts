// ©AngelaMos | 2026
// layout.ts
//
// Persisted dashboard layout: per-column panel order, hidden panels, collapsed
// panels, and whether the user is currently in "customize" mode. The two side
// columns (left / right) are ordered lists of PanelIds; the globe is fixed.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  ALL_PANEL_IDS,
  DEFAULT_LEFT,
  DEFAULT_RIGHT,
  isPanelId,
  type PanelId,
} from '@/pages/dashboard/panelRegistry'

export type ColumnSide = 'left' | 'right'

interface LayoutState {
  left: PanelId[]
  right: PanelId[]
  hidden: PanelId[]
  collapsed: PanelId[]
  customizing: boolean

  setCustomizing: (on: boolean) => void
  setColumns: (left: PanelId[], right: PanelId[]) => void
  toggleCollapsed: (id: PanelId) => void
  hidePanel: (id: PanelId) => void
  showPanel: (id: PanelId) => void
  reset: () => void
}

interface PersistedLayout {
  left?: unknown
  right?: unknown
  hidden?: unknown
  collapsed?: unknown
}

/**
 * Reconcile possibly-stale persisted arrays against the current registry:
 * drop unknown/removed ids, dedupe, and place any newly-added panel into its
 * default column so new feeds are never silently hidden.
 */
function reconcile(
  rawLeft: unknown,
  rawRight: unknown,
  rawHidden: unknown,
  rawCollapsed: unknown
): Pick<LayoutState, 'left' | 'right' | 'hidden' | 'collapsed'> {
  const seen = new Set<PanelId>()
  const clean = (raw: unknown): PanelId[] => {
    if (!Array.isArray(raw)) return []
    const out: PanelId[] = []
    for (const v of raw) {
      if (isPanelId(v) && !seen.has(v)) {
        seen.add(v)
        out.push(v)
      }
    }
    return out
  }

  const left = clean(rawLeft)
  const right = clean(rawRight)
  const hidden = clean(rawHidden)

  // Any registry panel not placed anywhere yet → its default column.
  for (const id of ALL_PANEL_IDS) {
    if (!seen.has(id)) {
      seen.add(id)
      ;(DEFAULT_RIGHT.includes(id) ? right : left).push(id)
    }
  }

  const collapsed = Array.isArray(rawCollapsed)
    ? rawCollapsed.filter(isPanelId)
    : []

  return { left, right, hidden, collapsed }
}

const DEFAULTS = (): Pick<
  LayoutState,
  'left' | 'right' | 'hidden' | 'collapsed'
> => ({
  left: [...DEFAULT_LEFT],
  right: [...DEFAULT_RIGHT],
  hidden: [],
  collapsed: [],
})

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      ...DEFAULTS(),
      customizing: false,

      setCustomizing: (on) => set({ customizing: on }),

      setColumns: (left, right) => set({ left, right }),

      toggleCollapsed: (id) =>
        set((s) => ({
          collapsed: s.collapsed.includes(id)
            ? s.collapsed.filter((x) => x !== id)
            : [...s.collapsed, id],
        })),

      hidePanel: (id) =>
        set((s) => ({
          left: s.left.filter((x) => x !== id),
          right: s.right.filter((x) => x !== id),
          hidden: s.hidden.includes(id) ? s.hidden : [...s.hidden, id],
        })),

      showPanel: (id) =>
        set((s) => {
          const hidden = s.hidden.filter((x) => x !== id)
          // Re-add to its default column (append) if not already present.
          const inLeft = s.left.includes(id)
          const inRight = s.right.includes(id)
          if (inLeft || inRight) return { hidden }
          return DEFAULT_RIGHT.includes(id)
            ? { hidden, right: [...s.right, id] }
            : { hidden, left: [...s.left, id] }
        }),

      reset: () => set({ ...DEFAULTS() }),
    }),
    {
      name: 'monitor:layout',
      // customizing is session-only; never persist it.
      partialize: (s) => ({
        left: s.left,
        right: s.right,
        hidden: s.hidden,
        collapsed: s.collapsed,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as PersistedLayout
        return {
          ...current,
          ...reconcile(p.left, p.right, p.hidden, p.collapsed),
        }
      },
    }
  )
)
