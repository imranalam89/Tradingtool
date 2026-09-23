/**
 * Binance REST API Client for Historical Data & Footprint Reconstruction
 */

const BINANCE_REST_BASE = 'https://api.binance.com';

/**
 * Fetch historical Kline / Candlestick data
 * @param {string} symbol - e.g. 'PAXGUSDT', 'BTCUSDT'
 * @param {string} interval - '1m', '5m', '15m', '1h'
 * @param {number} limit - number of candles (max 1000)
 */
export async function fetchHistoricalKlines(symbol = 'PAXGUSDT', interval = '1m', limit = 150) {
  try {
    const cleanSymbol = symbol.toUpperCase().replace('/', '');
    // For XAUUSD, PAXGUSDT serves as the direct 1:1 physical gold proxy
    const querySymbol = cleanSymbol === 'XAUUSD' ? 'PAXGUSDT' : cleanSymbol;
    
    const url = `${BINANCE_REST_BASE}/api/v3/klines?symbol=${querySymbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Binance API error: ${res.statusText}`);
    }
    const rawData = await res.json();

    const tickSize = querySymbol.includes('BTC') ? 10 : querySymbol.includes('ETH') ? 1 : 0.50;

    return rawData.map(c => {
      const timestamp = c[0];
      const open = parseFloat(c[1]);
      const high = parseFloat(c[2]);
      const low = parseFloat(c[3]);
      const close = parseFloat(c[4]);
      const volume = parseFloat(c[5]);
      const turnover = parseFloat(c[7]);
      const takerBuyVol = parseFloat(c[9]); // Aggressive market buy (Ask volume)
      const takerSellVol = Math.max(0, volume - takerBuyVol); // Aggressive market sell (Bid volume)
      const delta = takerBuyVol - takerSellVol;

      const { clusters, pocPrice, maxPriceVol } = generateHistoricalClusters(
        open, high, low, close, volume, takerBuyVol, takerSellVol, tickSize
      );

      return {
        timestamp,
        open,
        high,
        low,
        close,
        volume,
        turnover,
        footprint: {
          delta,
          totalBidVol: takerSellVol,
          totalAskVol: takerBuyVol,
          clusters,
          pocPrice,
          maxPriceVol,
          tickSize,
        }
      };
    });
  } catch (err) {
    console.warn('Failed to fetch historical klines from Binance REST, generating fallback seed:', err);
    return generateFallbackKlines(symbol, interval, limit);
  }
}

/**
 * Generate fine-grained price-level footprint clusters for historical bars
 */
export function generateHistoricalClusters(open, high, low, close, volume, takerBuyVol, takerSellVol, tickSize = 0.50) {
  const clusters = {};
  const startPrice = Math.floor(low / tickSize) * tickSize;
  const endPrice = Math.ceil(high / tickSize) * tickSize;
  const levels = [];

  for (let p = startPrice; p <= endPrice + 0.001; p += tickSize) {
    levels.push(Math.round(p * 100) / 100);
  }

  if (levels.length === 0) {
    levels.push(Math.round(close * 100) / 100);
  }

  const centerPrice = (open + close + high + low) / 4;
  let totalWeight = 0;
  const weights = levels.map(p => {
    // Gaussian-like curve centered around typical price
    const dist = Math.abs(p - centerPrice) / (Math.max(high - low, tickSize * 2) || 1);
    const weight = Math.exp(-2.5 * dist * dist);
    totalWeight += weight;
    return weight;
  });

  let maxVol = 0;
  let poc = centerPrice;

  levels.forEach((p, idx) => {
    const w = weights[idx] / (totalWeight || 1);
    const levelVol = volume * w;
    const buyWeight = takerBuyVol / (volume || 1);
    
    // Add micro variations for realistic order flow imbalance
    const jitter = (Math.sin(idx * 2.7) * 0.15);
    const adjustedBuyRatio = Math.max(0.05, Math.min(0.95, buyWeight + jitter));

    const askVol = levelVol * adjustedBuyRatio;
    const bidVol = levelVol * (1 - adjustedBuyRatio);
    const tot = askVol + bidVol;
    const key = p.toFixed(2);

    clusters[key] = {
      price: p,
      bidVol,
      askVol,
      totalVol: tot,
      delta: askVol - bidVol,
    };

    if (tot > maxVol) {
      maxVol = tot;
      poc = p;
    }
  });

  return { clusters, pocPrice: poc, maxPriceVol: maxVol };
}

/**
 * Fetch recent aggregate trades to populate fine-grained footprint clusters
 * @param {string} symbol 
 * @param {number} limit 
 */
export async function fetchRecentAggTrades(symbol = 'PAXGUSDT', limit = 1000) {
  try {
    const cleanSymbol = symbol.toUpperCase().replace('/', '');
    const querySymbol = cleanSymbol === 'XAUUSD' ? 'PAXGUSDT' : cleanSymbol;
    const url = `${BINANCE_REST_BASE}/api/v3/aggTrades?symbol=${querySymbol}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch aggTrades:', err);
    return [];
  }
}

/**
 * Fallback generator in case of network restriction or offline testing
 */
function generateFallbackKlines(symbol, interval, limit) {
  const now = Date.now();
  const intervalMs = parseIntervalToMs(interval);
  const candles = [];
  let basePrice = symbol.includes('BTC') ? 64000 : symbol.includes('ETH') ? 3400 : 2720.50;

  for (let i = limit; i >= 0; i--) {
    const timestamp = now - i * intervalMs;
    const change = (Math.random() - 0.49) * (basePrice * 0.002);
    const open = basePrice;
    const close = basePrice + change;
    const high = Math.max(open, close) + Math.random() * (basePrice * 0.001);
    const low = Math.min(open, close) - Math.random() * (basePrice * 0.001);
    const volume = Math.random() * 25 + 5;
    const buyRatio = 0.3 + Math.random() * 0.4;
    const askVol = volume * buyRatio;
    const bidVol = volume * (1 - buyRatio);

    candles.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
      turnover: volume * close,
      footprint: {
        delta: askVol - bidVol,
        totalBidVol: bidVol,
        totalAskVol: askVol,
        clusters: {},
        pocPrice: (open + close + high + low) / 4,
      }
    });

    basePrice = close;
  }
  return candles;
}

export function parseIntervalToMs(interval) {
  switch (interval) {
    case '1m': return 60 * 1000;
    case '3m': return 3 * 60 * 1000;
    case '5m': return 5 * 60 * 1000;
    case '15m': return 15 * 60 * 1000;
    case '30m': return 30 * 60 * 1000;
    case '1h':
    case '1H': return 60 * 60 * 1000;
    case '4h':
    case '4H': return 4 * 60 * 60 * 1000;
    case '1d':
    case '1D': return 24 * 60 * 60 * 1000;
    default: return 60 * 1000;
  }
}
