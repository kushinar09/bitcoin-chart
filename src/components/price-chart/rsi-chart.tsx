/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { createChart, type IChartApi, type ISeriesApi, type LineData, ColorType } from "lightweight-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CandleData } from "@/types/chart-types"
import { calculateRSI } from "@/lib/technical-analysis"

interface RSIChartProps {
  data: CandleData[]
  isVisible: boolean
}

export function RSIChart({ data, isVisible }: RSIChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)

  const [hoverData, setHoverData] = useState<{
    time: string
    rsi: number
    status: string
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
      if (!param.point || !param.time || !rsiSeriesRef.current) {
        setHoverData(null)
        return
      }

      const rsiData = param.seriesData.get(rsiSeriesRef.current) as LineData

      if (rsiData && chartContainerRef.current) {
        const rect = chartContainerRef.current.getBoundingClientRect()
        const time = new Date((param.time as number) * 1000).toLocaleString()
        const rsiValue = rsiData.value as number

        let status = "Neutral"
        if (rsiValue >= 70) status = "Overbought"
        else if (rsiValue <= 30) status = "Oversold"

        setPopoverPosition({
          x: rect.left + param.point.x,
          y: rect.top + param.point.y,
        })

        setHoverData({
          time,
          rsi: rsiValue,
          status,
          show: true,
        })
      }
    })

    // RSI series
    const rsiSeries = chart.addLineSeries({
      color: "#ff6b6b",
      lineWidth: 2,
      title: "RSI(14)",
    })
    rsiSeriesRef.current = rsiSeries

    // Add horizontal lines for overbought/oversold levels
    chart
      .addLineSeries({
        color: "#ff0000",
        lineWidth: 1,
        lineStyle: 2, // dashed
        title: "Overbought (70)",
      })
      .setData([
        { time: 0 as import("lightweight-charts").Time, value: 70 },
        { time: (Date.now() / 1000) as import("lightweight-charts").Time, value: 70 },
      ])

    chart
      .addLineSeries({
        color: "#00ff00",
        lineWidth: 1,
        lineStyle: 2, // dashed
        title: "Oversold (30)",
      })
      .setData([
        { time: 0 as import("lightweight-charts").Time, value: 30 },
        { time: (Date.now() / 1000) as import("lightweight-charts").Time, value: 30 },
      ])

    return chart
  }, [])

  const updateRSIData = useCallback((candleData: CandleData[]) => {
    if (!rsiSeriesRef.current || candleData.length === 0) return

    const closePrices = candleData.map((item) => item.close)
    const rsiValues = calculateRSI(closePrices, 14)

    if (rsiValues.length > 0) {
      const rsiData: LineData[] = rsiValues.map((value: any, index: number) => ({
        time: (typeof candleData[candleData.length - rsiValues.length + index].time === "number"
          ? candleData[candleData.length - rsiValues.length + index].time
          : Math.floor(
              new Date(candleData[candleData.length - rsiValues.length + index].time).getTime() / 1000,
            )) as import("lightweight-charts").Time,
        value,
      }))
      rsiSeriesRef.current.setData(rsiData)
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
      updateRSIData(data)
    }
  }, [data, isVisible, updateRSIData])

  if (!isVisible) return null

  return (
    <>
      <Card className="gap-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">RSI (14)</CardTitle>
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
                <div className="font-medium">RSI</div>
                <div className="text-muted-foreground">{hoverData.rsi.toFixed(2)}</div>
              </div>
              <div>
                <div className="font-medium">Status</div>
                <div
                  className={
                    hoverData.status === "Overbought"
                      ? "text-red-500"
                      : hoverData.status === "Oversold"
                        ? "text-green-500"
                        : "text-muted-foreground"
                  }
                >
                  {hoverData.status}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
