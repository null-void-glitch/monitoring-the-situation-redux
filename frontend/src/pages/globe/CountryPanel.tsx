import { useMemo } from 'react'
import { FiX } from 'react-icons/fi'
import { useBgpHijackStore } from '@/stores/bgpHijack'
import { useGlobeEvents } from '@/stores/globeEvents'
import { useOutageStore } from '@/stores/outage'
import { useRansomwareStore } from '@/stores/ransomware'
import { useTicker } from '@/stores/ticker'
import { type CountryFeature } from './Globe'
import styles from './CountryPanel.module.scss'

interface CountryPanelProps {
  country: CountryFeature
  onClose: () => void
}

export function CountryPanel({ country, onClose }: CountryPanelProps): React.ReactElement {
  const iso2 = country.properties.ISO_A2 as string
  const name = (country.properties.NAME || country.properties.ADMIN || iso2) as string

  const hijacks = useBgpHijackStore((s) => s.items).filter((i) => i.enrichment?.country === iso2)
  const outages = useOutageStore((s) => s.items).filter((i) => i.locations?.includes(iso2))
  const ransomware = useRansomwareStore((s) => s.items).filter((i) => i.country === iso2)
  
  const globePoints = useGlobeEvents((s) => s.points)
  const scans = useMemo(() => {
    return globePoints.filter((p) => p.type === 'scan' && p.meta?.country === iso2)
  }, [globePoints, iso2])

  const tickerItems = useTicker((s) => s.items)
  const news = useMemo(() => {
    return tickerItems.filter((i) => 
      (i.source === 'Wikipedia' || i.source === 'Reuters' || i.source === 'BleepingComputer' || i.source === 'Google Project Zero') && 
      i.headline.toLowerCase().includes(name.toLowerCase())
    )
  }, [tickerItems, name])

  const totalEvents = hijacks.length + outages.length + ransomware.length + scans.length + news.length

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Intelligence Profile: {name}</h2>
          <button className={styles.modalClose} onClick={onClose}>
            <FiX />
          </button>
        </div>
        <div className={styles.modalBody}>
          {totalEvents === 0 ? (
            <div className={styles.emptyState}>No intelligence data available for this region.</div>
          ) : (
            <>
              <Section 
                title="Internet Outages" 
                items={outages} 
                render={(o) => <strong>{o.outageType || 'Unknown Outage'}:</strong>} 
                suffix={(o) => ` ${o.reason || 'No reason provided'} (${o.asns?.length || 0} ASNs affected)`}
              />
              <Section 
                title="BGP Hijacks" 
                items={hijacks} 
                render={(h) => <strong>ASN {h.hijacker_asn || 'Unknown'} {h.enrichment?.isp ? `(${h.enrichment.isp})` : ''}:</strong>}
                suffix={(h) => ` hijacked ${h.prefixes && h.prefixes.length > 0 ? h.prefixes.join(', ') : '0 prefixes'} (Confidence: ${h.confidence_score || '?'})`} 
              />
              <Section 
                title="Ransomware Victims" 
                items={ransomware} 
                render={(r) => r.website ? (
                  <a href={r.website.startsWith('http') ? r.website : `https://${r.website}`} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
                    <strong>{r.post_title}</strong>
                  </a>
                ) : (
                  <strong>{r.post_title}</strong>
                )}
                suffix={(r) => (
                  <>
                    <span style={{ color: 'var(--fg-2)', marginLeft: '4px' }}>(Actor: {r.group_name})</span>
                    {r.techniques && r.techniques.length > 0 && (
                      <span style={{ display: 'inline-flex', gap: '4px', marginLeft: '8px', verticalAlign: 'middle' }}>
                        {r.techniques.map(t => (
                          <a 
                            key={t}
                            href={`https://attack.mitre.org/techniques/${t}/`}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.techBadge}
                            title={`MITRE ATT&CK Technique: ${t}`}
                          >
                            {t}
                          </a>
                        ))}
                      </span>
                    )}
                  </>
                )} 
              />
              <Section 
                title="Active Scanning (Top IPs)" 
                items={scans} 
                render={(s) => <strong>Source IP {s.meta?.source}:</strong>}
                suffix={(s) => ` ${s.meta?.reports} reports across ${s.meta?.targets} targets`} 
              />
              <Section 
                title="Local News & Intel" 
                items={news} 
                render={(n) => n.href ? <a href={n.href} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{n.headline}</a> : <span>{n.headline}</span>}
                suffix={() => ''}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Section<T>({ title, items, render, suffix }: { title: string, items: T[], render: (item: T) => React.ReactNode, suffix: (item: T) => React.ReactNode }) {
  if (items.length === 0) return null
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>
        {title} <span className={styles.badge}>{items.length}</span>
      </h3>
      <div className={styles.sectionList}>
        {items.map((item, i) => (
          <div key={i} className={styles.row}>
            {render(item)}
            {suffix(item)}
          </div>
        ))}
      </div>
    </div>
  )
}
