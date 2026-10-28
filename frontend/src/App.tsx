// ©AngelaMos | 2026
// App.tsx

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'

import { queryClient } from '@/core/api'
import { router } from '@/core/app/routers'
import { useUIStore } from '@/stores/ui'

export default function App(): React.ReactElement {
  const devtoolsOpen = useUIStore((s) => s.devtoolsOpen)

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        duration={2500}
        theme="dark"
        toastOptions={{
          style: {
            background: 'var(--bg-panel)',
            border: '1px solid var(--fg-4)',
            color: 'var(--fg-1)',
            borderRadius: 0,
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--type-body)',
          },
        }}
      />
      {devtoolsOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
            height: '50vh',
            background: 'var(--bg)',
            borderTop: '1px solid var(--fg-4)',
          }}
        >
          <ReactQueryDevtoolsPanel
            onClose={() => useUIStore.getState().setDevtoolsOpen(false)}
          />
        </div>
      )}
    </QueryClientProvider>
  )
}
