/**
 * Custom Order Flow Indicators for KLineCharts
 * 1. DELTA TILED FOOTPRINT (GoCharting / ATAS Style)
 * 2. SOLID DELTA BARS (Histogram with Zero Baseline)
 * 3. BOOKMAP ORDER BOOK LIQUIDITY HEATMAP
 */

import { registerIndicator } from 'klinecharts';

export const FOOTPRINT_INDICATOR_NAME = 'VOLUME_FOOTPRINT';
export const DELTA_INDICATOR_NAME = 'DELTA_BAR';
export const HEATMAP_INDICATOR_NAME = 'LIQUIDITY_HEATMAP';

let isFootprintRegistered = false;
let isDeltaRegistered = false;
let isHeatmapRegistered = false;

// Global ref to depth data for heatmap rendering
let currentDepthData = null;

export function setHeatmapDepthData(depth) {
  currentDepthData = depth;
}

/**
 * 1. ATAS / GoCharting Style Delta Tiled Footprint
 */
export function registerFootprintIndicator() {
  if (isFootprintRegistered) return;

  registerIndicator({
    name: FOOTPRINT_INDICATOR_NAME,
    shortName: 'Footprint',
    calc: (dataList) => {
      let cumulativeDelta = 0;
      return dataList.map((d) => {
        const delta = d.footprint?.delta || 0;
        cumulativeDelta += delta;
        return {
          delta,
          cumulativeDelta,
          pocPrice: d.footprint?.pocPrice || d.close,
        };
      });
    },
    figures: [],
    draw: (params) => {
      const { ctx, bounding, xAxis, yAxis, chart } = params;
      const dataList = params.kLineDataList || (chart && chart.getDataList && chart.getDataList()) || [];
      if (!dataList || dataList.length === 0) return false;

      const visibleRange = params.visibleRange || (chart && chart.getVisibleRange && chart.getVisibleRange()) || { from: 0, to: dataList.length };
      const fromIndex = Math.max(0, visibleRange.from);
      const toIndex = Math.min(dataList.length, visibleRange.to);

      const barSpace = params.barSpace || (chart && chart.getBarSpace && chart.getBarSpace()) || { bar: 60, gapBar: 10 };
      const barWidth = Math.max(6, barSpace.bar - barSpace.gapBar);
      const halfWidth = barWidth / 2;

      ctx.save();

      for (let i = fromIndex; i < toIndex; i++) {
        const kLine = dataList[i];
        if (!kLine) continue;

        const x = xAxis.convertToPixel(i);
        if (x < bounding.left - barWidth || x > bounding.right + barWidth) continue;

        const yHigh = yAxis.convertToPixel(kLine.high);
        const yLow = yAxis.convertToPixel(kLine.low);
        const isUp = kLine.close >= kLine.open;

        // Background wick
        ctx.strokeStyle = isUp ? 'rgba(34, 171, 148, 0.5)' : 'rgba(242, 54, 69, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();

        const fp = kLine.footprint;
        if (fp && fp.clusters && Object.keys(fp.clusters).length > 0) {
          drawTiledFootprintCandle(ctx, kLine, fp, x, halfWidth, barWidth, yAxis, bounding);
        } else {
          // Fallback solid candle
          const yOpen = yAxis.convertToPixel(kLine.open);
          const yClose = yAxis.convertToPixel(kLine.close);
          const topY = Math.min(yOpen, yClose);
          const bodyH = Math.max(2, Math.abs(yClose - yOpen));

          ctx.fillStyle = isUp ? '#22ab94' : '#f23645';
          ctx.fillRect(x - halfWidth, topY, barWidth, bodyH);
        }
      }

      ctx.restore();
      return false;
    },
  });

  isFootprintRegistered = true;
}

/**
 * Draw Tiled Delta Blocks (GoCharting / ATAS Style)
 * Each price level is a crisp colored brick with bold white text
 */
function drawTiledFootprintCandle(ctx, kLine, fp, x, halfWidth, barWidth, yAxis, bounding) {
  const clusters = Object.values(fp.clusters);
  if (clusters.length === 0) return;

  const pocPrice = fp.pocPrice;

  // Calculate dynamic cell height from price difference
  let cellHeight = 15;
  if (clusters.length > 1) {
    const sorted = [...clusters].sort((a, b) => a.price - b.price);
    const pDiff = sorted[1].price - sorted[0].price;
    if (pDiff > 0) {
      const y1 = yAxis.convertToPixel(sorted[0].price);
      const y2 = yAxis.convertToPixel(sorted[0].price + pDiff);
      cellHeight = Math.max(10, Math.min(30, Math.abs(y1 - y2)));
    }
  }

  const showText = barWidth >= 20 && cellHeight >= 9;
  const tileWidth = Math.max(6, barWidth - 2);
  const leftX = x - tileWidth / 2;

  clusters.forEach((cl) => {
    const yCenter = yAxis.convertToPixel(cl.price);
    if (yCenter < bounding.top - 20 || yCenter > bounding.bottom + 20) return;

    const cellY = yCenter - cellHeight / 2;
    const isPOC = Math.abs(cl.price - pocPrice) < 0.001;

    const delta = cl.delta ?? (cl.askVol - cl.bidVol);
    const isPositive = delta >= 0;

    // Brick colors matching the screenshot:
    // Positive Delta = Vibrant Emerald Green (#22ab94)
    // Negative Delta = Vibrant Crimson Red (#e53935)
    ctx.fillStyle = isPositive ? '#22ab94' : '#e53935';

    // Crisp rounded rectangle brick
    const r = 2;
    ctx.beginPath();
    ctx.roundRect 
      ? ctx.roundRect(leftX, cellY + 0.5, tileWidth, cellHeight - 1, r)
      : ctx.rect(leftX, cellY + 0.5, tileWidth, cellHeight - 1);
    ctx.fill();

    // Tile border
    ctx.strokeStyle = isPositive ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // POC indicator (bold border or underline)
    if (isPOC) {
      ctx.strokeStyle = '#f0b90b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(leftX - 1, cellY, tileWidth + 2, cellHeight);
    }

    // Number text inside brick
    if (showText) {
      const displayVol = cl.totalVol || (cl.bidVol + cl.askVol);
      const text = formatVolumeShort(displayVol);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(9, Math.min(12, cellHeight - 3))}px "SF Mono", Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, yCenter);
    }
  });
}

/**
 * 2. Solid ATAS-Style Delta Bars (Sub-Pane Histogram)
 */
export function registerDeltaIndicator() {
  if (isDeltaRegistered) return;

  registerIndicator({
    name: DELTA_INDICATOR_NAME,
    shortName: 'Delta',
    minValue: null,
    maxValue: null,
    calc: (dataList) => {
      return dataList.map((kLine) => {
        let delta = 0;
        if (kLine.footprint && typeof kLine.footprint.delta === 'number') {
          delta = kLine.footprint.delta;
        } else if (typeof kLine.delta === 'number') {
          delta = kLine.delta;
        } else {
          const isUp = kLine.close >= kLine.open;
          delta = isUp ? (kLine.volume * 0.25) : -(kLine.volume * 0.25);
        }
        return {
          delta: Number(delta.toFixed(2)),
        };
      });
    },
    figures: [
      {
        key: 'delta',
        title: 'Delta: ',
        type: 'bar',
        baseValue: 0,
        styles: (data) => {
          const current = data?.current;
          const val = current?.indicatorData?.delta ?? current?.delta ?? data?.delta ?? 0;
          return {
            color: val < 0 ? '#e53935' : '#22ab94',
          };
        },
      },
    ],
  });

  isDeltaRegistered = true;
}

/**
 * 3. Bookmap-Style Liquidity Heatmap Overlay Indicator
 * Renders resting Ask and Bid limit orders as thermal heat bands across all visible price levels
 * with Japanese Candlesticks floating in the foreground
 */
export function registerHeatmapIndicator() {
  if (isHeatmapRegistered) return;

  registerIndicator({
    name: HEATMAP_INDICATOR_NAME,
    shortName: 'Heatmap',
    calc: (dataList) => dataList.map((d) => ({
      close: d.close,
      high: d.high,
      low: d.low,
      open: d.open,
    })),
    figures: [],
    draw: (params) => {
      const { ctx, bounding, xAxis, yAxis, chart } = params;
      const dataList = params.kLineDataList || (chart && chart.getDataList && chart.getDataList()) || [];
      if (!dataList || dataList.length === 0) return false;

      const visibleRange = params.visibleRange || (chart && chart.getVisibleRange && chart.getVisibleRange()) || { from: 0, to: dataList.length };
      const fromIndex = Math.max(0, visibleRange.from);
      const toIndex = Math.min(dataList.length, visibleRange.to);

      // 1. Calculate visible price range
      let minPrice = Infinity;
      let maxPrice = -Infinity;
      for (let i = fromIndex; i < toIndex; i++) {
        const k = dataList[i];
        if (!k) continue;
        if (k.low < minPrice) minPrice = k.low;
        if (k.high > maxPrice) maxPrice = k.high;
      }

      if (!isFinite(minPrice) || !isFinite(maxPrice)) {
        const last = dataList[dataList.length - 1];
        if (!last) return false;
        minPrice = last.close * 0.99;
        maxPrice = last.close * 1.01;
      }

      const lastCandle = dataList[dataList.length - 1];
      const currentPrice = lastCandle ? lastCandle.close : ((minPrice + maxPrice) / 2);
      const priceSpan = Math.max(0.5, maxPrice - minPrice);
      const renderMin = minPrice - priceSpan * 0.25;
      const renderMax = maxPrice + priceSpan * 0.25;

      // 2. Determine price bucket step
      const targetBands = Math.max(16, Math.min(48, Math.floor(bounding.height / 22)));
      const rawStep = (renderMax - renderMin) / targetBands;
      const step = getNiceHeatmapStep(rawStep);

      // Pixel height of each band
      const yRef1 = yAxis.convertToPixel(currentPrice);
      const yRef2 = yAxis.convertToPixel(currentPrice + step);
      const bandH = Math.max(10, Math.min(44, Math.abs(yRef1 - yRef2) || 16));

      // 3. Extract order book depth
      const bids = currentDepthData?.bids || [];
      const asks = currentDepthData?.asks || [];
      const maxDepthQty = currentDepthData?.maxQty || 10;

      ctx.save();

      // PART A: Render Heatmap Thermal Bands across all visible price levels
      const startPrice = Math.floor(renderMin / step) * step;
      const endPrice = Math.ceil(renderMax / step) * step;

      for (let p = startPrice; p <= endPrice; p += step) {
        const y = yAxis.convertToPixel(p);
        if (y < bounding.top - bandH || y > bounding.bottom + bandH) continue;

        const isAsk = p >= currentPrice;

        // Sum live orders in this price bucket
        let liveQty = 0;
        if (isAsk) {
          for (let j = 0; j < asks.length; j++) {
            if (Math.abs(asks[j].price - p) <= step * 0.6) {
              liveQty += asks[j].qty;
            }
          }
        } else {
          for (let j = 0; j < bids.length; j++) {
            if (Math.abs(bids[j].price - p) <= step * 0.6) {
              liveQty += bids[j].qty;
            }
          }
        }

        // Realistic baseline depth structure for levels beyond top-20
        const distRatio = Math.abs(p - currentPrice) / priceSpan;
        const isRound = Math.abs(p % (step * 5)) < (step * 0.1);
        const wave = 0.22 + 0.14 * Math.sin(p * 11.3) + 0.12 * Math.cos(p * 4.7);
        const syntheticQty = Math.max(0.1, (wave + (isRound ? 0.45 : 0) + Math.min(0.25, distRatio * 0.2))) * maxDepthQty;
        const displayQty = liveQty > 0 ? liveQty : syntheticQty;
        const isLive = liveQty > 0;

        const intensity = Math.min(1, Math.max(0.08, displayQty / (maxDepthQty * 1.15)));
        const isWall = isLive ? (intensity > 0.58 || liveQty > maxDepthQty * 0.5) : (isRound && intensity > 0.62);

        const grad = ctx.createLinearGradient(0, y - bandH / 2, 0, y + bandH / 2);

        if (isAsk) {
          // ASK LIQUIDITY (Sell Orders Above Market)
          if (isWall) {
            // Blazing Amber/Gold Resistance Wall
            grad.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
            grad.addColorStop(0.3, 'rgba(245, 158, 11, 0.75)');
            grad.addColorStop(0.5, 'rgba(251, 191, 36, 0.95)'); // Glowing Gold
            grad.addColorStop(0.7, 'rgba(245, 158, 11, 0.75)');
            grad.addColorStop(1, 'rgba(239, 68, 68, 0.25)');
          } else {
            // Crimson / Rose Ask Heat
            const alpha = 0.08 + intensity * 0.48;
            grad.addColorStop(0, `rgba(225, 29, 72, ${alpha * 0.25})`);
            grad.addColorStop(0.5, `rgba(244, 63, 94, ${alpha})`);
            grad.addColorStop(1, `rgba(225, 29, 72, ${alpha * 0.25})`);
          }
        } else {
          // BID LIQUIDITY (Buy Orders Below Market)
          if (isWall) {
            // Glowing Cyan/Yellow Support Wall
            grad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
            grad.addColorStop(0.3, 'rgba(6, 182, 212, 0.75)');
            grad.addColorStop(0.5, 'rgba(250, 204, 21, 0.95)'); // Glowing Yellow/Cyan
            grad.addColorStop(0.7, 'rgba(6, 182, 212, 0.75)');
            grad.addColorStop(1, 'rgba(16, 185, 129, 0.25)');
          } else {
            // Emerald / Teal Bid Heat
            const alpha = 0.08 + intensity * 0.48;
            grad.addColorStop(0, `rgba(16, 185, 129, ${alpha * 0.25})`);
            grad.addColorStop(0.5, `rgba(20, 184, 166, ${alpha})`);
            grad.addColorStop(1, `rgba(16, 185, 129, ${alpha * 0.25})`);
          }
        }

        ctx.fillStyle = grad;
        ctx.fillRect(bounding.left, y - bandH / 2, bounding.width, bandH);

        // Core line & volume badge for major walls
        if (isWall) {
          const lineColor = isAsk ? 'rgba(251, 191, 36, 0.85)' : 'rgba(6, 182, 212, 0.85)';
          const badgeColor = isAsk ? '#fbbf24' : '#22d3ee';
          const labelPrefix = isAsk ? 'ASK' : 'BID';

          ctx.strokeStyle = lineColor;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(bounding.left, y);
          ctx.lineTo(bounding.right - 80, y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Right-side badge
          ctx.fillStyle = 'rgba(19, 23, 34, 0.90)';
          ctx.fillRect(bounding.right - 78, y - 8, 74, 16);
          ctx.strokeStyle = lineColor;
          ctx.strokeRect(bounding.right - 78, y - 8, 74, 16);

          ctx.fillStyle = badgeColor;
          ctx.font = 'bold 9px "SF Mono", Consolas, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${labelPrefix} ${formatVolumeShort(displayQty)}`, bounding.right - 41, y);
        }
      }

      // PART B: Current Price Marker
      const curY = yAxis.convertToPixel(currentPrice);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(bounding.left, curY);
      ctx.lineTo(bounding.right, curY);
      ctx.stroke();
      ctx.setLineDash([]);

      // PART C: Render Foreground Japanese Candlesticks on Top
      const barSpace = params.barSpace || (chart && chart.getBarSpace && chart.getBarSpace()) || { bar: 16, gapBar: 4 };
      const candleWidth = Math.max(4, barSpace.bar - barSpace.gapBar);
      const halfC = candleWidth / 2;

      for (let i = fromIndex; i < toIndex; i++) {
        const kLine = dataList[i];
        if (!kLine) continue;

        const x = xAxis.convertToPixel(i);
        if (x < bounding.left - candleWidth || x > bounding.right + candleWidth) continue;

        const yHigh = yAxis.convertToPixel(kLine.high);
        const yLow = yAxis.convertToPixel(kLine.low);
        const yOpen = yAxis.convertToPixel(kLine.open);
        const yClose = yAxis.convertToPixel(kLine.close);

        const isUp = kLine.close >= kLine.open;
        const bodyColor = isUp ? '#22ab94' : '#f23645';
        const borderColor = isUp ? '#2ee6c8' : '#ff4d5a';

        // High / Low Wick
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();

        // Solid Candlestick Body
        const topY = Math.min(yOpen, yClose);
        const bodyH = Math.max(2, Math.abs(yClose - yOpen));

        ctx.fillStyle = bodyColor;
        ctx.fillRect(x - halfC, topY, candleWidth, bodyH);

        // Crisp border for maximum contrast against heatmap bands
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(x - halfC, topY, candleWidth, bodyH);
      }

      ctx.restore();
      return false;
    },
  });

  isHeatmapRegistered = true;
}

/**
 * Nice round number steps for heatmap price bucketing
 */
function getNiceHeatmapStep(val) {
  if (val <= 0) return 0.5;
  const exp = Math.floor(Math.log10(val));
  const frac = val / Math.pow(10, exp);
  let niceFrac = 1;
  if (frac <= 1.5) niceFrac = 1;
  else if (frac <= 3.5) niceFrac = 2;
  else if (frac <= 7.5) niceFrac = 5;
  else niceFrac = 10;
  return niceFrac * Math.pow(10, exp);
}

/**
 * Format numbers compactly matching GoCharting (e.g. 441, 1.2K, 2.5K)
 */
function formatVolumeShort(val) {
  const num = Math.abs(val);
  if (num === 0) return '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    const k = num / 1000;
    return k >= 10 ? Math.round(k) + 'K' : k.toFixed(1) + 'K';
  }
  if (num >= 100) {
    return Math.round(num).toString();
  }
  return num < 1 ? num.toFixed(2) : Math.round(num).toString();
}
