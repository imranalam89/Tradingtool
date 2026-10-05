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
 * Renders resting Ask and Bid limit orders as thermal heat bands BEHIND the candlesticks
 */
export function registerHeatmapIndicator() {
  if (isHeatmapRegistered) return;

  registerIndicator({
    name: HEATMAP_INDICATOR_NAME,
    shortName: 'Heatmap',
    zLevel: -1, // Draws behind the candlesticks
    calc: (dataList) => dataList.map(() => ({})),
    figures: [],
    draw: (params) => {
      const { ctx, bounding, yAxis } = params;
      if (!currentDepthData) return false;

      const bids = currentDepthData.bids || [];
      const asks = currentDepthData.asks || [];
      const maxQty = currentDepthData.maxQty || 1;

      // Estimate band height from price level differences
      let bandH = 14;
      if (asks.length > 1) {
        const dy = Math.abs(yAxis.convertToPixel(asks[0].price) - yAxis.convertToPixel(asks[1].price));
        if (dy >= 4 && dy <= 36) bandH = dy;
      } else if (bids.length > 1) {
        const dy = Math.abs(yAxis.convertToPixel(bids[0].price) - yAxis.convertToPixel(bids[1].price));
        if (dy >= 4 && dy <= 36) bandH = dy;
      }

      ctx.save();

      // 1. Render Resting ASKS (Sell Limit Orders above market)
      asks.forEach((row) => {
        const y = yAxis.convertToPixel(row.price);
        if (y < bounding.top - 10 || y > bounding.bottom + 10) return;

        const intensity = Math.min(1, row.qty / maxQty);
        const alpha = 0.08 + intensity * 0.65;
        const isWall = intensity > 0.60;

        // Thermal vertical gradient for the ask band
        const grad = ctx.createLinearGradient(0, y - bandH / 2, 0, y + bandH / 2);
        if (isWall) {
          // Blazing Amber/Gold Wall
          grad.addColorStop(0, 'rgba(239, 68, 68, 0.15)');
          grad.addColorStop(0.3, 'rgba(245, 158, 11, 0.65)');
          grad.addColorStop(0.5, 'rgba(251, 191, 36, 0.90)'); // Hot gold core
          grad.addColorStop(0.7, 'rgba(245, 158, 11, 0.65)');
          grad.addColorStop(1, 'rgba(239, 68, 68, 0.15)');
        } else {
          // Normal Ask Heat (Crimson/Rose)
          grad.addColorStop(0, `rgba(225, 29, 72, ${alpha * 0.2})`);
          grad.addColorStop(0.5, `rgba(244, 63, 94, ${alpha})`);
          grad.addColorStop(1, `rgba(225, 29, 72, ${alpha * 0.2})`);
        }

        ctx.fillStyle = grad;
        ctx.fillRect(bounding.left, y - bandH / 2, bounding.width, bandH);

        // Core line & volume badge for large ask walls
        if (isWall) {
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(bounding.left, y);
          ctx.lineTo(bounding.right - 65, y);
          ctx.stroke();

          // Right-side badge
          ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
          ctx.font = 'bold 9px "SF Mono", Consolas, monospace';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(`ASK ${row.qty.toFixed(row.qty < 1 ? 3 : 1)}`, bounding.right - 5, y);
        }
      });

      // 2. Render Resting BIDS (Buy Limit Orders below market)
      bids.forEach((row) => {
        const y = yAxis.convertToPixel(row.price);
        if (y < bounding.top - 10 || y > bounding.bottom + 10) return;

        const intensity = Math.min(1, row.qty / maxQty);
        const alpha = 0.08 + intensity * 0.65;
        const isWall = intensity > 0.60;

        // Thermal vertical gradient for the bid band
        const grad = ctx.createLinearGradient(0, y - bandH / 2, 0, y + bandH / 2);
        if (isWall) {
          // Glowing Cyan/Yellow Support Wall
          grad.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
          grad.addColorStop(0.3, 'rgba(6, 182, 212, 0.65)');
          grad.addColorStop(0.5, 'rgba(250, 204, 21, 0.90)'); // Hot yellow core
          grad.addColorStop(0.7, 'rgba(6, 182, 212, 0.65)');
          grad.addColorStop(1, 'rgba(16, 185, 129, 0.15)');
        } else {
          // Normal Bid Heat (Emerald/Teal)
          grad.addColorStop(0, `rgba(16, 185, 129, ${alpha * 0.2})`);
          grad.addColorStop(0.5, `rgba(20, 184, 166, ${alpha})`);
          grad.addColorStop(1, `rgba(16, 185, 129, ${alpha * 0.2})`);
        }

        ctx.fillStyle = grad;
        ctx.fillRect(bounding.left, y - bandH / 2, bounding.width, bandH);

        // Core line & volume badge for large bid walls
        if (isWall) {
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(bounding.left, y);
          ctx.lineTo(bounding.right - 65, y);
          ctx.stroke();

          // Right-side badge
          ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
          ctx.font = 'bold 9px "SF Mono", Consolas, monospace';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(`BID ${row.qty.toFixed(row.qty < 1 ? 3 : 1)}`, bounding.right - 5, y);
        }
      });

      ctx.restore();
      return false;
    },
  });

  isHeatmapRegistered = true;
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
