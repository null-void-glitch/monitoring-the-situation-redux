// ©AngelaMos | 2026
// Panel.tsx

import type { ReactNode } from 'react'
import {
  FiChevronDown,
  FiChevronUp,
  FiExternalLink,
  FiMove,
  FiX,
} from 'react-icons/fi'
import { usePanelChrome } from '@/pages/dashboard/panelChrome'
import styles from './Panel.module.scss'
import { StaleIndicator } from './shared/StaleIndicator'

export type PanelAccent =
  | 'bgp'
  | 'outage'
  | 'kev'
  | 'ransomware'
  | 'dshield'
  | 'quake'
  | 'iss'
  | 'spacewx'
  | 'cve'
  | 'wiki'
  | 'btc'
  | 'eth'
  | 'urlhaus'
  | 'malwarebazaar'

export interface PanelProps {
  title: string
  subtitle?: string
  source?: string
  accent?: PanelAccent
  rawHref?: string
  rawLabel?: string
  isStale?: boolean
  lastTickAt?: number
  batch?: boolean
  headerAction?: ReactNode
  children: ReactNode
}

export function Panel({
  title,
  subtitle,
  source,
  accent,
  rawHref,
  rawLabel,
  isStale,
  lastTickAt,
  batch,
  headerAction,
  children,
}: PanelProps): React.ReactElement {
  const chrome = usePanelChrome()
  const customizing = chrome?.customizing ?? false
  const collapsed = chrome?.collapsed ?? false

  const ACCENT_CLASS: Record<PanelAccent, string> = {
    bgp: styles.accentBgp,
    outage: styles.accentOutage,
    kev: styles.accentKev,
    ransomware: styles.accentRansomware,
    dshield: styles.accentDshield,
    quake: styles.accentQuake,
    iss: styles.accentIss,
    spacewx: styles.accentSpacewx,
    cve: styles.accentCve,
    wiki: styles.accentWiki,
    btc: styles.accentBtc,
    eth: styles.accentEth,
    urlhaus: styles['accentUrlhaus'] || '',
    malwarebazaar: styles['accentMalwarebazaar'] || '',
  }
  const accentClass = accent ? ACCENT_CLASS[accent] : ''
  const panelClass = [
    styles.panel,
    accentClass,
    collapsed ? styles.collapsed : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article className={panelClass}>
      <header className={styles.head}>
        <span className={styles.titleBlock}>
          <span className={styles.title}>
            {title}
            {subtitle && <span className={styles.subtitle}> · {subtitle}</span>}
          </span>
          {source && <span className={styles.source}>{source}</span>}
        </span>
        <span className={styles.meta}>
          <StaleIndicator stale={isStale} lastTickAt={lastTickAt} batch={batch} />
          {headerAction && !customizing && headerAction}
          {rawHref && !customizing && (
            <a
              className={styles.rawLink}
              href={rawHref}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={rawLabel ?? 'Raw source'}
            >
              <FiExternalLink aria-hidden />
            </a>
          )}
          {customizing && chrome && (
            <span className={styles.chrome}>
              <button
                type="button"
                className={styles.chromeBtn}
                onClick={chrome.onToggleCollapse}
                aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
              >
                {collapsed ? (
                  <FiChevronDown aria-hidden />
                ) : (
                  <FiChevronUp aria-hidden />
                )}
              </button>
              <button
                type="button"
                className={styles.chromeBtn}
                onClick={chrome.onHide}
                aria-label="Hide panel"
              >
                <FiX aria-hidden />
              </button>
              <button
                type="button"
                className={styles.dragHandle}
                aria-label="Drag to reorder"
                {...chrome.dragAttributes}
                {...chrome.dragListeners}
              >
                <FiMove aria-hidden />
              </button>
            </span>
          )}
        </span>
      </header>
      {!collapsed && <div className={styles.body}>{children}</div>}
    </article>
  )
}

Panel.displayName = 'Panel'
