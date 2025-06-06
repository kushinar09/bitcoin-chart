/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardHeader } from "@/components/ui/card"
import { ChartControls } from "@/components/price-chart/chart-controls"
import { PriceChart } from "@/components/price-chart/price-chart"
import { RSIChart } from "@/components/price-chart/rsi-chart"
import { MACDChart } from "@/components/price-chart/macd-chart"
import { ChartLegend } from "@/components/price-chart/chart-legend"
import type { CandleData, TechnicalIndicators, PriceComparison } from "@/types/chart-types"
import { GetCandles, GetCryptoInfo, GetLiveCandle } from "@/api/api-binance"

export function Chart() {
  const socketRef = useRef<WebSocket | null>(null)
  const candleDataRef = useRef<CandleData[]>([])
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const [timeframe, setTimeframe] = useState("1m")
  const [indicators, setIndicators] = useState<TechnicalIndicators>({
    rsi: false,
    macd: false,
    ema: false,
    sma: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [priceComparison, setPriceComparison] = useState<PriceComparison | null>(null)
  const [, setCurrentPrice] = useState<number>(0)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchHistoricalData = useCallback(async (symbol: string, interval: string, limit = 500) => {
    try {
      const data = await GetCandles(interval, symbol)

      const candleData: CandleData[] = data.map((item) => ({
        time: Math.floor(item.openTime / 1000),
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
      }))

      candleDataRef.current = candleData
      return candleData
    } catch (error) {
      console.error("Error fetching historical data:", error)
      return []
    }
  }, [])

  // Get price comparison
  const getPriceComparison = useCallback(async () => {
    try {
      // Get current price
      const currentResponse = await GetCryptoInfo("BTCUSDT")
      if (!currentResponse || !currentResponse.data) {
        throw new Error("Failed to fetch crypto info")
      }

      const currentData = currentResponse.data
      const current = Number.parseFloat(currentData.price || currentData.lastPrice)

      // Get 1-minute ago price (approximate using recent klines)
      const klineData = await GetCandles("1m", "BTCUSDT")
      if (!klineData || klineData.length < 2) {
        throw new Error("Failed to fetch kline data")
      }

      const oneMinuteAgo = klineData[0].close

      const difference = current - oneMinuteAgo
      const percentChange = (difference / oneMinuteAgo) * 100

      setPriceComparison({
        current,
        oneMinuteAgo,
        difference,
        percentChange,
      })
    } catch (error) {
      console.error("Error fetching price comparison:", error)
    }
  }, [])

  const connectWebSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close()
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    // Updated Binance WebSocket URL
    const wsUrl = GetLiveCandle(timeframe, "BTCUSDT")
    console.log(`Connecting to WebSocket: ${wsUrl}`)

    try {
      const socket = new WebSocket(wsUrl)
      socketRef.current = socket

      socket.onopen = () => {
        console.log("WebSocket connected successfully")
        reconnectAttemptsRef.current = 0
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const kline = data.k

          if (kline && kline.x) {
            // Only process closed candles
            const newCandle: CandleData = {
              time: Math.floor(kline.t / 1000),
              open: Number.parseFloat(kline.o),
              high: Number.parseFloat(kline.h),
              low: Number.parseFloat(kline.l),
              close: Number.parseFloat(kline.c),
              volume: Number.parseFloat(kline.v),
            }

            // Update the data array
            const currentData = [...candleDataRef.current]
            const lastCandleIndex = currentData.findIndex((candle) => candle.time === newCandle.time)

            if (lastCandleIndex >= 0) {
              currentData[lastCandleIndex] = newCandle
            } else {
              currentData.push(newCandle)
              // Keep only last 1000 candles for performance
              if (currentData.length > 1000) {
                currentData.shift()
              }
            }

            candleDataRef.current = currentData
            setCurrentPrice(newCandle.close)
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error)
        }
      }

      socket.onerror = (error) => {
        console.error("WebSocket error:", error)
      }

      socket.onclose = (event) => {
        console.log(`WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}`)

        if (event.code !== 1000 && reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`)

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            connectWebSocket()
          }, delay)
        } else if (event.code !== 1000) {
          console.log("Max reconnection attempts reached")
        }
      }
    } catch (error) {
      console.error("Error creating WebSocket connection:", error)
    }
  }, [timeframe])

  // Handle timeframe change
  const handleTimeframeChange = useCallback(
    async (newTimeframe: string) => {
      if (newTimeframe === timeframe) return // Prevent unnecessary changes

      setTimeframe(newTimeframe)
      setIsLoading(true)

      // Close existing WebSocket connection
      if (socketRef.current) {
        socketRef.current.close(1000, "Timeframe change")
      }

      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      const data = await fetchHistoricalData("BTCUSDT", newTimeframe)
      if (data.length > 0) {
        setCurrentPrice(data[data.length - 1].close)
      }

      setIsLoading(false)
    },
    [fetchHistoricalData, timeframe],
  )

  // Handle indicator toggle
  const handleIndicatorToggle = useCallback((indicator: keyof TechnicalIndicators) => {
    setIndicators((prev) => ({
      ...prev,
      [indicator]: !prev[indicator],
    }))
  }, [])

  // Initialize data
  useEffect(() => {
    const loadInitialData = async () => {
      const data = await fetchHistoricalData("BTCUSDT", timeframe)
      if (data.length > 0) {
        setCurrentPrice(data[data.length - 1].close)
      }
      setIsLoading(false)
    }

    loadInitialData()
  }, [fetchHistoricalData, timeframe])

  // Connect WebSocket
  useEffect(() => {
    let mounted = true

    if (!isLoading && mounted) {
      connectWebSocket()
    }

    return () => {
      mounted = false
      if (socketRef.current) {
        socketRef.current.close(1000, "Component unmounting")
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [timeframe, isLoading])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <ChartControls
            timeframe={timeframe}
            indicators={indicators}
            priceComparison={priceComparison}
            onTimeframeChange={handleTimeframeChange}
            onIndicatorToggle={handleIndicatorToggle}
            onPriceComparisonRefresh={getPriceComparison}
          />
        </CardHeader>
      </Card>

      <PriceChart data={candleDataRef.current} indicators={indicators} isLoading={isLoading} />
      <RSIChart data={candleDataRef.current} isVisible={indicators.rsi} />
      <MACDChart data={candleDataRef.current} isVisible={indicators.macd} />
      <ChartLegend indicators={indicators} />
    </div>
  )
}
