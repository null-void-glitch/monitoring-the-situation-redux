// ©AngelaMos | 2026
// urlhaus.ts

import { create } from 'zustand'
import type { URLhausEntry } from '@/api/types'

interface URLhausStore {
  items: URLhausEntry[]
  push: (item: URLhausEntry) => void
  clear: () => void
}

const URLHAUS_CAP = 200

export const useURLhausStore = create<URLhausStore>((set) => ({
  items: [],
  push: (item) =>
    set((s) => {
      const filtered = s.items.filter((i) => i.id !== item.id)
      const newItems = [item, ...filtered]
      newItems.sort(
        (a, b) =>
          new Date(b.date_added).getTime() - new Date(a.date_added).getTime()
      )
      return { items: newItems.slice(0, URLHAUS_CAP) }
    }),
  clear: () => set({ items: [] }),
}))
