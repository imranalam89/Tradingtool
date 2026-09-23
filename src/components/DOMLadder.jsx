import React, { useRef, useEffect } from 'react';
import { Layers, ShieldAlert, ArrowUpDown } from 'lucide-react';

export const DOMLadder = React.memo(function DOMLadder({ depthData, latestPrice, symbol, onClose }) {
  const ladderContainerRef = useRef(null);

  const bids = depthData?.bids || [];
  const asks = depthData?.asks || [];
  const maxQty = depthData?.maxQty || 1;
  const spread = depthData?.spread || 0;
  const imbalanceRatio = depthData?.imbalanceRatio ?? 50;

  // Combine and sort prices for the ladder: Asks (descending) -> Spread/Price -> Bids (descending)
  const displayAsks = [...asks].reverse(); // Highest ask down to lowest ask (near market)
  const displayBids = [...bids];          // Highest bid (near market) down to lowest bid

  return (
    <div className="w-72 bg-[#12151c] border-l border-gray-800 flex flex-col h-full select-none text-xs font-mono">
      {/* DOM Header */}
      <div className="p-2 border-b border-gray-800 flex items-center justify-between bg-[#161a23]">
        <div className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-gray-200">DOM LADDER</span>
          <span className="text-[10px] bg-amber-950/70 text-amber-300 px-1 py-0.5 rounded border border-amber-800/60">
            L2 100ms
          </span>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-xs px-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Bookmap Liquidity Gauge */}
      <div className="px-2 py-1.5 bg-[#0f1218] border-b border-gray-800/80">
        <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
          <span className="text-emerald-400 font-bold">{imbalanceRatio.toFixed(1)}% BIDS</span>
          <span className="text-gray-500 flex items-center gap-0.5">
            <ArrowUpDown className="w-3 h-3" /> SPREAD: {spread > 0 ? spread.toFixed(2) : '--'}
          </span>
          <span className="text-rose-400 font-bold">{(100 - imbalanceRatio).toFixed(1)}% ASKS</span>
        </div>
        {/* Visual Ratio Bar */}
        <div className="w-full h-1.5 bg-rose-900/60 rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-emerald-500 transition-all duration-150"
            style={{ width: `${Math.min(100, Math.max(0, imbalanceRatio))}%` }}
          />
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 px-2 py-1 bg-[#1a1e28] text-[10px] font-bold text-gray-400 border-b border-gray-800">
        <div className="text-left text-emerald-400">BID VOL</div>
        <div className="text-center text-gray-300">PRICE</div>
        <div className="text-right text-rose-400">ASK VOL</div>
      </div>

      {/* Price Ladder Rows */}
      <div 
        ref={ladderContainerRef}
        className="flex-1 overflow-y-auto divide-y divide-gray-800/30 scrollbar-thin scrollbar-thumb-gray-800"
      >
        {/* ASKS (Sells) */}
        {displayAsks.map((row, idx) => {
          const depthPercent = Math.min(100, (row.qty / maxQty) * 100);
          const isHeavyWall = depthPercent > 65;

          return (
            <div 
              key={`ask-${idx}`}
              className="grid grid-cols-3 px-2 py-0.5 hover:bg-white/5 relative items-center"
            >
              {/* Bid Column (Empty for asks) */}
              <div className="text-left text-gray-600">-</div>

              {/* Price */}
              <div className={`text-center font-semibold ${isHeavyWall ? 'text-rose-300 font-bold' : 'text-gray-300'}`}>
                {row.price.toFixed(2)}
              </div>

              {/* Ask Volume & Bookmap Heat Meter */}
              <div className="text-right relative pr-1">
                {/* Visual Liquidity Depth Bar */}
                <div 
                  className={`absolute right-0 top-0 bottom-0 pointer-events-none transition-all duration-100 ${
                    isHeavyWall ? 'bg-rose-500/40 border-r-2 border-rose-400' : 'bg-rose-500/20'
                  }`}
                  style={{ width: `${depthPercent}%` }}
                />
                <span className={`relative z-10 ${isHeavyWall ? 'text-rose-200 font-bold' : 'text-rose-400'}`}>
                  {row.qty.toFixed(row.qty < 1 ? 3 : 1)}
                </span>
              </div>
            </div>
          );
        })}

        {/* CURRENT MARKET SPREAD ROW */}
        <div className="py-1 px-2 bg-amber-500/10 border-y border-amber-500/30 text-center flex items-center justify-between text-[11px] font-bold text-amber-300">
          <span className="text-[10px] text-emerald-400">
            {depthData?.bestBid ? depthData.bestBid.toFixed(2) : '--'}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            {latestPrice ? latestPrice.toFixed(2) : '--'}
          </span>
          <span className="text-[10px] text-rose-400">
            {depthData?.bestAsk ? depthData.bestAsk.toFixed(2) : '--'}
          </span>
        </div>

        {/* BIDS (Buys) */}
        {displayBids.map((row, idx) => {
          const depthPercent = Math.min(100, (row.qty / maxQty) * 100);
          const isHeavyWall = depthPercent > 65;

          return (
            <div 
              key={`bid-${idx}`}
              className="grid grid-cols-3 px-2 py-0.5 hover:bg-white/5 relative items-center"
            >
              {/* Bid Volume & Bookmap Heat Meter */}
              <div className="text-left relative pl-1">
                <div 
                  className={`absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-100 ${
                    isHeavyWall ? 'bg-emerald-500/40 border-l-2 border-emerald-400' : 'bg-emerald-500/20'
                  }`}
                  style={{ width: `${depthPercent}%` }}
                />
                <span className={`relative z-10 ${isHeavyWall ? 'text-emerald-200 font-bold' : 'text-emerald-400'}`}>
                  {row.qty.toFixed(row.qty < 1 ? 3 : 1)}
                </span>
              </div>

              {/* Price */}
              <div className={`text-center font-semibold ${isHeavyWall ? 'text-emerald-300 font-bold' : 'text-gray-300'}`}>
                {row.price.toFixed(2)}
              </div>

              {/* Ask Column (Empty for bids) */}
              <div className="text-right text-gray-600">-</div>
            </div>
          );
        })}
      </div>

      {/* Total Resting Liquidity Summary Footer */}
      <div className="p-2 border-t border-gray-800 bg-[#161a23] text-[10px] text-gray-400 flex justify-between">
        <span className="text-emerald-400">
          Σ Bid: <strong className="text-gray-200">{(depthData?.totalBidVol || 0).toFixed(1)}</strong>
        </span>
        <span className="text-rose-400">
          Σ Ask: <strong className="text-gray-200">{(depthData?.totalAskVol || 0).toFixed(1)}</strong>
        </span>
      </div>
    </div>
  );
});
