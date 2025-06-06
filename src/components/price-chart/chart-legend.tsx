"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { BarChart3 } from "lucide-react"
import type { TechnicalIndicators } from "@/types/chart-types"

interface ChartLegendProps {
  indicators: TechnicalIndicators
}

export function ChartLegend({ indicators }: ChartLegendProps) {
  const hasIndicators = indicators.rsi || indicators.macd

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Price Chart Legend */}
          <div>
            <h4 className="text-sm font-medium mb-2">Price Chart</h4>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Bullish Candle</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Bearish Candle</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span>Volume</span>
              </div>
              {indicators.ema && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-1 bg-green-500 rounded"></div>
                    <span>EMA(20)</span>
                  </div>
                </>
              )}
              {indicators.sma && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-1 bg-orange-500 rounded"></div>
                    <span>SMA(20)</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Indicators Legend */}
          {hasIndicators && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Technical Indicators</h4>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {indicators.rsi && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-1 bg-red-400 rounded"></div>
                      <span>RSI(14)</span>
                    </div>
                  )}
                  {indicators.macd && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-1 bg-blue-500 rounded"></div>
                        <span>MACD</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-1 bg-orange-500 rounded"></div>
                        <span>Signal</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-500 rounded"></div>
                        <span>Histogram</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
