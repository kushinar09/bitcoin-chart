/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type LineData,
  ColorType,
  Time,
} from "lightweight-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"
import type { CandleData, TechnicalIndicators } from "@/types/chart-types"
import { calculateEMA, calculateSMA } from "@/lib/technical-analysis"

interface PriceChartProps {
  data: CandleData[]
  indicators: TechnicalIndicators
  isLoading: boolean
}

export function PriceChart({ data, indicators, isLoading }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)
  const emaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)

  const [hoverData, setHoverData] = useState<{
    time: string
    open: number
    high: number
    low: number
    close: number
    volume: number
    show: boolean
  } | null>(null)

  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 })

  const initChart = useCallback(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#333",
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      grid: {
        vertLines: { color: "#f0f0f0" },
        horzLines: { color: "#f0f0f0" },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: "#cccccc",
      },
      timeScale: {
        borderColor: "#cccccc",
        timeVisible: true,
        secondsVisible: false,
      },
    })

    chartRef.current = chart

    // Configure timezone to use local time
    chart.applyOptions({
      localization: {
        timeFormatter: (time: any) => {
          const date = new Date(time * 1000)
          return date.toLocaleString()
        },
      },
    })

    // Add crosshair move handler for hover popover
    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time || !candlestickSeriesRef.current) {
        setHoverData(null)
        return
      }

      const candleData = param.seriesData.get(candlestickSeriesRef.current) as CandlestickData
      const volumeData = param.seriesData.get(volumeSeriesRef.current!) as HistogramData

      if (candleData && volumeData && chartContainerRef.current) {
        const rect = chartContainerRef.current.getBoundingClientRect()
        const time = new Date((param.time as number) * 1000).toLocaleString()

        setPopoverPosition({
          x: rect.left + param.point.x,
          y: rect.top + param.point.y,
        })

        setHoverData({
          time,
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          volume: volumeData.value,
          show: true,
        })
      }
    })

    // Candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    })
    candlestickSeriesRef.current = candlestickSeries

    // Volume series
    const volumeSeries = chart.addHistogramSeries({
      color: "#26a69a",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "volume",
    })
    volumeSeriesRef.current = volumeSeries

    // Configure volume scale
    chart.priceScale("volume").applyOptions({
      scaleMargins: {
        top: 0.7,
        bottom: 0,
      },
    })

    return chart
  }, [])

  const updateChartData = useCallback((candleData: CandleData[]) => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || candleData.length === 0) return

    const candlestickData: CandlestickData[] = candleData.map((item) => ({
      time: (typeof item.time === "number" ? item.time : Math.floor(new Date(item.time).getTime() / 1000)) as Time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }))

    const volumeData: HistogramData[] = candleData.map((item) => ({
      time: (typeof item.time === "number" ? item.time : Math.floor(new Date(item.time).getTime() / 1000)) as Time,
      value: item.volume,
      color: item.close >= item.open ? "#26a69a" : "#ef5350",
    }))

    candlestickSeriesRef.current.setData(candlestickData)
    volumeSeriesRef.current.setData(volumeData)
  }, [])

  const updateMovingAverages = useCallback(
    (candleData: CandleData[]) => {
      if (!chartRef.current || candleData.length === 0) return

      const closePrices = candleData.map((item) => item.close)

      // EMA
      if (indicators.ema) {
        if (!emaSeriesRef.current) {
          emaSeriesRef.current = chartRef.current.addLineSeries({
            color: "#4caf50",
            lineWidth: 2,
            title: "EMA(20)",
          })
        }

        const emaValues = calculateEMA(closePrices, 20)
        if (emaValues.length > 0) {
          const emaData: LineData[] = emaValues.map((value: any, index: number) => ({
            time: (typeof candleData[candleData.length - emaValues.length + index].time === "number"
              ? candleData[candleData.length - emaValues.length + index].time
              : Math.floor(
                  new Date(candleData[candleData.length - emaValues.length + index].time).getTime() / 1000,
                )) as import("lightweight-charts").Time,
            value,
          }))
          emaSeriesRef.current.setData(emaData)
        }
      } else if (emaSeriesRef.current) {
        chartRef.current.removeSeries(emaSeriesRef.current)
        emaSeriesRef.current = null
      }

      // SMA
      if (indicators.sma) {
        if (!smaSeriesRef.current) {
          smaSeriesRef.current = chartRef.current.addLineSeries({
            color: "#ff5722",
            lineWidth: 2,
            title: "SMA(20)",
          })
        }

        const smaValues = calculateSMA(closePrices, 20)
        if (smaValues.length > 0) {
          const smaData: LineData[] = smaValues.map((value: any, index: number) => ({
            time: (typeof candleData[candleData.length - smaValues.length + index].time === "number"
              ? candleData[candleData.length - smaValues.length + index].time
              : Math.floor(
                  new Date(candleData[candleData.length - smaValues.length + index].time).getTime() / 1000,
                )) as import("lightweight-charts").Time,
            value,
          }))
          smaSeriesRef.current.setData(smaData)
        }
      } else if (smaSeriesRef.current) {
        chartRef.current.removeSeries(smaSeriesRef.current)
        smaSeriesRef.current = null
      }
    },
    [indicators.ema, indicators.sma],
  )

  // Initialize chart
  useEffect(() => {
    const chart = initChart()

    const handleResize = () => {
      if (chart && chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (chart) {
        chart.remove()
      }
    }
  }, [initChart])

  // Update data when props change
  useEffect(() => {
    updateChartData(data)
    updateMovingAverages(data)
  }, [data, updateChartData, updateMovingAverages])

  return (
    <>
      <Card className="gap-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Price & Volume</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Loading chart data...</span>
                </div>
              </div>
            )}
            <div ref={chartContainerRef} className="w-full h-[400px]" />
          </div>
        </CardContent>
      </Card>

      {hoverData?.show && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: popoverPosition.x + 10,
            top: popoverPosition.y - 10,
          }}
        >
          <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[200px]">
            <div className="text-xs text-muted-foreground mb-2">{hoverData.time}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="font-medium">Open</div>
                <div className="text-muted-foreground">${hoverData.open.toFixed(2)}</div>
              </div>
              <div>
                <div className="font-medium">High</div>
                <div className="text-muted-foreground">${hoverData.high.toFixed(2)}</div>
              </div>
              <div>
                <div className="font-medium">Low</div>
                <div className="text-muted-foreground">${hoverData.low.toFixed(2)}</div>
              </div>
              <div>
                <div className="font-medium">Close</div>
                <div className="text-muted-foreground">${hoverData.close.toFixed(2)}</div>
              </div>
            </div>
            <div className="pt-2 mt-2 border-t">
              <div className="font-medium text-xs">Volume</div>
              <div className="text-muted-foreground text-xs">{hoverData.volume.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
