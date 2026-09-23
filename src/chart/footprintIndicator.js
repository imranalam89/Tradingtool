/**
 * Custom Volume Footprint (Cluster / Order Flow) Indicator for KLineCharts v10
 * Renders split Bid x Ask volume matrix, delta color-coding, and POC (Point of Control).
 */

import { registerIndicator } from 'klinecharts';

export const FOOTPRINT_INDICATOR_NAME = 'VOLUME_FOOTPRINT';
export const DELTA_INDICATOR_NAME = 'DELTA_BAR';

let isRegistered = false;
let isDeltaRegistered = false;

export function registerDeltaIndicator() {
  if (isDeltaRegistered) return;

  registerIndicator({
    name: DELTA_INDICATOR_NAME,
    shortName: 'Delta Bar',
    minValue: null,
    maxValue: null,
    calc: (dataList) => {
      let cvd = 0;
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
        cvd += delta;
        return {
          delta: Number(delta.toFixed(2)),
          cvd: Number(cvd.toFixed(2)),
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
            color: val >= 0 ? '#089981' : '#f23645',
          };
        },
      },
      {
        key: 'cvd',
        title: 'CVD: ',
        type: 'line',
        styles: () => ({
          color: '#f0b90b',
          size: 1.5,
        }),
      },
    ],
  });

  isDeltaRegistered = true;
}

export function registerFootprintIndicator() {
  if (isRegistered) return;

  registerIndicator({
    name: FOOTPRINT_INDICATOR_NAME,
    shortName: 'Footprint',
    calc: (dataList) => {
      // Calculate or carry forward footprint metrics
      let cumulativeDelta = 0;
      return dataList.map((d) => {
        const delta = d.footprint?.delta || 0;
        cumulativeDelta += delta;
        return {
          delta,
          cumulativeDelta,
          pocPrice: d.footprint?.pocPrice || d.close,
          totalBidVol: d.footprint?.totalBidVol || 0,
          totalAskVol: d.footprint?.totalAskVol || 0,
        };
      });
    },
    figures: [],
    // Custom Canvas Draw callback
    draw: (params) => {
      const { ctx, indicator, bounding, xAxis, yAxis, chart } = params;
      const dataList = params.kLineDataList || (chart && chart.getDataList && chart.getDataList()) || [];
      if (!dataList || dataList.length === 0) return false;

      const visibleRange = params.visibleRange || (chart && chart.getVisibleRange && chart.getVisibleRange()) || { from: 0, to: dataList.length };
      const fromIndex = Math.max(0, visibleRange.from);
      const toIndex = Math.min(dataList.length, visibleRange.to);

      const barSpace = params.barSpace || (chart && chart.getBarSpace && chart.getBarSpace()) || { bar: 60, gapBar: 10 };
      const barWidth = Math.max(4, barSpace.bar - barSpace.gapBar);
      const halfWidth = barWidth / 2;

      ctx.save();

      for (let i = fromIndex; i < toIndex; i++) {
        const kLine = dataList[i];
        if (!kLine) continue;

        const x = xAxis.convertToPixel(i);
        // Clip offscreen
        if (x < bounding.left - barWidth || x > bounding.right + barWidth) continue;

        const yHigh = yAxis.convertToPixel(kLine.high);
        const yLow = yAxis.convertToPixel(kLine.low);
        const isUp = kLine.close >= kLine.open;

        // Draw Candle Wick in background
        ctx.strokeStyle = isUp ? 'rgba(8, 153, 129, 0.4)' : 'rgba(242, 54, 69, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();

        // If footprint cluster data exists, render Split Matrix
        const fp = kLine.footprint;
        if (fp && fp.clusters && Object.keys(fp.clusters).length > 0) {
          drawClusterMatrix(ctx, kLine, fp, x, halfWidth, barWidth, yAxis, bounding);
        } else {
          // Render subtle hollow/solid candle body if no cluster ticks yet
          const yOpen = yAxis.convertToPixel(kLine.open);
          const yClose = yAxis.convertToPixel(kLine.close);
          const topY = Math.min(yOpen, yClose);
          const bodyH = Math.max(2, Math.abs(yClose - yOpen));

          ctx.fillStyle = isUp ? 'rgba(8, 153, 129, 0.25)' : 'rgba(242, 54, 69, 0.25)';
          ctx.strokeStyle = isUp ? '#089981' : '#f23645';
          ctx.fillRect(x - halfWidth, topY, barWidth, bodyH);
          ctx.strokeRect(x - halfWidth, topY, barWidth, bodyH);
        }

        // Draw Candle Footer (Delta & Volume Badge)
        if (barWidth >= 24 && fp) {
          drawCandleFooter(ctx, fp, x, yLow, barWidth, bounding);
        }
      }

      ctx.restore();
      return false; // Tells klinecharts custom drawing handled
    },
  });

  isRegistered = true;
}

/**
 * Render Split Matrix: Bid Vol (Left) x Ask Vol (Right) at each price level
 */
function drawClusterMatrix(ctx, kLine, fp, x, halfWidth, barWidth, yAxis, bounding) {
  const clusters = Object.values(fp.clusters);
  if (clusters.length === 0) return;

  const maxVol = fp.maxPriceVol || Math.max(...clusters.map(c => c.totalVol), 0.001);
  const pocPrice = fp.pocPrice;

  // Approximate vertical height per tick level
  let cellHeight = 14;
  if (clusters.length > 1) {
    const sorted = [...clusters].sort((a, b) => a.price - b.price);
    const pDiff = sorted[1].price - sorted[0].price;
    if (pDiff > 0) {
      const y1 = yAxis.convertToPixel(sorted[0].price);
      const y2 = yAxis.convertToPixel(sorted[0].price + pDiff);
      cellHeight = Math.max(12, Math.min(32, Math.abs(y1 - y2)));
    }
  }

  const showText = barWidth >= 38 && cellHeight >= 9;
  const showCompactText = barWidth >= 22 && !showText && cellHeight >= 8;

  clusters.forEach((cl) => {
    const yCenter = yAxis.convertToPixel(cl.price);
    if (yCenter < bounding.top - 20 || yCenter > bounding.bottom + 20) return;

    const cellY = yCenter - cellHeight / 2;
    const isPOC = Math.abs(cl.price - pocPrice) < 0.001;

    const bidVol = cl.bidVol;
    const askVol = cl.askVol;
    const delta = cl.delta; // askVol - bidVol

    // Imbalance detection: 3:1 ratio
    const isBuyImbalance = askVol >= bidVol * 3 && askVol > 0.05;
    const isSellImbalance = bidVol >= askVol * 3 && bidVol > 0.05;

    // Heatmap opacity scaling based on relative volume
    const bidRatio = Math.min(1, bidVol / maxVol);
    const askRatio = Math.min(1, askVol / maxVol);

    // Left Box: Bid Volume (Market Sells)
    // Dark Red for selling imbalance or heavy seller volume
    const bidAlpha = 0.12 + bidRatio * 0.55;
    ctx.fillStyle = isSellImbalance 
      ? `rgba(242, 54, 69, ${Math.min(0.85, bidAlpha + 0.25)})`
      : delta < 0 
        ? `rgba(242, 54, 69, ${bidAlpha})` 
        : `rgba(38, 42, 55, ${0.4 + bidRatio * 0.3})`;
    ctx.fillRect(x - halfWidth, cellY, halfWidth - 0.5, cellHeight);

    // Right Box: Ask Volume (Market Buys)
    // Dark Green for buying imbalance or heavy buyer volume
    const askAlpha = 0.12 + askRatio * 0.55;
    ctx.fillStyle = isBuyImbalance 
      ? `rgba(8, 153, 129, ${Math.min(0.85, askAlpha + 0.25)})`
      : delta > 0 
        ? `rgba(8, 153, 129, ${askAlpha})` 
        : `rgba(38, 42, 55, ${0.4 + askRatio * 0.3})`;
    ctx.fillRect(x + 0.5, cellY, halfWidth - 0.5, cellHeight);

    // Vertical Divider between Bid and Ask
    ctx.fillStyle = '#131722';
    ctx.fillRect(x - 0.5, cellY, 1, cellHeight);

    // Horizontal border between price buckets
    ctx.strokeStyle = '#181b24';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x - halfWidth, cellY, barWidth, cellHeight);

    // POC (Point of Control) Golden Border
    if (isPOC) {
      ctx.strokeStyle = '#ffb703';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - halfWidth, cellY, barWidth, cellHeight);

      // Mini POC tag on left if space allows
      if (barWidth >= 60) {
        ctx.fillStyle = '#ffb703';
        ctx.fillRect(x - halfWidth, cellY, 2, cellHeight);
      }
    }

    // Text labels inside the cell
    if (showText) {
      ctx.font = '9px "SF Mono", Consolas, monospace';
      ctx.textBaseline = 'middle';

      // Left: Bid Volume
      ctx.textAlign = 'right';
      ctx.fillStyle = isSellImbalance ? '#ff949d' : '#d1d4dc';
      ctx.fillText(formatVolume(bidVol), x - 3, yCenter);

      // Right: Ask Volume
      ctx.textAlign = 'left';
      ctx.fillStyle = isBuyImbalance ? '#7bf7db' : '#d1d4dc';
      ctx.fillText(formatVolume(askVol), x + 3, yCenter);
    } else if (showCompactText) {
      // Compact mode: show net delta or dominant volume
      ctx.font = '8px "SF Mono", Consolas, monospace';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      const absDelta = Math.abs(delta);
      if (absDelta > 0.01) {
        ctx.fillStyle = delta > 0 ? '#0cb89c' : '#ff495a';
        ctx.fillText(formatVolume(delta), x, yCenter);
      }
    }
  });
}

/**
 * Draw mini Delta & Volume pill below candle
 */
function drawCandleFooter(ctx, fp, x, yLow, barWidth, bounding) {
  const pillY = yLow + 6;
  if (pillY > bounding.bottom - 16) return;

  const delta = fp.delta || 0;
  const isPositive = delta >= 0;
  const deltaText = `${isPositive ? '+' : ''}${formatVolume(delta)}`;

  const pillWidth = Math.min(barWidth, 48);
  const pillHeight = 13;

  ctx.fillStyle = isPositive ? 'rgba(8, 153, 129, 0.2)' : 'rgba(242, 54, 69, 0.2)';
  ctx.strokeStyle = isPositive ? '#089981' : '#f23645';
  ctx.lineWidth = 1;

  const left = x - pillWidth / 2;
  ctx.beginPath();
  ctx.roundRect 
    ? ctx.roundRect(left, pillY, pillWidth, pillHeight, 2) 
    : ctx.rect(left, pillY, pillWidth, pillHeight);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isPositive ? '#089981' : '#f23645';
  ctx.font = '9px "SF Mono", Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(deltaText, x, pillY + pillHeight / 2);
}

/**
 * Format volume numbers cleanly (e.g. 1.25, 450, 1.2K)
 */
function formatVolume(val) {
  const abs = Math.abs(val);
  if (abs === 0) return '0';
  if (abs >= 1000) {
    return (val / 1000).toFixed(1) + 'k';
  }
  if (abs >= 10) {
    return val.toFixed(1);
  }
  return val.toFixed(2);
}
