import { Candle } from './binance';

export interface Pivot {
  time: number;
  price: number;
  type: 'high' | 'low';
  index: number;
}

export interface Level {
  price: number;
  strength: number;
}

export interface Trendline {
  p1: { time: number; price: number };
  p2: { time: number; price: number };
  type: 'up' | 'down';
}

export interface Zone {
  top: number;
  bottom: number;
  type: 'supply' | 'demand';
  time: number;
}

export interface Pattern {
  time: number;
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
}

export function findPivots(candles: Candle[], left: number = 5, right: number = 5): Pivot[] {
  const pivots: Pivot[] = [];
  for (let i = left; i < candles.length - right; i++) {
    const current = candles[i];
    let isHigh = true;
    let isLow = true;

    for (let j = 1; j <= left; j++) {
      if (candles[i - j].high >= current.high) isHigh = false;
      if (candles[i - j].low <= current.low) isLow = false;
    }
    for (let j = 1; j <= right; j++) {
      if (candles[i + j].high >= current.high) isHigh = false;
      if (candles[i + j].low <= current.low) isLow = false;
    }

    if (isHigh) pivots.push({ time: current.time, price: current.high, type: 'high', index: i });
    if (isLow) pivots.push({ time: current.time, price: current.low, type: 'low', index: i });
  }
  return pivots;
}

export function findSupportResistance(pivots: Pivot[], threshold: number = 0.005): Level[] {
  const levels: Level[] = [];
  pivots.forEach(p => {
    const existing = levels.find(l => Math.abs(l.price - p.price) / p.price < threshold);
    if (existing) {
      existing.strength++;
    } else {
      levels.push({ price: p.price, strength: 1 });
    }
  });
  return levels.filter(l => l.strength >= 2).sort((a, b) => b.strength - a.strength);
}

export function findTrendlines(pivots: Pivot[]): Trendline[] {
  const trendlines: Trendline[] = [];
  const highs = pivots.filter(p => p.type === 'high');
  const lows = pivots.filter(p => p.type === 'low');

  // Simple: Connect last two significant highs/lows
  if (highs.length >= 2) {
    const p1 = highs[highs.length - 2];
    const p2 = highs[highs.length - 1];
    trendlines.push({ p1: { time: p1.time, price: p1.price }, p2: { time: p2.time, price: p2.price }, type: 'down' });
  }
  if (lows.length >= 2) {
    const p1 = lows[lows.length - 2];
    const p2 = lows[lows.length - 1];
    trendlines.push({ p1: { time: p1.time, price: p1.price }, p2: { time: p2.time, price: p2.price }, type: 'up' });
  }
  return trendlines;
}

export function findSupplyDemand(candles: Candle[]): Zone[] {
  const zones: Zone[] = [];
  for (let i = 2; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const next = candles[i + 1];

    const bodySize = Math.abs(curr.close - curr.open);
    const range = curr.high - curr.low;
    const isBase = bodySize < range * 0.4; // Small body relative to range

    if (isBase) {
      const nextMove = next.close - next.open;
      const nextMoveSize = Math.abs(nextMove);
      if (nextMoveSize > bodySize * 2) {
        if (nextMove > 0) {
          zones.push({ top: curr.high, bottom: curr.low, type: 'demand', time: curr.time });
        } else {
          zones.push({ top: curr.high, bottom: curr.low, type: 'supply', time: curr.time });
        }
      }
    }
  }
  return zones.slice(-5); // Only last 5 zones
}

export function findLiquidity(pivots: Pivot[], currentPrice: number): Pivot[] {
  // Untouched pivots near current price
  return pivots.filter(p => {
    if (p.type === 'high' && p.price > currentPrice) return true;
    if (p.type === 'low' && p.price < currentPrice) return true;
    return false;
  }).slice(-10);
}

export function findCandlePatterns(candles: Candle[]): Pattern[] {
  const patterns: Pattern[] = [];
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];

    // Bullish Engulfing
    if (prev.close < prev.open && curr.close > curr.open && curr.open < prev.close && curr.close > prev.open) {
      patterns.push({ time: curr.time, name: 'Bullish Engulfing', type: 'bullish' });
    }
    // Bearish Engulfing
    if (prev.close > prev.open && curr.close < curr.open && curr.open > prev.close && curr.close < prev.open) {
      patterns.push({ time: curr.time, name: 'Bearish Engulfing', type: 'bearish' });
    }
    // Hammer
    const body = Math.abs(curr.close - curr.open);
    const lowerWick = Math.min(curr.open, curr.close) - curr.low;
    const upperWick = curr.high - Math.max(curr.open, curr.close);
    const totalRange = curr.high - curr.low;
    
    if (lowerWick > body * 2 && upperWick < body * 0.5 && totalRange > 0) {
      patterns.push({ time: curr.time, name: 'Hammer', type: 'bullish' });
    }
    // Shooting Star
    if (upperWick > body * 2 && lowerWick < body * 0.5 && totalRange > 0) {
      patterns.push({ time: curr.time, name: 'Shooting Star', type: 'bearish' });
    }
    // Morning Star
    if (i >= 2) {
      const pprev = candles[i - 2];
      const prev = candles[i - 1];
      const curr = candles[i];
      if (pprev.close < pprev.open && Math.abs(prev.close - prev.open) < (pprev.open - pprev.close) * 0.3 && curr.close > curr.open && curr.close > (pprev.open + pprev.close) / 2) {
        patterns.push({ time: curr.time, name: 'Morning Star', type: 'bullish' });
      }
    }
    // Evening Star
    if (i >= 2) {
      const pprev = candles[i - 2];
      const prev = candles[i - 1];
      const curr = candles[i];
      if (pprev.close > pprev.open && Math.abs(prev.close - prev.open) < (pprev.close - pprev.open) * 0.3 && curr.close < curr.open && curr.close < (pprev.open + pprev.close) / 2) {
        patterns.push({ time: curr.time, name: 'Evening Star', type: 'bearish' });
      }
    }
    // Doji
    if (body < totalRange * 0.1 && totalRange > 0) {
      patterns.push({ time: curr.time, name: 'Doji', type: 'neutral' });
    }
  }
  return patterns;
}

export function calculateFibonacci(high: number, low: number): { level: number; price: number }[] {
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const diff = high - low;
  return levels.map(l => ({
    level: l,
    price: high - (diff * l)
  }));
}
