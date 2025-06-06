export interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface TechnicalIndicators {
  rsi: boolean
  macd: boolean
  ema: boolean
  sma: boolean
}

export interface PriceComparison {
  current: number
  oneMinuteAgo: number
  difference: number
  percentChange: number
}

export interface MACDData {
  macd: number[]
  signal: number[]
  histogram: number[]
}
