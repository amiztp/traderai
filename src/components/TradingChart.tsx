import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, UTCTimestamp, IPriceLine, SeriesMarker, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';

interface TradingChartProps {
  data: CandlestickData[];
  drawings?: any[];
  predictedData?: CandlestickData[];
}

export const TradingChart: React.FC<TradingChartProps> = ({ data, drawings, predictedData }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const predictionSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      autoSize: true,
      layout: {
        background: { color: '#141414' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
        autoScale: true,
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
        timeVisible: true,
        secondsVisible: true,
        rightOffset: 50, // More whitespace for predictions
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const predictionSeries = chart.addSeries(CandlestickSeries, {
      upColor: 'rgba(38, 166, 154, 0.5)',
      downColor: 'rgba(239, 83, 80, 0.5)',
      borderVisible: false,
      wickUpColor: 'rgba(38, 166, 154, 0.5)',
      wickDownColor: 'rgba(239, 83, 80, 0.5)',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // set as an overlay
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    predictionSeriesRef.current = predictionSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      predictionSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // Helper to get markers from drawings
  const getMarkers = (drawings: any[]): SeriesMarker<UTCTimestamp>[] => {
    const markers: SeriesMarker<UTCTimestamp>[] = [];
    drawings.forEach(drawing => {
      if (drawing.type === 'candle_pattern') {
        if (!drawing.points || drawing.points.length === 0) return;
        const point = drawing.points[0];
        const sentiment = drawing.metadata?.sentiment || 'bullish';
        
        // Normalize time
        let t = point.time;
        let time = typeof t === 'string' ? parseInt(t) : t;
        if (time > 1000000000000) time = Math.floor(time / 1000);
        const normalizedTime = Math.floor(time);

        markers.push({
          time: normalizedTime as UTCTimestamp,
          position: sentiment === 'bullish' ? 'belowBar' : 'aboveBar',
          color: drawing.color || (sentiment === 'bullish' ? '#26a69a' : '#ef5350'),
          shape: sentiment === 'bullish' ? 'arrowUp' : 'arrowDown',
          text: drawing.label,
          size: 2,
        });
      }
    });
    return markers.sort((a, b) => (a.time as number) - (b.time as number));
  };

  useEffect(() => {
    if (candlestickSeriesRef.current && data.length > 0) {
      try {
        candlestickSeriesRef.current.setData(data);
        
        // Re-apply markers if they exist
        if (drawings && drawings.length > 0) {
          const markers = getMarkers(drawings);
          if (markers.length > 0 && typeof candlestickSeriesRef.current.setMarkers === 'function') {
            candlestickSeriesRef.current.setMarkers(markers);
          }
        }
      } catch (err) {
        console.error('Error updating candlestick data:', err);
      }
      
      if (volumeSeriesRef.current) {
        try {
          const volumeData = data.map((d: any) => ({
            time: d.time,
            value: d.volume || 0,
            color: d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
          }));
          volumeSeriesRef.current.setData(volumeData);
        } catch (err) {
          console.error('Error updating volume data:', err);
        }
      }
    }
  }, [data]);

  // Handle predicted data
  useEffect(() => {
    if (predictionSeriesRef.current) {
      if (predictedData && predictedData.length > 0) {
        try {
          // Ensure predicted data time is in seconds
          const formattedPredicted = predictedData.map(d => ({
            ...d,
            time: (typeof d.time === 'string' ? parseInt(d.time) : d.time) > 1000000000000 
              ? Math.floor((typeof d.time === 'string' ? parseInt(d.time) : d.time) / 1000) 
              : d.time
          }));
          predictionSeriesRef.current.setData(formattedPredicted);
        } catch (err) {
          console.error('Error updating prediction data:', err);
        }
      } else {
        try {
          predictionSeriesRef.current.setData([]);
        } catch (e) {}
      }
    }
  }, [predictedData]);

  // Handle AI drawings
  useEffect(() => {
    if (!chartRef.current || !drawings || drawings.length === 0) {
      if (candlestickSeriesRef.current && typeof candlestickSeriesRef.current.setMarkers === 'function') {
        try {
          candlestickSeriesRef.current.setMarkers([]);
        } catch (e) {}
      }
      return;
    }
    
    console.log(`Rendering ${drawings.length} AI drawings`);
    const chart = chartRef.current;
    const addedSeries: ISeriesApi<any>[] = [];
    const addedPriceLines: any[] = [];
    const markers: SeriesMarker<UTCTimestamp>[] = [];

    drawings.forEach((drawing, index) => {
      try {
        const color = drawing.color || (drawing.type.includes('support') || drawing.type === 'order_block' || drawing.type === 'liquidity_zone' ? '#26a69a' : '#ef5350');
        
        // Helper to normalize timestamps (handle seconds vs milliseconds)
        const normalizeTime = (t: any): number => {
          let time = typeof t === 'string' ? parseInt(t) : t;
          if (time > 1000000000000) return Math.floor(time / 1000); // Convert ms to s
          return Math.floor(time);
        };

        if (drawing.type === 'candle_pattern' || drawing.type === 'buy_signal' || drawing.type === 'sell_signal') {
          if (!drawing.points || drawing.points.length === 0) return;
          const point = drawing.points[0];
          const sentiment = drawing.metadata?.sentiment || (drawing.type === 'buy_signal' ? 'bullish' : drawing.type === 'sell_signal' ? 'bearish' : 'neutral');
          
          markers.push({
            time: normalizeTime(point.time) as UTCTimestamp,
            position: sentiment === 'bullish' ? 'belowBar' : 'aboveBar',
            color: color,
            shape: sentiment === 'bullish' ? 'arrowUp' : 'arrowDown',
            text: drawing.label,
            size: 2,
          });
        } else if (drawing.type === 'text' || drawing.type === 'label') {
          if (!drawing.points || drawing.points.length === 0) return;
          const point = drawing.points[0];
          markers.push({
            time: normalizeTime(point.time) as UTCTimestamp,
            position: 'aboveBar',
            color: color,
            shape: 'circle',
            text: drawing.label,
            size: 1,
          });
        } else if (drawing.type === 'support' || drawing.type === 'resistance' || drawing.type === 'horizontal_level' || drawing.type === 'liquidity_zone') {
          if (!drawing.points || drawing.points.length === 0) return;
          const price = drawing.points[0].price;
          if (typeof price !== 'number' || isNaN(price)) return;
          
          const priceLine = candlestickSeriesRef.current?.createPriceLine({
            price: price,
            color: color,
            lineWidth: 2,
            lineStyle: drawing.type === 'horizontal_level' ? 0 : 2,
            axisLabelVisible: true,
            title: drawing.label,
          });
          if (priceLine) addedPriceLines.push(priceLine);
        } else if (['trendline', 'channel', 'fib_retracement', 'fib_extension', 'fib_fan', 'pitchfork', 'regression_channel', 'speed_lines', 'gann_fan', 'parallel_lines', 'vwap', 'moving_average', 'bollinger_bands', 'bos', 'choch', 'xabcd', 'cypher', 'head_and_shoulders', 'abcd', 'triangle_pattern', 'three_drives', 'trend_angle'].includes(drawing.type)) {
          if (!drawing.points || drawing.points.length === 0) return;
          const validPoints = drawing.points.filter((p: any) => (typeof p.time === 'number' || typeof p.time === 'string') && typeof p.price === 'number' && !isNaN(p.price));
          if (validPoints.length === 0) return;

          const lineSeries = chart.addSeries(LineSeries, {
            color: color,
            lineWidth: drawing.type.includes('moving_average') ? 1 : 2,
            title: drawing.label,
            lineStyle: ['fib_retracement', 'trend_angle'].includes(drawing.type) ? 2 : 0,
          });

          // For harmonic patterns, we might want to connect points in a specific order
          // X-A-B-C-D for XABCD
          // A-B-C-D for ABCD
          // Left Shoulder - Head - Right Shoulder for H&S
          const sortedPoints = drawing.type === 'trendline' || drawing.type.includes('average') 
            ? [...validPoints].sort((a, b) => normalizeTime(a.time) - normalizeTime(b.time))
            : validPoints;

          lineSeries.setData(sortedPoints.map((p: any) => ({
            time: normalizeTime(p.time) as UTCTimestamp,
            value: p.price,
          })));
          addedSeries.push(lineSeries);

          // Add markers for key points in harmonic patterns
          if (['xabcd', 'cypher', 'abcd', 'three_drives', 'head_and_shoulders'].includes(drawing.type)) {
            const labels = drawing.type === 'xabcd' || drawing.type === 'cypher' ? ['X', 'A', 'B', 'C', 'D'] :
                           drawing.type === 'abcd' ? ['A', 'B', 'C', 'D'] :
                           drawing.type === 'head_and_shoulders' ? ['LS', 'H', 'RS'] :
                           ['1', '2', '3'];
            
            validPoints.forEach((p, i) => {
              if (i < labels.length) {
                markers.push({
                  time: normalizeTime(p.time) as UTCTimestamp,
                  position: 'inBar',
                  color: color,
                  shape: 'circle',
                  text: labels[i],
                  size: 1,
                });
              }
            });
          }
        } else if (['rectangle', 'order_block', 'fvg', 'gann_box'].includes(drawing.type)) {
          const validPoints = drawing.points?.filter((p: any) => (typeof p.time === 'number' || typeof p.time === 'string') && typeof p.price === 'number' && !isNaN(p.price)) || [];
          if (validPoints.length >= 2) {
            const sortedPoints = [...validPoints].sort((a, b) => normalizeTime(a.time) - normalizeTime(b.time));
            const startTime = normalizeTime(sortedPoints[0].time);
            const endTime = normalizeTime(sortedPoints[sortedPoints.length - 1].time);
            const topPrice = Math.max(...validPoints.map(p => p.price));
            const bottomPrice = Math.min(...validPoints.map(p => p.price));

            const topSeries = chart.addSeries(LineSeries, {
              color: color,
              lineWidth: 1,
              title: drawing.label,
            });
            topSeries.setData([
              { time: startTime as UTCTimestamp, value: topPrice },
              { time: endTime as UTCTimestamp, value: topPrice },
            ]);
            addedSeries.push(topSeries);

            const bottomSeries = chart.addSeries(LineSeries, {
              color: color,
              lineWidth: 1,
            });
            bottomSeries.setData([
              { time: startTime as UTCTimestamp, value: bottomPrice },
              { time: endTime as UTCTimestamp, value: bottomPrice },
            ]);
            addedSeries.push(bottomSeries);
          }
        }
      } catch (err) {
        console.error(`Error adding drawing ${index}:`, err);
      }
    });

    if (markers.length > 0) {
      console.log(`Setting ${markers.length} markers`);
      if (candlestickSeriesRef.current && typeof candlestickSeriesRef.current.setMarkers === 'function') {
        try {
          candlestickSeriesRef.current.setMarkers(markers.sort((a, b) => (a.time as number) - (b.time as number)));
        } catch (e) {
          console.error('Failed to set markers:', e);
        }
      }
    }

    return () => {
      console.log('Cleaning up drawings');
      const currentChart = chartRef.current;
      const currentCandleSeries = candlestickSeriesRef.current;

      addedSeries.forEach(s => {
        try {
          if (currentChart) currentChart.removeSeries(s);
        } catch (e) {}
      });
      addedPriceLines.forEach(pl => {
        try {
          if (currentCandleSeries) currentCandleSeries.removePriceLine(pl);
        } catch (e) {}
      });
      if (currentCandleSeries && typeof currentCandleSeries.setMarkers === 'function') {
        try {
          currentCandleSeries.setMarkers([]);
        } catch (e) {}
      }
    };
  }, [drawings]);

  return (
    <div 
      ref={chartContainerRef} 
      className="w-full" 
      style={{ height: '500px', minHeight: '500px' }}
      id="trading-chart-container" 
    />
  );
};
