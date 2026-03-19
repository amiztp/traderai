import { OHLCV } from '../types';

export function generateMarketData(count: number = 200): OHLCV[] {
  const data: OHLCV[] = [];
  let currentPrice = 50000;
  let currentTime = new Date();
  currentTime.setHours(0, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const volatility = currentPrice * 0.01;
    const open = currentPrice;
    const high = open + Math.random() * volatility;
    const low = open - Math.random() * volatility;
    const close = low + Math.random() * (high - low);
    const volume = Math.random() * 1000 + 500;

    const timeStr = currentTime.toISOString().split('T')[0];
    data.push({
      time: timeStr,
      open,
      high,
      low,
      close,
      volume,
    });

    currentPrice = close;
    currentTime.setDate(currentTime.getDate() + 1);
  }

  return data;
}
