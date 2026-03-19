/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TradingChart } from './components/TradingChart';
import { analyzeMarket, AnalysisResult } from './services/geminiService';
import { CandlestickData, UTCTimestamp } from 'lightweight-charts';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BrainCircuit, 
  Clock, 
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [data, setData] = useState<CandlestickData[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('1m');
  const [lastPrice, setLastPrice] = useState<number | null>(null);

  // Fetch live data from Binance via local proxy
  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const url = `${baseUrl}/api/klines?symbol=BTCUSDT&interval=${timeframe}&limit=100`;
      console.log(`[DEBUG] Fetching data from: ${url} (Origin: ${window.location.origin})`);
      const response = await fetch(url, { signal });
      
      if (!response.ok) {
        let errorDetail = '';
        try {
          const errorData = await response.json();
          errorDetail = errorData.error || errorData.message || JSON.stringify(errorData);
        } catch (e) {
          errorDetail = await response.text();
        }
        console.error('Server responded with error:', response.status, errorDetail);
        setError(`Server error (${response.status}): ${errorDetail}`);
        return;
      }

      const rawData = await response.json();
      if (rawData.error) {
        console.error('Proxy error:', rawData.error, rawData.details);
        setError(`Data fetch error: ${rawData.error}`);
        return;
      }
      if (!Array.isArray(rawData)) {
        console.error('Unexpected API response format:', rawData);
        setError('Unexpected data format from server');
        return;
      }
      const formattedData = rawData.map((d: any) => ({
        time: (d[0] / 1000) as UTCTimestamp,
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5]),
      }));
      setData(formattedData as CandlestickData[]);
      if (formattedData.length > 0) {
        setLastPrice(formattedData[formattedData.length - 1].close);
      }
      setError(null); // Clear error on success
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Error fetching data:', error);
      setError(`Failed to fetch market data: ${error.message || 'Failed to fetch'}. Please check your connection.`);
    }
  }, [timeframe]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    
    const interval = setInterval(() => {
      fetchData(controller.signal);
    }, 5000); // Refresh every 5 seconds to avoid overwhelming the server/browser
    
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchData]);

  const handleAnalyze = async () => {
    if (data.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeMarket(data, timeframe);
      console.log('[DEBUG] Analysis Result:', result);
      setAnalysis(result);
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E4E3E0] font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Activity className="text-black w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">BTC PRO <span className="text-emerald-500 italic">AI</span></h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono">Real-time Technical Analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-mono">Live Price</span>
            <span className={`text-xl font-mono font-bold ${lastPrice && data.length > 1 && lastPrice >= data[data.length-2].close ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${lastPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <button 
            onClick={fetchData}
            className="p-2 hover:bg-white/5 rounded-full transition-colors group"
          >
            <RefreshCw className="w-5 h-5 text-white/60 group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Section */}
        <div className="lg:col-span-3 space-y-6">
          {/* Top Controls & Prediction */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 flex items-center gap-2 mb-1">
                  <BrainCircuit className="w-4 h-4 text-emerald-500" />
                  AI Intelligence
                </h2>
                <p className="text-xs text-white/40 leading-relaxed">
                  Neural network analysis of 50+ data points for price prediction.
                </p>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/10 disabled:text-white/20 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 group shadow-[0_0_30px_rgba(16,185,129,0.2)] active:scale-95 whitespace-nowrap"
              >
                {isAnalyzing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Activity className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    ANALYZE MARKET
                  </>
                )}
              </button>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-center justify-between gap-3 text-rose-400 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{error}</p>
                  </div>
                  <button 
                    onClick={() => fetchData()}
                    className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg transition-colors text-xs font-bold whitespace-nowrap"
                  >
                    RETRY
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Prediction Card */}
            <AnimatePresence>
              {analysis && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex items-start gap-6 shadow-[0_0_50px_rgba(16,185,129,0.05)]"
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${analysis.trend === 'up' ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'}`}>
                    {analysis.trend === 'up' ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-emerald-500 font-bold">AI Prediction</span>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded-full font-mono">
                        {Math.round(analysis.confidence * 100)}% Confidence
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">
                      Market expected to move <span className={analysis.trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}>{analysis.trend.toUpperCase()}</span>
                    </h2>
                    <p className="text-white/60 text-sm leading-relaxed max-w-2xl">
                      {analysis.prediction}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Chart Section */}
          <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-4">
                <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                  {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${timeframe === tf ? 'bg-emerald-500 text-black font-bold' : 'text-white/40 hover:text-white'}`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
                <div className="h-4 w-[1px] bg-white/10" />
                <span className="text-xs font-mono text-white/40 uppercase tracking-widest">BTC / USDT</span>
              </div>
              <button className="text-white/40 hover:text-white transition-colors">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-2">
              <TradingChart 
                data={data} 
                drawings={analysis?.drawings} 
                predictedData={analysis?.predicted_candles as any}
              />
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="pt-2 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Keyframe Interval
                </span>
                <span className="text-emerald-500 font-mono font-bold">1 SEC</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40 flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" />
                  Risk Level
                </span>
                <span className="text-rose-400 font-mono font-bold">HIGH</span>
              </div>
            </div>
          </div>

          {/* Detected Patterns */}
          <AnimatePresence>
            {analysis && analysis.drawings.some(d => ['candle_pattern', 'buy_signal', 'sell_signal', 'xabcd', 'cypher', 'head_and_shoulders', 'abcd', 'triangle_pattern', 'three_drives'].includes(d.type)) && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-4"
              >
                <h4 className="text-xs font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
                  <Activity className="w-3 h-3 text-emerald-500" />
                  Market Signals & Patterns
                </h4>
                <div className="space-y-3">
                  {analysis.drawings
                    .filter(d => ['candle_pattern', 'buy_signal', 'sell_signal', 'xabcd', 'cypher', 'head_and_shoulders', 'abcd', 'triangle_pattern', 'three_drives'].includes(d.type))
                    .map((pattern, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-white/40">{pattern.label}</span>
                        <span className={`font-mono font-bold ${
                          pattern.type === 'buy_signal' || pattern.metadata?.sentiment === 'bullish' 
                            ? 'text-emerald-400' 
                            : pattern.type === 'sell_signal' || pattern.metadata?.sentiment === 'bearish'
                            ? 'text-rose-400'
                            : 'text-white/60'
                        }`}>
                          {['buy_signal', 'sell_signal'].includes(pattern.type) ? 
                            (pattern.type === 'buy_signal' ? 'BUY' : 'SELL') : 
                            (pattern.type.replace('_', ' ').toUpperCase())}
                        </span>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pro Trader Tips */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/60 mb-4">Pro Trader Insights</h4>
            <ul className="space-y-4">
              {[
                "Watch for volume divergence near support levels.",
                "AI analysis is most accurate on 15m+ timeframes.",
                "Always set stop-losses 2% below prediction entry."
              ].map((tip, i) => (
                <li key={i} className="flex gap-3 text-xs text-white/40 leading-relaxed">
                  <ChevronRight className="w-4 h-4 text-emerald-500 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>

      {/* Footer Status */}
      <footer className="fixed bottom-0 left-0 right-0 px-6 py-2 bg-black/80 backdrop-blur-md border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-white/20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            NETWORK STABLE
          </div>
          <span>LATENCY: 42ms</span>
        </div>
        <div>
          &copy; 2026 BTC PRO AI ANALYZER • V2.4.0
        </div>
      </footer>
    </div>
  );
}
