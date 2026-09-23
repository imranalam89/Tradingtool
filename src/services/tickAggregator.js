/**
 * Tick Aggregator: Transforms live Binance aggTrades into OHLCV Candles 
 * and fine-grained Volume Footprint Clusters.
 */

import { parseIntervalToMs } from './binanceRest';

export class TickAggregator {
  constructor({ 
    interval = '1m', 
    tickSize = 0.50, 
    onCandleUpdate, 
    onNewCandle, 
    maxCandles = 500 
  }) {
    this.interval = interval;
    this.intervalMs = parseIntervalToMs(interval);
    this.tickSize = tickSize;
    this.onCandleUpdate = onCandleUpdate || (() => {});
    this.onNewCandle = onNewCandle || (() => {});
    this.maxCandles = maxCandles;

    this.candles = [];
    this.pendingTrades = [];
    this.rafId = null;
    this.isFlushing = false;
  }

  setInterval(interval) {
    this.interval = interval;
    this.intervalMs = parseIntervalToMs(interval);
  }

  setTickSize(tickSize) {
    this.tickSize = Number(tickSize) || 0.50;
    // Re-bin clusters for all existing candles if tick size changed
    this.rebinClusters();
  }

  setInitialCandles(candles) {
    this.candles = [...candles];
    // Ensure every candle has footprint object structure
    this.candles.forEach(c => {
      if (!c.footprint) {
        c.footprint = {
          delta: 0,
          totalBidVol: 0,
          totalAskVol: 0,
          clusters: {},
          pocPrice: c.close,
          maxPriceVol: 0,
        };
      }
    });
  }

  getCandles() {
    return this.candles;
  }

  getCurrentCandle() {
    return this.candles.length > 0 ? this.candles[this.candles.length - 1] : null;
  }

  /**
   * Push incoming trade from Binance WebSocket
   * Trade schema: { p: price, q: quantity, T: timestamp, m: isBuyerMaker }
   */
  pushTrade(trade) {
    this.pendingTrades.push(trade);
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this.flushPendingTrades());
    }
  }

  /**
   * Batch process all trades accumulated during frame interval
   */
  flushPendingTrades() {
    this.rafId = null;
    if (this.pendingTrades.length === 0) return;

    const trades = this.pendingTrades;
    this.pendingTrades = [];

    let hasNewCandle = false;
    let latestCandle = null;

    for (let i = 0; i < trades.length; i++) {
      const t = trades[i];
      const price = parseFloat(t.p);
      const qty = parseFloat(t.q);
      const tradeTime = t.T;
      const isBuyerMaker = t.m; // true = aggressive sell (bid), false = aggressive buy (ask)

      const candleOpenTime = Math.floor(tradeTime / this.intervalMs) * this.intervalMs;
      let currentCandle = this.candles.length > 0 ? this.candles[this.candles.length - 1] : null;

      if (!currentCandle || candleOpenTime > currentCandle.timestamp) {
        // Create new candle
        const newCandle = {
          timestamp: candleOpenTime,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: 0,
          turnover: 0,
          footprint: {
            delta: 0,
            totalBidVol: 0,
            totalAskVol: 0,
            clusters: {},
            pocPrice: price,
            maxPriceVol: 0,
          }
        };

        this.candles.push(newCandle);
        if (this.candles.length > this.maxCandles) {
          this.candles.shift();
        }
        currentCandle = newCandle;
        hasNewCandle = true;
      }

      // Update OHLCV
      currentCandle.high = Math.max(currentCandle.high, price);
      currentCandle.low = Math.min(currentCandle.low, price);
      currentCandle.close = price;
      currentCandle.volume += qty;
      currentCandle.turnover += price * qty;

      // Update Footprint Clusters
      this.accumulateTradeToFootprint(currentCandle, price, qty, isBuyerMaker);
      latestCandle = currentCandle;
    }

    if (hasNewCandle) {
      this.onNewCandle(latestCandle);
    } else if (latestCandle) {
      this.onCandleUpdate(latestCandle);
    }
  }

  /**
   * Quantize price and bin trade volumes into the candle footprint cluster
   */
  accumulateTradeToFootprint(candle, price, qty, isBuyerMaker) {
    const fp = candle.footprint;
    const bucketPrice = Math.round(price / this.tickSize) * this.tickSize;
    // Format to 2 decimals for precision key stability
    const key = bucketPrice.toFixed(2);

    if (!fp.clusters[key]) {
      fp.clusters[key] = {
        price: bucketPrice,
        bidVol: 0,
        askVol: 0,
        totalVol: 0,
        delta: 0,
      };
    }

    const cluster = fp.clusters[key];
    if (isBuyerMaker) {
      // Market sell hitting bid
      cluster.bidVol += qty;
      fp.totalBidVol += qty;
    } else {
      // Market buy lifting ask
      cluster.askVol += qty;
      fp.totalAskVol += qty;
    }

    cluster.totalVol = cluster.bidVol + cluster.askVol;
    cluster.delta = cluster.askVol - cluster.bidVol;
    fp.delta = fp.totalAskVol - fp.totalBidVol;

    // Track POC (Point of Control)
    if (cluster.totalVol > fp.maxPriceVol) {
      fp.maxPriceVol = cluster.totalVol;
      fp.pocPrice = bucketPrice;
    }
  }

  /**
   * Seed recent candles with aggregate trade history
   */
  populateRecentAggTrades(aggTrades) {
    if (!aggTrades || aggTrades.length === 0) return;

    aggTrades.forEach(t => {
      const price = parseFloat(t.p);
      const qty = parseFloat(t.q);
      const tradeTime = t.T;
      const isBuyerMaker = t.m;

      const candleOpenTime = Math.floor(tradeTime / this.intervalMs) * this.intervalMs;
      // Find matching candle
      let candle = this.candles.find(c => c.timestamp === candleOpenTime);
      if (!candle) {
        // Find nearest preceding candle or create one
        candle = this.candles.find(c => tradeTime >= c.timestamp && tradeTime < c.timestamp + this.intervalMs);
      }

      if (candle) {
        this.accumulateTradeToFootprint(candle, price, qty, isBuyerMaker);
      }
    });
  }

  rebinClusters() {
    // If tick size changes, recalculate maxPriceVol & pocPrice across candles
    this.candles.forEach(candle => {
      if (!candle.footprint || !candle.footprint.clusters) return;
      let maxVol = 0;
      let poc = candle.close;
      Object.values(candle.footprint.clusters).forEach(cl => {
        if (cl.totalVol > maxVol) {
          maxVol = cl.totalVol;
          poc = cl.price;
        }
      });
      candle.footprint.maxPriceVol = maxVol;
      candle.footprint.pocPrice = poc;
    });
  }
}
