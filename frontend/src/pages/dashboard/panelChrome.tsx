// ©AngelaMos | 2026
// panelChrome.tsx
//
// Context that lets the generic <Panel> render customize-mode controls (drag
// handle, collapse, hide) without every panel component needing to know about
// the layout store. The SortablePanel wrapper provides the value per panel.

import { createContext, useContext } from 'react'

export interface PanelChrome {
  customizing: boolean
  collapsed: boolean
  onToggleCollapse: () => void
  onHide: () => void
  // dnd-kit drag handle bindings (loosely typed to avoid internal type paths).
  dragAttributes?: Record<string, unknown>
  dragListeners?: Record<string, (event: unknown) => void>
}

export const PanelChromeContext = createContext<PanelChrome | null>(null)

export function usePanelChrome(): PanelChrome | null {
  return useContext(PanelChromeContext)
}
