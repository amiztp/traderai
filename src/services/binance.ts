export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchKlines(symbol: string = 'BTCUSDT', interval: string = '1h', limit: number = 500): Promise<Candle[]> {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch data from Binance');
    const data = await response.json();
    
    return data.map((d: any) => ({
      time: d[0] / 1000, // Convert to seconds for lightweight-charts
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[5]),
    }));
  } catch (error) {
    console.error('Error fetching klines:', error);
    return [];
  }
}
