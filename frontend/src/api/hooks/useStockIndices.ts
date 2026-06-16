// ©AngelaMos | 2026
// useStockIndices.ts

import { useQuery } from '@tanstack/react-query'
import { API_ENDPOINTS } from '@/config'
import { apiClient } from '@/core/api'
import { useFreshness } from '@/stores/freshness'

interface YahooFinanceResponse {
  chart: {
    result: Array<{
      meta: {
        currency: string
        symbol: string
        exchangeName: string
        regularMarketPrice: number
        chartPreviousClose: number
      }
      timestamp: number[]
      indicators: {
        quote: Array<{
          close: number[]
          open: number[]
          high: number[]
          low: number[]
          volume: number[]
        }>
      }
    }> | null
    error: any | null
  }
}

export interface StockIndexData {
  symbol: string
  price: number
  changePct: number
  history: number[]
}

const INDICES = ['^IXIC', '^GDAXI', '^FTSE', '^N225', '^HSI']

export function useStockIndices() {
  return useQuery({
    queryKey: ['stockIndices'],
    queryFn: async () => {
      const fetchSymbol = async (symbol: string): Promise<StockIndexData | null> => {
        try {
          const res = await apiClient.get<YahooFinanceResponse>(`${API_ENDPOINTS.INTEL.FINANCE}?symbol=${symbol}`)
          const chart = res.data?.chart?.result?.[0]
          if (!chart) return null

          const price = chart.meta.regularMarketPrice
          const prevClose = chart.meta.chartPreviousClose
          const changePct = ((price - prevClose) / prevClose) * 100
          
          const closePrices = chart.indicators.quote[0]?.close || []
          const history = closePrices.filter((p) => p !== null && p !== undefined)
          
          return { symbol, price, changePct, history }
        } catch (e) {
          console.error(`Failed to fetch ${symbol}`, e)
          return null
        }
      }

      const results = await Promise.all(INDICES.map(fetchSymbol))
      const validResults = results.filter((r): r is StockIndexData => r !== null)
      if (validResults.length > 0) {
        useFreshness.getState().ping('yahoo')
      }
      return validResults
    },
    refetchInterval: 60_000, // Every minute
  })
}
