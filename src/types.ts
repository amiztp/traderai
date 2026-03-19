export interface OHLCV {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PivotPoint {
  time: string;
  price: number;
  type: 'high' | 'low';
}

export interface Trendline {
  p1: { time: string; price: number };
  p2: { time: string; price: number };
  color: string;
}

export interface SupportResistance {
  price: number;
  strength: number;
  type: 'support' | 'resistance';
}

export interface OrderBlock {
  time: string;
  high: number;
  low: number;
  type: 'bullish' | 'bearish';
  mitigated: boolean;
}

export interface MarketStructure {
  time: string;
  price: number;
  type: 'BOS' | 'CHOCH';
  direction: 'up' | 'down';
}

export interface VolumeProfileBar {
  price: number;
  volume: number;
}

export interface AnalysisResult {
  summary: string;
  trend: 'Bullish' | 'Bearish' | 'Neutral';
  prediction: string;
  levels: {
    support: number[];
    resistance: number[];
  };
  confidence: number;
}
