'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, SeriesMarker, Time } from 'lightweight-charts';
import { Candle, TradeRecord } from '@/lib/engine/types';
import { calculateEMA } from '@/lib/engine/indicators/trend';

interface TradingViewChartProps {
  candles: Candle[];
  trades?: TradeRecord[];
  emaPeriod?: number;
  height?: number;
}

export function TradingViewChart({
  candles,
  trades = [],
  emaPeriod = 50,
  height = 420,
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean, quiet financial theme following unslop principles
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#09090b' },
        textColor: '#a1a1aa', // zinc-400
        fontSize: 11,
        fontFamily: 'ui-monospace, monospace',
      },
      grid: {
        vertLines: { color: '#18181b' }, // zinc-900
        horzLines: { color: '#18181b' },
      },
      crosshair: {
        vertLine: { color: '#3f3f46', width: 1, style: 1 },
        horzLine: { color: '#3f3f46', width: 1, style: 1 },
      },
      rightPriceScale: {
        borderColor: '#27272a',
      },
      timeScale: {
        borderColor: '#27272a',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981', // emerald-500
      downColor: '#ef4444', // red-500
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    const emaSeries = chart.addLineSeries({
      color: '#38bdf8', // sky-400
      lineWidth: 1,
      priceLineVisible: false,
      title: `EMA ${emaPeriod}`,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    emaSeriesRef.current = emaSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height, emaPeriod]);

  // Update chart data whenever candles or trades change
  useEffect(() => {
    if (!candleSeriesRef.current || !emaSeriesRef.current || candles.length === 0) return;

    // Convert candle time (ms) to lightweight-charts Time (seconds)
    const formattedData = candles.map((c) => ({
      time: Math.floor(c.time / 1000) as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeriesRef.current.setData(formattedData);

    // Calculate and set EMA
    const closes = candles.map((c) => c.close);
    const emaValues = calculateEMA(closes, emaPeriod);
    const emaData = [];
    for (let i = 0; i < candles.length; i++) {
      if (!isNaN(emaValues[i])) {
        emaData.push({
          time: Math.floor(candles[i].time / 1000) as Time,
          value: emaValues[i],
        });
      }
    }
    emaSeriesRef.current.setData(emaData);

    // Build markers for simulated trades
    const markers: SeriesMarker<Time>[] = [];
    for (const t of trades) {
      const entryTimeSec = Math.floor(t.entryTime / 1000) as Time;
      const exitTimeSec = Math.floor(t.exitTime / 1000) as Time;

      // Entry marker
      markers.push({
        time: entryTimeSec,
        position: t.direction === 'LONG' ? 'belowBar' : 'aboveBar',
        color: t.direction === 'LONG' ? '#10b981' : '#f43f5e',
        shape: t.direction === 'LONG' ? 'arrowUp' : 'arrowDown',
        text: `${t.direction} @ ${t.entryPrice.toFixed(1)}`,
      });

      // Exit marker
      const isProfit = t.pnlAmount > 0;
      markers.push({
        time: exitTimeSec,
        position: t.direction === 'LONG' ? 'aboveBar' : 'belowBar',
        color: isProfit ? '#34d399' : '#fb7185',
        shape: 'circle',
        text: `${t.exitReason} (${t.pnlAmount > 0 ? '+' : ''}${t.pnlPct.toFixed(1)}%)`,
      });
    }

    // Sort markers by time
    markers.sort((a, b) => Number(a.time) - Number(b.time));
    candleSeriesRef.current.setMarkers(markers);

    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candles, trades, emaPeriod]);

  return (
    <div className="relative border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-zinc-800/80 bg-zinc-900/40 text-xs">
        <div className="flex items-center gap-2 font-mono">
          <span className="text-zinc-200 font-medium">BingX K 線走勢圖</span>
          <span className="text-zinc-500">|</span>
          <span className="text-sky-400">EMA {emaPeriod}</span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-400">{candles.length} 根 Bars</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 多頭進場
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> 空頭進場
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> 出場點位
          </span>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full" style={{ height }} />
    </div>
  );
}
