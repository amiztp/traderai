import { GoogleGenAI, Type } from "@google/genai";

export interface AnalysisResult {
  trend: 'up' | 'down' | 'sideways';
  prediction: string;
  confidence: number;
  timeframe: string;
  drawings: {
    type: 'trendline' | 'support' | 'resistance' | 'horizontal_level' | 'channel' | 'fib_retracement' | 'fib_extension' | 'fib_fan' | 'pitchfork' | 'regression_channel' | 'speed_lines' | 'gann_fan' | 'gann_box' | 'rectangle' | 'ellipse' | 'triangle' | 'wedge' | 'parallel_lines' | 'price_range' | 'risk_reward' | 'volume_profile' | 'vwap' | 'moving_average' | 'bollinger_bands' | 'order_block' | 'bos' | 'choch' | 'liquidity_zone' | 'fvg' | 'candle_pattern' | 'buy_signal' | 'sell_signal' | 'text' | 'label' | 'xabcd' | 'cypher' | 'head_and_shoulders' | 'abcd' | 'triangle_pattern' | 'three_drives' | 'trend_angle';
    points: { time: number; price: number; value?: number }[];
    label: string;
    color?: string;
    metadata?: any;
  }[];
  predicted_candles?: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }[];
}

export async function analyzeMarket(data: any[], timeframe: string): Promise<AnalysisResult> {
  console.log('Starting market analysis with Gemini...');
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    console.error('Gemini API Key is missing!');
    throw new Error('Gemini API Key is missing. Please check your environment variables.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelName = "gemini-3-flash-preview";
  
  const prompt = `
    You are a world-class institutional crypto trader and technical analyst. Analyze the following BTC/USD candlestick data (${timeframe}).
    Data format: [{time, open, high, low, close}]
    
    Perform a deep technical analysis and identify ALL significant chart patterns, harmonic patterns, and critical drawings for price prediction.
    CRITICAL: The 'time' in 'points' MUST be a Unix timestamp in SECONDS. Use the exact 'time' values from the provided data for historical points.
    
    Patterns and Drawings to identify:
    - Advanced Chart Patterns: Head and Shoulders, Inverted Head and Shoulders, Double Top/Bottom, Triangles (Symmetrical, Ascending, Descending), Wedges.
    - Harmonic Patterns: XABCD (Gartley, Butterfly, Bat, Crab), Cypher, ABCD, Three Drives.
    - Trend Analysis: Trendlines, Trend Angles, Channels, BOS (Break of Structure), CHOCH (Change of Character).
    - Supply & Demand: Order Blocks, FVG (Fair Value Gaps), Liquidity Zones, Support/Resistance.
    - Candlestick Patterns: Identify EVERY significant pattern (Doji, Hammer, Engulfing, etc.).
    - Buy/Sell Signals: Explicitly mark high-confidence entry/exit points.
    
    Prediction:
    - Provide a visual prediction of the NEXT 3-5 candles. 
    - These should be realistic OHLC values based on your analysis.
    - Ensure the 'time' for these candles continues from the last historical candle's timestamp.

    For each drawing, provide:
    - type: one of the specified types. 
      Use 'xabcd' for 5-point harmonic patterns.
      Use 'abcd' for 4-point patterns.
      Use 'head_and_shoulders' for H&S patterns.
      Use 'triangle_pattern' for triangles.
      Use 'three_drives' for 3-drive patterns.
      Use 'trend_angle' for trendlines with specific angles.
    - points: array of {time, price}. 
      For XABCD, provide 5 points (X, A, B, C, D).
      For Head and Shoulders, provide 4-5 key points (Left Shoulder, Head, Right Shoulder, Neckline points).
    - label: descriptive name (e.g., "Bullish Gartley", "H&S Top").
    - color: hex color code.
    - metadata: include relevant ratios (e.g., Fibonacci levels for harmonics).
    
    Data: ${JSON.stringify(data.slice(-100))}
  `;

  console.log(`Prompt length: ${prompt.length} characters`);

  try {
    // Add a 30-second timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Gemini API call timed out')), 30000)
    );

    const analysisPromise = ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trend: { type: Type.STRING, enum: ['up', 'down', 'sideways'] },
            prediction: { type: Type.STRING, description: "Detailed summary of the prediction" },
            confidence: { type: Type.NUMBER },
            timeframe: { type: Type.STRING },
            drawings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { 
                    type: Type.STRING, 
                    enum: [
                      'trendline', 'support', 'resistance', 'horizontal_level', 'channel', 
                      'fib_retracement', 'fib_extension', 'fib_fan', 'pitchfork', 
                      'regression_channel', 'speed_lines', 'gann_fan', 'gann_box', 
                      'rectangle', 'ellipse', 'triangle', 'wedge', 'parallel_lines', 
                      'price_range', 'risk_reward', 'volume_profile', 'vwap', 
                      'moving_average', 'bollinger_bands', 'order_block', 'bos', 
                      'choch', 'liquidity_zone', 'fvg', 'candle_pattern',
                      'buy_signal', 'sell_signal', 'text', 'label',
                      'xabcd', 'cypher', 'head_and_shoulders', 'abcd', 
                      'triangle_pattern', 'three_drives', 'trend_angle'
                    ] 
                  },
                  points: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        time: { type: Type.NUMBER },
                        price: { type: Type.NUMBER },
                        value: { type: Type.NUMBER }
                      }
                    }
                  },
                  label: { type: Type.STRING },
                  color: { type: Type.STRING },
                  metadata: { type: Type.OBJECT }
                }
              }
            },
            predicted_candles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.NUMBER },
                  open: { type: Type.NUMBER },
                  high: { type: Type.NUMBER },
                  low: { type: Type.NUMBER },
                  close: { type: Type.NUMBER }
                },
                required: ['time', 'open', 'high', 'low', 'close']
              }
            }
          },
          required: ['trend', 'prediction', 'confidence', 'drawings']
        }
      }
    });

    const response = await Promise.race([analysisPromise, timeoutPromise]) as any;

    console.log('Gemini response received');
    let text = response.text || "{}";
    // Clean markdown if present
    if (text.includes('```')) {
      text = text.replace(/```json\n?|```/g, '').trim();
    }
    
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}
