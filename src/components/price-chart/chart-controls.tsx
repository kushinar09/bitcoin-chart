"use client"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react"
import type { TechnicalIndicators, PriceComparison } from "@/types/chart-types"

const TIMEFRAMES = [
  { value: "1m", label: "1m" },
  { value: "3m", label: "3m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "30m", label: "30m" },
  { value: "1h", label: "1h" },
  { value: "2h", label: "2h" },
  { value: "4h", label: "4h" },
  { value: "6h", label: "6h" },
  { value: "8h", label: "8h" },
  { value: "12h", label: "12h" },
  { value: "1d", label: "1d" },
  { value: "3d", label: "3d" },
  { value: "1w", label: "1w" },
  { value: "1M", label: "1M" },
]

interface ChartControlsProps {
  timeframe: string
  indicators: TechnicalIndicators
  priceComparison: PriceComparison | null
  onTimeframeChange: (timeframe: string) => void
  onIndicatorToggle: (indicator: keyof TechnicalIndicators) => void
  onPriceComparisonRefresh: () => void
}

export function ChartControls({
  timeframe,
  indicators,
  priceComparison,
  onTimeframeChange,
  onIndicatorToggle,
  onPriceComparisonRefresh,
}: ChartControlsProps) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  })

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">Bitcoin Chart</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={timeframe} onValueChange={onTimeframeChange}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAMES.map((tf) => (
                <SelectItem key={tf.value} value={tf.value}>
                  {tf.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={onPriceComparisonRefresh} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-1" />
            Compare
          </Button>
        </div>
      </div>

      {/* Price Comparison */}
      {priceComparison && (
        <div className="p-3 bg-muted/50 rounded-md">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Current</div>
              <div className="font-medium">{formatter.format(priceComparison.current)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">1min Ago</div>
              <div className="font-medium">{formatter.format(priceComparison.oneMinuteAgo)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Difference</div>
              <div className={`font-medium ${priceComparison.difference >= 0 ? "text-green-600" : "text-red-600"}`}>
                {priceComparison.difference >= 0 ? "+" : ""}
                {formatter.format(priceComparison.difference)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Change %</div>
              <div
                className={`font-medium flex items-center ${priceComparison.percentChange >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {priceComparison.percentChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {priceComparison.percentChange.toFixed(3)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technical Indicators Controls */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <Switch id="ema" checked={indicators.ema} onCheckedChange={() => onIndicatorToggle("ema")} />
            <label htmlFor="ema" className="text-sm">
              EMA(20)
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="sma" checked={indicators.sma} onCheckedChange={() => onIndicatorToggle("sma")} />
            <label htmlFor="sma" className="text-sm">
              SMA(20)
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="rsi" checked={indicators.rsi} onCheckedChange={() => onIndicatorToggle("rsi")} />
            <label htmlFor="rsi" className="text-sm">
              RSI(14)
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="macd" checked={indicators.macd} onCheckedChange={() => onIndicatorToggle("macd")} />
            <label htmlFor="macd" className="text-sm">
              MACD
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
