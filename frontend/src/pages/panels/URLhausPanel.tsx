// ©AngelaMos | 2026
// URLhausPanel.tsx

import { useEffect, useRef, useState } from 'react'
import { useURLhausData } from '@/api/hooks'
import { Panel } from './Panel'
import styles from './URLhausPanel.module.scss'

const ROW_LIMIT = 6
const FLASH_DURATION_MS = 600

export function URLhausPanel(): React.ReactElement {
  const { items } = useURLhausData()
  const seenKeys = useRef<Set<string>>(new Set())
  const [flashKeys, setFlashKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    const isFirstSeed = seenKeys.current.size === 0
    const newKeys: string[] = []
    for (const v of items) {
      const k = v.id
      if (!seenKeys.current.has(k)) {
        seenKeys.current.add(k)
        if (!isFirstSeed) newKeys.push(k)
      }
    }
    if (newKeys.length > 0) setFlashKeys(new Set(newKeys))
  }, [items])

  useEffect(() => {
    if (flashKeys.size === 0) return
    const t = setTimeout(() => setFlashKeys(new Set()), FLASH_DURATION_MS)
    return () => clearTimeout(t)
  }, [flashKeys])

  const recent = items.slice(0, ROW_LIMIT)
  const now = Date.now()

  return (
    <Panel
      title="URLHAUS"
      subtitle="THREAT URLS"
      source="urlhaus.abuse.ch"
      accent="urlhaus"
      rawHref="https://urlhaus.abuse.ch/browse/"
      rawLabel="urlhaus.abuse.ch"
      batch
    >
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.url}>URL</th>
            <th className={styles.host}>Host</th>
            <th className={styles.status}>Status</th>
            <th className={styles.ago}>Ago</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((v) => {
            const isFlashing = flashKeys.has(v.id)
            const msAgo = now - new Date(v.date_added).getTime()
            const minsAgo = Math.floor(msAgo / 60_000)
            const agoStr =
              minsAgo < 60 ? `${minsAgo}m` : `${Math.floor(minsAgo / 60)}h`

            return (
              <tr key={v.id} className={isFlashing ? styles.flash : undefined}>
                <td className={styles.url} title={v.url}>
                  <div>{v.url}</div>
                  {v.tags && v.tags.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      {v.tags.slice(0, 3).map((t) => (
                        <span key={t} className={styles.tag}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className={styles.host} title={v.host || ''}>
                  {v.host || '-'}
                </td>
                <td className={styles.status}>{v.url_status || 'unknown'}</td>
                <td className={styles.ago}>{agoStr}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Panel>
  )
}
