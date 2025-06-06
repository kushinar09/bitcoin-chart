"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  ArrowUpDown,
  Clock,
  Activity,
  Users,
  ShoppingCart,
} from "lucide-react"
import { GetLiveCandle, GetCryptoInfo, unixToDate } from "@/api/api-binance"

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})

const volumeFormatter = new Intl.NumberFormat("en-US", {
  style: "decimal",
  maximumFractionDigits: 4,
})

interface CryptoData {
  price: number
  priceChangePercent: number
  volume24h: string
  lastUpdate: string
  // Candle data
  highPrice: number
  lowPrice: number
  openPrice: number
  numTrades: number
  interval: string
  isClosed: boolean
  candleStart: string
  candleEnd: string
  // Volume data
  baseAssetVolume: string
  quoteAssetVolume: string
  takerBuyBaseVolume: string
  takerBuyQuoteVolume: string
  // Trade IDs
  firstTradeId: number
  lastTradeId: number
  // Calculated metrics
  buyerRatio: number
  priceRange: number
}

export function InfoSection() {
  const [refresh, setRefresh] = useState(false)
  const [cryptoData, setCryptoData] = useState<CryptoData>({
    price: 0,
    priceChangePercent: 0,
    volume24h: "0",
    lastUpdate: "",
    highPrice: 0,
    lowPrice: 0,
    openPrice: 0,
    numTrades: 0,
    interval: "",
    isClosed: false,
    candleStart: "",
    candleEnd: "",
    baseAssetVolume: "0",
    quoteAssetVolume: "0",
    takerBuyBaseVolume: "0",
    takerBuyQuoteVolume: "0",
    firstTradeId: 0,
    lastTradeId: 0,
    buyerRatio: 0,
    priceRange: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const socketRef = useRef<WebSocket | null>(null)
  const lastUpdateRef = useRef<number>(0)

  const coin = "BTCUSDT"
  const timeFrame = "1m"
  const UPDATE_THROTTLE = 5000

  const fetchInitialData = async () => {
    try {
      const res = await GetCryptoInfo(coin)
      const data = res.data

      setCryptoData((prev) => ({
        ...prev,
        price: Number.parseFloat(data.lastPrice),
        priceChangePercent: Number.parseFloat(data.priceChangePercent),
        volume24h: volumeFormatter.format(Number(data.volume)),
        lastUpdate: unixToDate(Date.now()),
      }))
      setIsLoading(false)
    } catch (error) {
      console.error("Failed to fetch initial data:", error)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInitialData()

    const connectWebSocket = () => {
      try {
        const socket = new WebSocket(GetLiveCandle(timeFrame, coin))
        socketRef.current = socket

        socket.onopen = () => {
          console.log("WebSocket connected")
        }

        socket.onmessage = (event) => {
          const data = JSON.parse(event.data)
          const kline = data.k

          const now = Date.now()
          if (now - lastUpdateRef.current >= UPDATE_THROTTLE) {
            // Calculate additional metrics
            const baseVolume = Number.parseFloat(kline.v)
            const takerBuyBase = Number.parseFloat(kline.V)
            const buyerRatio = baseVolume > 0 ? (takerBuyBase / baseVolume) * 100 : 0
            const high = Number.parseFloat(kline.h)
            const low = Number.parseFloat(kline.l)
            const priceRange = high > 0 && low > 0 ? ((high - low) / low) * 100 : 0

            setCryptoData((prev) => ({
              ...prev,
              // Basic price data
              price: Number.parseFloat(kline.c),
              highPrice: high,
              lowPrice: low,
              openPrice: Number.parseFloat(kline.o),

              // Candle info
              numTrades: kline.n,
              interval: kline.i,
              isClosed: kline.x,
              candleStart: unixToDate(kline.t),
              candleEnd: unixToDate(kline.T),

              // Volume data
              baseAssetVolume: volumeFormatter.format(baseVolume),
              quoteAssetVolume: volumeFormatter.format(Number.parseFloat(kline.q)),
              takerBuyBaseVolume: volumeFormatter.format(takerBuyBase),
              takerBuyQuoteVolume: volumeFormatter.format(Number.parseFloat(kline.Q)),

              // Trade IDs
              firstTradeId: kline.f,
              lastTradeId: kline.L,

              // Calculated metrics
              buyerRatio: buyerRatio,
              priceRange: priceRange,

              lastUpdate: unixToDate(now),
            }))
            lastUpdateRef.current = now
          }
        }

        socket.onerror = (error) => {
          console.error("WebSocket error:", error)
        }

        socket.onclose = () => {
          console.log("WebSocket disconnected")
          setTimeout(connectWebSocket, 5000)
        }
      } catch (error) {
        console.error("Failed to connect WebSocket:", error)
      }
    }

    connectWebSocket()

    return () => {
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [])

  const handleRefresh = async () => {
    if (refresh) return

    setRefresh(true)
    try {
      await fetchInitialData()
    } catch (error) {
      console.error("Refresh failed:", error)
    } finally {
      setTimeout(() => setRefresh(false), 1000)
    }
  }

  const isPositive = cryptoData.priceChangePercent >= 0
  const candleColor = cryptoData.price >= cryptoData.openPrice ? "text-green-500" : "text-red-500"
  const priceChange = cryptoData.price - cryptoData.openPrice
  const priceChangePercentInCandle =
    cryptoData.openPrice > 0 ? ((cryptoData.price - cryptoData.openPrice) / cryptoData.openPrice) * 100 : 0

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Current Price Card */}
      <Card className="gap-0">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-md font-bold">
            Bitcoin <span className="ml-2 text-xs text-muted-foreground">BTC/USDT</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <RefreshCw
              onClick={handleRefresh}
              className={`h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors ${
                refresh ? "animate-spin" : ""
              }`}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{formatter.format(cryptoData.price)}</div>

            {/* 24h Change */}
            <div className="flex items-center gap-2">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <Badge
                variant={isPositive ? "default" : "destructive"}
                className={isPositive ? "bg-green-500 hover:bg-green-600" : ""}
              >
                {isPositive ? "+" : ""}
                {cryptoData.priceChangePercent.toFixed(2)}%
              </Badge>
              <span className="text-xs text-muted-foreground">24h</span>
            </div>

            {/* Current candle change */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className={`h-4 w-4 ${candleColor}`} />
              <span className={`text-sm font-medium ${candleColor}`}>
                {priceChange >= 0 ? "+" : ""}
                {formatter.format(priceChange)} ({priceChangePercentInCandle >= 0 ? "+" : ""}
                {priceChangePercentInCandle.toFixed(3)}%)
              </span>
              <span className="text-xs text-muted-foreground">current candle</span>
            </div>

            <div className="text-xs text-muted-foreground">Last updated: {cryptoData.lastUpdate}</div>
          </div>
        </CardContent>
      </Card>

      {/* OHLC Data */}
      <Card className="gap-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {cryptoData.interval} Candle Data
            {cryptoData.isClosed ? (
              <Badge variant="outline" className="ml-2 bg-green-100">
                Closed
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-2 bg-yellow-100">
                In Progress
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Open</div>
              <div className="font-medium">{formatter.format(cryptoData.openPrice)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Close</div>
              <div className="font-medium">{formatter.format(cryptoData.price)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">High</div>
              <div className="font-medium text-green-600">{formatter.format(cryptoData.highPrice)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Low</div>
              <div className="font-medium text-red-600">{formatter.format(cryptoData.lowPrice)}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Price Range</span>
              </div>
              <span className="font-medium">{cryptoData.priceRange.toFixed(3)}%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Time Range</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {cryptoData.candleStart.split(" ")[1]} - {cryptoData.candleEnd.split(" ")[1]}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Activity */}
      <Card className="gap-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Trading Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Number of Trades</span>
            </div>
            <span className="font-medium">{cryptoData.numTrades.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-green-500" />
              <span className="text-sm">Buyer Ratio</span>
            </div>
            <span className="font-medium text-green-600">{cryptoData.buyerRatio.toFixed(1)}%</span>
          </div>

          <div className="text-xs text-muted-foreground">
            Trade IDs: {cryptoData.firstTradeId.toLocaleString()} - {cryptoData.lastTradeId.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {/* Volume Analysis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Volume Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Base Asset Volume (BTC)</span>
                <span className="text-sm font-medium">{cryptoData.baseAssetVolume}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Quote Asset Volume (USDT)</span>
                <span className="text-sm font-medium">{cryptoData.quoteAssetVolume}</span>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="text-xs text-muted-foreground mb-2">Taker Buy Volume</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Base (BTC)</span>
                  <span className="text-sm font-medium">{cryptoData.takerBuyBaseVolume}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Quote (USDT)</span>
                  <span className="text-sm font-medium">{cryptoData.takerBuyQuoteVolume}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 24h Market Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">24h Market Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">24h Volume</span>
            </div>
            <span className="font-medium">{cryptoData.volume24h} BTC</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
