export const calculateRSI = (prices: number[], period = 14): number[] => {
  if (prices.length < period + 1) return []

  const rsi: number[] = []
  let gains = 0
  let losses = 0

  // Calculate initial average gain and loss
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) gains += change
    else losses -= change
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? -change : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    const rs = avgGain / avgLoss
    const rsiValue = 100 - 100 / (1 + rs)
    rsi.push(rsiValue)
  }

  return rsi
}

export const calculateEMA = (prices: number[], period: number): number[] => {
  if (prices.length < period) return []

  const ema: number[] = []
  const multiplier = 2 / (period + 1)

  // First EMA is SMA
  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += prices[i]
  }
  ema.push(sum / period)

  // Calculate EMA
  for (let i = period; i < prices.length; i++) {
    const emaValue = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]
    ema.push(emaValue)
  }

  return ema
}

export const calculateSMA = (prices: number[], period: number): number[] => {
  if (prices.length < period) return []

  const sma: number[] = []
  for (let i = period - 1; i < prices.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += prices[i - j]
    }
    sma.push(sum / period)
  }

  return sma
}

export const calculateMACD = (prices: number[]): { macd: number[]; signal: number[]; histogram: number[] } => {
  const ema12 = calculateEMA(prices, 12)
  const ema26 = calculateEMA(prices, 26)

  if (ema12.length === 0 || ema26.length === 0) {
    return { macd: [], signal: [], histogram: [] }
  }

  const macdLine: number[] = []
  const minLength = Math.min(ema12.length, ema26.length)

  // Calculate MACD line
  for (let i = 0; i < minLength; i++) {
    const ema12Index = ema12.length - minLength + i
    const ema26Index = ema26.length - minLength + i
    macdLine.push(ema12[ema12Index] - ema26[ema26Index])
  }

  const signalLine = calculateEMA(macdLine, 9)
  const histogram: number[] = []

  // Calculate histogram
  const signalStartIndex = Math.max(0, macdLine.length - signalLine.length)
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[signalStartIndex + i] - signalLine[i])
  }

  return { macd: macdLine, signal: signalLine, histogram }
}
