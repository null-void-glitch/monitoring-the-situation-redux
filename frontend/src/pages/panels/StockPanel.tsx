// ©AngelaMos | 2026
// StockPanel.tsx

import { useStockIndices } from '@/api/hooks'
import { usePriceFlash } from '@/lib/usePriceFlash'
import btcStyles from './BTCPanel.module.scss'
import { Panel } from './Panel'

const PERCENT_DECIMALS = 2
const PRICE_DECIMALS = 2

interface StockPanelProps {
  symbol: string
  title: string
  subtitle: string
}

export function StockPanel({
  symbol,
  title,
  subtitle,
}: StockPanelProps): React.ReactElement {
  const { data: indices } = useStockIndices()
  const indexData = indices?.find((i) => i.symbol === symbol)

  const priceNum = indexData ? indexData.price : null
  const pct1h = indexData ? indexData.changePct : null

  const { dir: flashDir, key: flashKey } = usePriceFlash(priceNum)

  const priceClass = [
    btcStyles.price,
    flashDir === 'up'
      ? btcStyles.flashUp
      : flashDir === 'down'
        ? btcStyles.flashDown
        : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Panel
      title={title}
      subtitle={subtitle}
      source="yahoo"
      accent="btc"
      rawHref={`https://finance.yahoo.com/quote/${symbol}`}
      rawLabel={`Yahoo Finance ${title}`}
    >
      <div className={btcStyles.hero}>
        <span key={flashKey} className={priceClass}>
          {fmtPrice(priceNum)}
        </span>
      </div>
      <div className={btcStyles.changes}>
        <ChangeRow label="1D" pct={pct1h} />
      </div>
    </Panel>
  )
}

function ChangeRow({
  label,
  pct,
}: {
  label: string
  pct: number | null
}): React.ReactElement {
  const isUp = pct !== null && pct >= 0
  return (
    <div className={btcStyles.change}>
      <span className={btcStyles.changeLabel}>{label}</span>
      <span className={btcStyles.changeValue}>
        {pct === null ? (
          '—'
        ) : (
          <>
            <span className={isUp ? btcStyles.up : btcStyles.down}>
              {isUp ? '△' : '▽'}
            </span>
            {` ${Math.abs(pct).toFixed(PERCENT_DECIMALS)} %`}
          </>
        )}
      </span>
    </div>
  )
}

function fmtPrice(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '—'
  return n.toLocaleString(undefined, {
    minimumFractionDigits: PRICE_DECIMALS,
    maximumFractionDigits: PRICE_DECIMALS,
  })
}

export const NasdaqPanel = () => (
  <StockPanel symbol="^IXIC" title="NASDAQ" subtitle="INDEX" />
)
export const DaxPanel = () => (
  <StockPanel symbol="^GDAXI" title="DAX" subtitle="INDEX" />
)
export const FtsePanel = () => (
  <StockPanel symbol="^FTSE" title="FTSE 100" subtitle="INDEX" />
)
export const NikkeiPanel = () => (
  <StockPanel symbol="^N225" title="NIKKEI 225" subtitle="INDEX" />
)
export const HangSengPanel = () => (
  <StockPanel symbol="^HSI" title="HANG SENG" subtitle="INDEX" />
)
