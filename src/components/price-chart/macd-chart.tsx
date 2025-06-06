/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type HistogramData,
  ColorType,
  Time,
} from "lightweight-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CandleData } from "@/types/chart-types"
import { calculateMACD } from "@/lib/technical-analysis"

interface MACDChartProps {
  data: CandleData[]
  isVisible: boolean
}

export function MACDChart({ data, isVisible }: MACDChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const macdSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const signalSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const histogramSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)

  const [hoverData, setHoverData] = useState<{
    time: string
    macd: number
    signal: number
    histogram: number
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
      height: 200,
      grid: {
        vertLines: { color: "#f0f0f0" },
        horzLines: { color: "#f0f0f0" },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: "#cccccc",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
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
      if (
        !param.point ||
        !param.time ||
        !macdSeriesRef.current ||
        !signalSeriesRef.current ||
        !histogramSeriesRef.current
      ) {
        setHoverData(null)
        return
      }

      const macdData = param.seriesData.get(macdSeriesRef.current) as LineData
      const signalData = param.seriesData.get(signalSeriesRef.current) as LineData
      const histogramData = param.seriesData.get(histogramSeriesRef.current) as HistogramData

      if (macdData && signalData && histogramData && chartContainerRef.current) {
        const rect = chartContainerRef.current.getBoundingClientRect()
        const time = new Date((param.time as number) * 1000).toLocaleString()

        setPopoverPosition({
          x: rect.left + param.point.x,
          y: rect.top + param.point.y,
        })

        setHoverData({
          time,
          macd: macdData.value as number,
          signal: signalData.value as number,
          histogram: histogramData.value as number,
          show: true,
        })
      }
    })

    // MACD line
    const macdSeries = chart.addLineSeries({
      color: "#2196f3",
      lineWidth: 2,
      title: "MACD",
    })
    macdSeriesRef.current = macdSeries

    // Signal line
    const signalSeries = chart.addLineSeries({
      color: "#ff9800",
      lineWidth: 2,
      title: "Signal",
    })
    signalSeriesRef.current = signalSeries

    // Histogram
    const histogramSeries = chart.addHistogramSeries({
      color: "#9c27b0",
      title: "Histogram",
    })
    histogramSeriesRef.current = histogramSeries

    return chart
  }, [])

  const updateMACDData = useCallback((candleData: CandleData[]) => {
    if (!macdSeriesRef.current || !signalSeriesRef.current || !histogramSeriesRef.current || candleData.length === 0)
      return

    const closePrices = candleData.map((item) => item.close)
    const macdData = calculateMACD(closePrices)

    if (macdData.macd.length > 0) {
      // MACD line
      const startIndex = candleData.length - macdData.macd.length
      const macdLineData: LineData[] = macdData.macd.map((value: any, index: number) => ({
        time: (typeof candleData[startIndex + index].time === "number"
          ? candleData[startIndex + index].time
          : Math.floor(new Date(candleData[startIndex + index].time).getTime() / 1000)) as Time,
        value,
      }))
      macdSeriesRef.current.setData(macdLineData)

      // Signal line
      if (macdData.signal.length > 0) {
        const signalStartIndex = candleData.length - macdData.signal.length
        const signalLineData: LineData[] = macdData.signal.map((value: any, index: number) => ({
          time: (typeof candleData[signalStartIndex + index].time === "number"
            ? candleData[signalStartIndex + index].time
            : Math.floor(new Date(candleData[signalStartIndex + index].time).getTime() / 1000)) as Time,
          value,
        }))
        signalSeriesRef.current.setData(signalLineData)
      }

      // Histogram
      if (macdData.histogram.length > 0) {
        const histogramStartIndex = candleData.length - macdData.histogram.length
        const histogramData: HistogramData[] = macdData.histogram.map((value: number, index: number) => ({
          time: (typeof candleData[histogramStartIndex + index].time === "number"
            ? candleData[histogramStartIndex + index].time
            : Math.floor(new Date(candleData[histogramStartIndex + index].time).getTime() / 1000)) as Time,
          value,
          color: value >= 0 ? "#26a69a" : "#ef5350",
        }))
        histogramSeriesRef.current.setData(histogramData)
      }
    }
  }, [])

  // Initialize chart
  useEffect(() => {
    if (!isVisible) return

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
  }, [initChart, isVisible])

  // Update data when props change
  useEffect(() => {
    if (isVisible) {
      updateMACDData(data)
    }
  }, [data, isVisible, updateMACDData])

  if (!isVisible) return null

  return (
    <>
      <Card className="gap-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">MACD</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div ref={chartContainerRef} className="w-full h-[200px]" />
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
          <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[180px]">
            <div className="text-xs text-muted-foreground mb-2">{hoverData.time}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="font-medium">MACD</div>
                <div className="text-muted-foreground">{hoverData.macd.toFixed(4)}</div>
              </div>
              <div>
                <div className="font-medium">Signal</div>
                <div className="text-muted-foreground">{hoverData.signal.toFixed(4)}</div>
              </div>
              <div>
                <div className="font-medium">Histogram</div>
                <div className={hoverData.histogram >= 0 ? "text-green-500" : "text-red-500"}>
                  {hoverData.histogram.toFixed(4)}
                </div>
              </div>
              <div>
                <div className="font-medium">Trend</div>
                <div className={hoverData.histogram >= 0 ? "text-green-500" : "text-red-500"}>
                  {hoverData.histogram >= 0 ? "Bullish" : "Bearish"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
