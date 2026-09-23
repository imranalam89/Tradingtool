import React from 'react';
import { X, Sliders, Check } from 'lucide-react';

export function SettingsModal({ 
  isOpen, 
  onClose, 
  settings, 
  onUpdateSettings,
  symbol 
}) {
  if (!isOpen) return null;

  const tickSizeOptions = symbol.includes('BTC')
    ? [5, 10, 25, 50]
    : symbol.includes('ETH')
    ? [0.5, 1.0, 2.5, 5.0]
    : [0.10, 0.25, 0.50, 1.00, 2.00]; // Gold / PAXG / XAUUSD

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[420px] rounded-lg border border-[#2a2e39] bg-[#1e222d] p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#d1d4dc]">
            <Sliders className="h-4 w-4 text-[#2962ff]" />
            Footprint & Order Flow Settings
          </div>
          <button 
            onClick={onClose}
            className="rounded p-1 text-[#787b86] hover:bg-[#2a2e39] hover:text-[#d1d4dc]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4 text-xs">
          {/* Cluster Tick Size */}
          <div>
            <label className="block font-medium text-[#787b86] mb-1.5">
              Cluster Bin / Tick Size ({symbol})
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {tickSizeOptions.map(size => (
                <button
                  key={size}
                  onClick={() => onUpdateSettings({ ...settings, tickSize: size })}
                  className={`py-1.5 rounded text-center font-mono font-medium transition-colors ${
                    settings.tickSize === size 
                      ? 'bg-[#2962ff] text-white' 
                      : 'bg-[#131722] text-[#d1d4dc] hover:bg-[#2a2e39]'
                  }`}
                >
                  ${size.toFixed(2)}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-[#787b86]">
              Smaller bins provide micro-level depth; larger bins aggregate volume into wider structural zones.
            </p>
          </div>

          {/* Imbalance Ratio */}
          <div>
            <label className="block font-medium text-[#787b86] mb-1.5">
              Volume Imbalance Ratio (Diagonal / Row)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[2.0, 3.0, 4.0].map(ratio => (
                <button
                  key={ratio}
                  onClick={() => onUpdateSettings({ ...settings, imbalanceRatio: ratio })}
                  className={`py-1.5 rounded font-mono font-medium text-center transition-colors ${
                    settings.imbalanceRatio === ratio 
                      ? 'bg-[#2962ff] text-white' 
                      : 'bg-[#131722] text-[#d1d4dc] hover:bg-[#2a2e39]'
                  }`}
                >
                  {ratio.toFixed(1)}x ({(ratio * 100).toFixed(0)}%)
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-[#787b86]">
              Triggers aggressive buying/selling imbalance highlight when volume exceeds the opposing side by this ratio.
            </p>
          </div>

          {/* Toggles */}
          <div className="pt-2 space-y-2.5 border-t border-[#2a2e39]">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[#d1d4dc]">Highlight POC (Point of Control)</span>
              <input 
                type="checkbox"
                checked={settings.showPOC}
                onChange={(e) => onUpdateSettings({ ...settings, showPOC: e.target.checked })}
                className="h-4 w-4 rounded border-[#363a45] bg-[#131722] text-[#2962ff] focus:ring-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[#d1d4dc]">Show Candle Delta Footer Badges</span>
              <input 
                type="checkbox"
                checked={settings.showDeltaFooter}
                onChange={(e) => onUpdateSettings({ ...settings, showDeltaFooter: e.target.checked })}
                className="h-4 w-4 rounded border-[#363a45] bg-[#131722] text-[#2962ff] focus:ring-0 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="flex items-center gap-1 rounded bg-[#2962ff] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1e53e5]"
          >
            <Check className="h-3.5 w-3.5" />
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
