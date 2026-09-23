import React, { useState } from 'react';
import { Activity, ChevronUp, ChevronDown, Zap } from 'lucide-react';

export const OrderFlowHUD = React.memo(function OrderFlowHUD({ currentCandle, chartMode }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!currentCandle) return null;

  const fp = currentCandle.footprint || {};
  const delta = fp.delta || 0;
  const totalBidVol = fp.totalBidVol || 0;
  const totalAskVol = fp.totalAskVol || 0;
  const totalVol = currentCandle.volume || 0;
  const pocPrice = fp.pocPrice || currentCandle.close;

  const buyRatio = totalVol > 0 ? (totalAskVol / totalVol) * 100 : 50;
  const sellRatio = 100 - buyRatio;
  const isPositiveDelta = delta >= 0;

  return (
    <div className="absolute bottom-6 left-16 z-20 select-none">
      <div className="rounded-lg border border-[#2a2e39] bg-[#1e222d]/90 p-2.5 shadow-2xl backdrop-blur-md text-xs font-mono w-64 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2a2e39]/60 pb-1.5 mb-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#d1d4dc]">
            <Zap className="h-3.5 w-3.5 text-[#f0b90b]" />
            <span>ORDER FLOW TELEMETRY</span>
          </div>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[#787b86] hover:text-white"
          >
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>

        {isExpanded && (
          <div className="space-y-2">
            {/* Active Bar Delta */}
            <div className="flex items-center justify-between">
              <span className="text-[#787b86]">Bar Delta (Δ):</span>
              <span className={`font-bold ${isPositiveDelta ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                {isPositiveDelta ? '+' : ''}{delta.toFixed(2)}
              </span>
            </div>

            {/* POC (Point of Control) */}
            <div className="flex items-center justify-between">
              <span className="text-[#787b86]">Cluster POC:</span>
              <span className="text-[#ffb703] font-bold">
                ${pocPrice.toFixed(2)}
              </span>
            </div>

            {/* Buy / Sell Volume Split Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[#787b86]">
                <span className="text-[#f23645]">Sell: {totalBidVol.toFixed(1)} ({sellRatio.toFixed(0)}%)</span>
                <span className="text-[#089981]">Buy: {totalAskVol.toFixed(1)} ({buyRatio.toFixed(0)}%)</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#131722] flex">
                <div 
                  className="h-full bg-[#f23645] transition-all duration-200" 
                  style={{ width: `${sellRatio}%` }} 
                />
                <div 
                  className="h-full bg-[#089981] transition-all duration-200" 
                  style={{ width: `${buyRatio}%` }} 
                />
              </div>
            </div>

            {/* Total Volume */}
            <div className="flex items-center justify-between text-[10px] text-[#787b86] pt-1 border-t border-[#2a2e39]/60">
              <span>Total Bar Volume:</span>
              <span className="text-white font-medium">{totalVol.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
