// ©AngelaMos | 2026
// WikiPanel.tsx

import { useState, useMemo } from 'react'
import { FiRefreshCw, FiList, FiX } from 'react-icons/fi'
import { useFreshness } from '@/stores/freshness'
import { useTicker } from '@/stores/ticker'
import { Panel } from './Panel'
import styles from './WikiPanel.module.scss'

const MAX_ITEMS = 8
const STALE_AFTER_MS = 3_600_000
const MS_PER_SECOND = 1_000
const SECONDS_PER_MINUTE = 60
const SECONDS_PER_HOUR = 3_600

export function WikiPanel(): React.ReactElement {
  const [refreshing, setRefreshing] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetch('/v1/news/refresh', { method: 'POST' })
    } catch (e) {
      console.error('Failed to trigger news refresh', e)
    }
    setTimeout(() => setRefreshing(false), 1500)
  }

  const all = useTicker((s) => s.items)
  const allNews = useMemo(() => {
    return all
      .filter((i) => i.source === 'Wikipedia' || i.source === 'Reuters' || i.source === 'BleepingComputer' || i.source === 'Google Project Zero')
      .sort((a, b) => b.ts - a.ts)
  }, [all])
  
  const items = useMemo(() => {
    const counts: Record<string, number> = {}
    const filtered: typeof allNews = []
    
    for (const item of allNews) {
      if (!counts[item.source]) counts[item.source] = 0
      if (counts[item.source] < 2) {
        filtered.push(item)
        counts[item.source]++
      }
      if (filtered.length >= MAX_ITEMS) break
    }
    
    return filtered
  }, [allNews])

  const groupedNews = useMemo(() => {
    const groups: Record<string, typeof allNews> = {}
    for (const item of allNews) {
      if (!groups[item.source]) groups[item.source] = []
      groups[item.source].push(item)
    }
    return groups
  }, [allNews])

  const lastWiki = useFreshness((s) => s.ts.wiki)
  const lastRss = useFreshness((s) => s.ts.rss)
  const lastTickAt = Math.max(lastWiki || 0, lastRss || 0) || undefined
  const isStale =
    items.length === 0
      ? undefined
      : lastTickAt !== undefined && Date.now() - lastTickAt > STALE_AFTER_MS

  const headerActions = (
    <>
      <button 
        type="button"
        className={styles.headerRefresh} 
        onClick={() => setIsModalOpen(true)} 
        title="View all news"
        aria-label="View all news"
      >
        <FiList />
      </button>
      <button 
        type="button"
        className={styles.headerRefresh} 
        onClick={handleRefresh} 
        disabled={refreshing}
        title="Fetch latest news"
        aria-label="Fetch latest news"
      >
        <FiRefreshCw className={refreshing ? styles.spin : ''} />
      </button>
    </>
  )

  return (
    <Panel
      title="News"
      subtitle="Wikipedia / RSS"
      source="Multiple Sources"
      accent="wiki"
      isStale={isStale}
      lastTickAt={lastTickAt}
      batch
      headerAction={headerActions}
    >
      <div className={styles.list}>
        {items.length === 0 ? (
          <div className={styles.empty}>—</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className={styles.row}>
              {item.href ? (
                <a
                  className={styles.headline}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {item.headline}
                </a>
              ) : (
                <span className={styles.headline}>{item.headline}</span>
              )}
              <span className={styles.ts}>{fmtRel(item.ts)}</span>
            </div>
          ))
        )}
      </div>
      
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>All News Feeds</h2>
              <button className={styles.modalClose} onClick={() => setIsModalOpen(false)}>
                <FiX />
              </button>
            </div>
            <div className={styles.modalBody}>
              {Object.entries(groupedNews).map(([source, sourceItems]) => (
                <div key={source} className={styles.sourceGroup}>
                  <h3 className={styles.sourceTitle}>{source}</h3>
                  <div className={styles.modalList}>
                    {sourceItems.map((item) => (
                      <div key={item.id} className={styles.row}>
                        {item.href ? (
                          <a
                            className={styles.headline}
                            href={item.href}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            {item.headline}
                          </a>
                        ) : (
                          <span className={styles.headline}>{item.headline}</span>
                        )}
                        <span className={styles.ts}>{fmtRel(item.ts)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Panel>
  )
}

WikiPanel.displayName = 'WikiPanel'

function fmtRel(ts: number): string {
  const diff = (Date.now() - ts) / MS_PER_SECOND
  if (diff < SECONDS_PER_MINUTE) return `${Math.floor(diff)}s`
  if (diff < SECONDS_PER_HOUR) return `${Math.floor(diff / SECONDS_PER_MINUTE)}m`
  return `${Math.floor(diff / SECONDS_PER_HOUR)}h`
}
