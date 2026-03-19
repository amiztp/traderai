import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, LineData, HistogramData, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import { OHLCV, OrderBlock, MarketStructure, VolumeProfileBar } from '../types';

interface ChartProps {
  data: OHLCV[];
  vwapData: LineData[];
  orderBlocks: OrderBlock[];
  structure: MarketStructure[];
  volumeProfile: VolumeProfileBar[];
  fibLevels: { label: string; price: number }[];
  settings: {
    showVWAP: boolean;
    showOB: boolean;
    showStructure: boolean;
    showFib: boolean;
    showVolumeProfile: boolean;
  };
}

export const Chart: React.FC<ChartProps> = ({ 
  data, 
  vwapData, 
  orderBlocks, 
  structure, 
  volumeProfile, 
  fibLevels,
  settings 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const fibLinesRef = useRef<any[]>([]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#1f1f1f' },
        horzLines: { color: '#1f1f1f' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 600,
      timeScale: {
        borderColor: '#333',
        timeVisible: true,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // Overlay on main pane
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const vwapSeries = chart.addSeries(LineSeries, {
      color: '#2962FF',
      lineWidth: 2,
      title: 'VWAP',
    });

    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;
    vwapSeriesRef.current = vwapSeries;
    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !vwapSeriesRef.current) return;

    candlestickSeriesRef.current.setData(data as CandlestickData[]);
    
    const volumeData: HistogramData[] = data.map(d => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
    }));
    volumeSeriesRef.current.setData(volumeData);

    if (settings.showVWAP) {
      vwapSeriesRef.current.setData(vwapData);
    } else {
      vwapSeriesRef.current.setData([]);
    }

    // Fibonacci Levels as Price Lines
    fibLinesRef.current.forEach(line => candlestickSeriesRef.current?.removePriceLine(line));
    fibLinesRef.current = [];

    if (settings.showFib) {
      fibLevels.forEach(level => {
        const line = candlestickSeriesRef.current?.createPriceLine({
          price: level.price,
          color: 'rgba(255, 255, 255, 0.2)',
          lineWidth: 1,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: `Fib ${level.label}`,
        });
        if (line) fibLinesRef.current.push(line);
      });
    }

    // Markers for BOS/CHOCH and Order Blocks
    if (settings.showStructure || settings.showOB) {
      const markers: any[] = [];
      
      if (settings.showStructure) {
        structure.forEach(s => {
          markers.push({
            time: s.time,
            position: s.direction === 'up' ? 'aboveBar' : 'belowBar',
            color: s.type === 'BOS' ? '#FFD700' : '#FF4500',
            shape: s.direction === 'up' ? 'arrowUp' : 'arrowDown',
            text: `${s.type} (${s.direction})`,
          });
        });
      }

      if (settings.showOB) {
        orderBlocks.forEach(ob => {
          markers.push({
            time: ob.time,
            position: ob.type === 'bullish' ? 'belowBar' : 'aboveBar',
            color: ob.type === 'bullish' ? '#26a69a' : '#ef5350',
            shape: 'circle',
            text: `OB (${ob.type})`,
          });
        });
      }

      if (candlestickSeriesRef.current && (candlestickSeriesRef.current as any).setMarkers) {
        (candlestickSeriesRef.current as any).setMarkers(markers.sort((a, b) => (a.time > b.time ? 1 : -1)));
      }
    } else {
      if (candlestickSeriesRef.current && (candlestickSeriesRef.current as any).setMarkers) {
        (candlestickSeriesRef.current as any).setMarkers([]);
      }
    }

    // Order Blocks (Simplified as markers for now, rectangles are harder in lightweight-charts without extra plugins)
    // Actually, we can use custom series or just more markers.
    // Let's use markers for OBs too if we want to keep it simple, or just draw lines.
  }, [data, vwapData, structure, settings]);

  return (
    <div className="relative w-full h-full bg-[#0a0a0a] rounded-xl overflow-hidden border border-[#1f1f1f]">
      <div ref={chartContainerRef} className="w-full h-full" />
      
      {/* Fibonacci Overlay (SVG) */}
      {settings.showFib && (
        <div className="absolute inset-0 pointer-events-none opacity-40">
          {/* This is a bit tricky to sync with chart coordinates without chartRef.current.priceToCoordinate */}
          {/* For now, let's just show a legend or simple lines if we had the coordinates */}
        </div>
      )}

      {/* Volume Profile Overlay */}
      {settings.showVolumeProfile && (
        <div className="absolute top-0 right-0 h-full w-32 pointer-events-none flex flex-col justify-between py-10">
          {volumeProfile.map((bar, i) => (
            <div 
              key={i} 
              className="bg-blue-500/20 border-r border-blue-500/40 h-full"
              style={{ width: `${(bar.volume / (Math.max(...volumeProfile.map(b => b.volume)) || 1)) * 100}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
