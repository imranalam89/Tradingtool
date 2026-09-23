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
          const val = data.current?.delta ?? 0;
          return {
            color: val >= 0 ? '#22ab94' : '#e53935',
          };
        },
      },
    ],
  });

  isDeltaRegistered = true;
}

/**
 * 3. Bookmap-Style Liquidity Heatmap Overlay Indicator
 */
export function registerHeatmapIndicator() {
  if (isHeatmapRegistered) return;

  registerIndicator({
    name: HEATMAP_INDICATOR_NAME,
    shortName: 'Heatmap',
    calc: () => [],
    figures: [],
    draw: (params) => {
      const { ctx, bounding, yAxis } = params;
      if (!currentDepthData) return false;

      const bids = currentDepthData.bids || [];
      const asks = currentDepthData.asks || [];
      const maxQty = currentDepthData.maxQty || 1;

      ctx.save();

      // Render resting asks liquidity cloud (red/orange heat)
      asks.forEach((row) => {
        const y = yAxis.convertToPixel(row.price);
        if (y < bounding.top || y > bounding.bottom) return;

        const intensity = Math.min(1, row.qty / maxQty);
        const alpha = 0.08 + intensity * 0.45;
        ctx.fillStyle = `rgba(242, 54, 69, ${alpha})`;
        ctx.fillRect(bounding.left, y - 2, bounding.width, 4);

        if (intensity > 0.6) {
          ctx.fillStyle = `rgba(255, 180, 0, ${alpha * 0.8})`;
          ctx.fillRect(bounding.left, y - 1, bounding.width, 2);
        }
      });

      // Render resting bids liquidity cloud (green/cyan heat)
      bids.forEach((row) => {
        const y = yAxis.convertToPixel(row.price);
        if (y < bounding.top || y > bounding.bottom) return;

        const intensity = Math.min(1, row.qty / maxQty);
        const alpha = 0.08 + intensity * 0.45;
        ctx.fillStyle = `rgba(34, 171, 148, ${alpha})`;
        ctx.fillRect(bounding.left, y - 2, bounding.width, 4);

        if (intensity > 0.6) {
          ctx.fillStyle = `rgba(0, 220, 255, ${alpha * 0.8})`;
          ctx.fillRect(bounding.left, y - 1, bounding.width, 2);
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
