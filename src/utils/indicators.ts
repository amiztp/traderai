import { OHLCV, PivotPoint, OrderBlock, MarketStructure, VolumeProfileBar } from '../types';

export function calculatePivots(data: OHLCV[], period: number = 5): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  for (let i = period; i < data.length - period; i++) {
    const current = data[i];
    const left = data.slice(i - period, i);
    const right = data.slice(i + 1, i + period + 1);

    const isHigh = left.every(p => p.high < current.high) && right.every(p => p.high < current.high);
    const isLow = left.every(p => p.low > current.low) && right.every(p => p.low > current.low);

    if (isHigh) pivots.push({ time: current.time, price: current.high, type: 'high' });
    if (isLow) pivots.push({ time: current.time, price: current.low, type: 'low' });
  }
  return pivots;
}

export function calculateVWAP(data: OHLCV[]): { time: string; value: number }[] {
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;
  return data.map(d => {
    const tp = (d.high + d.low + d.close) / 3;
    cumulativeTPV += tp * d.volume;
    cumulativeVolume += d.volume;
    return { time: d.time, value: cumulativeTPV / cumulativeVolume };
  });
}

export function calculateVolumeProfile(data: OHLCV[], bins: number = 20): VolumeProfileBar[] {
  const min = Math.min(...data.map(d => d.low));
  const max = Math.max(...data.map(d => d.high));
  const step = (max - min) / bins;
  const profile: VolumeProfileBar[] = Array.from({ length: bins }, (_, i) => ({
    price: min + i * step,
    volume: 0,
  }));

  data.forEach(d => {
    const binIndex = Math.floor((d.close - min) / step);
    if (binIndex >= 0 && binIndex < bins) {
      profile[binIndex].volume += d.volume;
    }
  });

  return profile;
}

export function calculateSMC(data: OHLCV[]): { orderBlocks: OrderBlock[]; structure: MarketStructure[] } {
  const pivots = calculatePivots(data, 5);
  const orderBlocks: OrderBlock[] = [];
  const structure: MarketStructure[] = [];
  
  let lastHigh = pivots.find(p => p.type === 'high');
  let lastLow = pivots.find(p => p.type === 'low');
  let trend: 'up' | 'down' | null = null;

  for (let i = 1; i < data.length; i++) {
    const current = data[i];
    const prev = data[i - 1];

    // BOS / CHOCH Logic (Simplified)
    if (lastHigh && current.close > lastHigh.price) {
      const type = trend === 'down' ? 'CHOCH' : 'BOS';
      structure.push({ time: current.time, price: lastHigh.price, type, direction: 'up' });
      trend = 'up';
      
      // Order Block: Last bearish candle before the move
      const obCandle = data.slice(Math.max(0, i - 5), i).reverse().find(c => c.close < c.open);
      if (obCandle) {
        orderBlocks.push({ time: obCandle.time, high: obCandle.high, low: obCandle.low, type: 'bullish', mitigated: false });
      }
      
      lastHigh = pivots.find(p => p.type === 'high' && p.time === current.time) || lastHigh;
    } else if (lastLow && current.close < lastLow.price) {
      const type = trend === 'up' ? 'CHOCH' : 'BOS';
      structure.push({ time: current.time, price: lastLow.price, type, direction: 'down' });
      trend = 'down';

      // Order Block: Last bullish candle before the move
      const obCandle = data.slice(Math.max(0, i - 5), i).reverse().find(c => c.close > c.open);
      if (obCandle) {
        orderBlocks.push({ time: obCandle.time, high: obCandle.high, low: obCandle.low, type: 'bearish', mitigated: false });
      }

      lastLow = pivots.find(p => p.type === 'low' && p.time === current.time) || lastLow;
    }
  }

  return { orderBlocks, structure };
}

export function calculateFibonacci(data: OHLCV[]): { levels: { label: string; price: number }[] } {
  const high = Math.max(...data.map(d => d.high));
  const low = Math.min(...data.map(d => d.low));
  const diff = high - low;

  return {
    levels: [
      { label: '0.0', price: high },
      { label: '0.236', price: high - diff * 0.236 },
      { label: '0.382', price: high - diff * 0.382 },
      { label: '0.5', price: high - diff * 0.5 },
      { label: '0.618', price: high - diff * 0.618 },
      { label: '0.786', price: high - diff * 0.786 },
      { label: '1.0', price: low },
    ],
  };
}
