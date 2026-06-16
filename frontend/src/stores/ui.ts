// ©AngelaMos | 2026
// ui.ts

import { create } from 'zustand'

export interface AlertState {
  message: string
  severity: 'info' | 'warn'
}

interface UIStore {
  presentationMode: boolean
  setPresentationMode: (on: boolean) => void
  togglePresentationMode: () => void

  currentAlert: AlertState | null
  showAlert: (a: AlertState) => void
  dismissAlert: () => void

  aboutOpen: boolean
  openAbout: () => void
  closeAbout: () => void

  devtoolsOpen: boolean
  toggleDevtools: () => void
  setDevtoolsOpen: (on: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  presentationMode: false,
  setPresentationMode: (on) => set({ presentationMode: on }),
  togglePresentationMode: () =>
    set((s) => ({ presentationMode: !s.presentationMode })),

  currentAlert: null,
  showAlert: (a) => set({ currentAlert: a }),
  dismissAlert: () => set({ currentAlert: null }),

  aboutOpen: false,
  openAbout: () => set({ aboutOpen: true }),
  closeAbout: () => set({ aboutOpen: false }),

  devtoolsOpen: false,
  toggleDevtools: () => set((s) => ({ devtoolsOpen: !s.devtoolsOpen })),
  setDevtoolsOpen: (on) => set({ devtoolsOpen: on }),
}))
