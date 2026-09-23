import React, { useState } from 'react';
import { Flame, Activity, ChevronUp, ChevronDown, ShieldAlert, TrendingUp, TrendingDown } from 'lucide-react';

export function InstitutionalFlowPanel({ liquidations, optionsData, isOpen, onToggle }) {
  const [activeTab, setActiveTab] = useState('LIQUIDATIONS'); // 'LIQUIDATIONS' or 'OPTIONS_GEX'

  return (
    <div className="border-t border-gray-800 bg-[#10131a] flex flex-col transition-all duration-200">
      {/* Dock Bar / Header */}
      <div className="h-8 px-3 bg-[#151922] border-b border-gray-800 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 font-semibold text-gray-200">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>INSTITUTIONAL FLOW</span>
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => { setActiveTab('LIQUIDATIONS'); if (!isOpen) onToggle(); }}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'LIQUIDATIONS' && isOpen
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Flame className="w-3 h-3 text-rose-400" />
              Trapped Liquidations ({liquidations?.length || 0})
            </button>

            <button
              onClick={() => { setActiveTab('OPTIONS_GEX'); if (!isOpen) onToggle(); }}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'OPTIONS_GEX' && isOpen
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <ShieldAlert className="w-3 h-3 text-indigo-400" />
              Options GEX & Walls
            </button>
          </div>
        </div>

        {/* Quick Metrics & Collapse Toggle */}
        <div className="flex items-center gap-4 text-[11px]">
          {optionsData?.callWall && (
            <div className="hidden sm:flex items-center gap-2 text-gray-400">
              <span>Call Wall: <strong className="text-emerald-400">${optionsData.callWall}</strong></span>
              <span>Put Wall: <strong className="text-rose-400">${optionsData.putWall}</strong></span>
              <span className={`px-1 rounded text-[10px] ${
                optionsData.regime === 'LONG_GAMMA' 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}>
                {optionsData.regime || 'GAMMA BALANCED'}
              </span>
            </div>
          )}

          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-white/5"
            title={isOpen ? "Collapse panel" : "Expand panel"}
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content Body */}
      {isOpen && (
        <div className="h-44 overflow-y-auto font-mono text-xs p-2 scrollbar-thin scrollbar-thumb-gray-800">
          {activeTab === 'LIQUIDATIONS' && (
            <div className="flex flex-col gap-1">
              {(!liquidations || liquidations.length === 0) ? (
                <div className="text-center py-6 text-gray-500 text-xs">
                  Listening for real-time market liquidations on Binance Futures...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-gray-500 text-[10px] border-b border-gray-800/80">
                        <th className="py-1 px-2">TIME</th>
                        <th className="py-1 px-2">CONTRACT</th>
                        <th className="py-1 px-2">TYPE</th>
                        <th className="py-1 px-2">PRICE</th>
                        <th className="py-1 px-2">SIZE</th>
                        <th className="py-1 px-2 text-right">VALUE (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {liquidations.map((liq) => {
                        const isLongLiq = liq.side === 'LONG_LIQ';
                        const timeStr = new Date(liq.time).toLocaleTimeString();

                        return (
                          <tr key={liq.id} className="hover:bg-white/5">
                            <td className="py-1 px-2 text-gray-400">{timeStr}</td>
                            <td className="py-1 px-2 font-bold text-gray-200">{liq.symbol}</td>
                            <td className="py-1 px-2">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isLongLiq
                                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/70'
                                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/70'
                              }`}>
                                {isLongLiq ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                                {isLongLiq ? 'LONG LIQUIDATED' : 'SHORT SQUEEZED'}
                              </span>
                            </td>
                            <td className="py-1 px-2 text-gray-300">${liq.price.toFixed(2)}</td>
                            <td className="py-1 px-2 text-gray-400">{liq.qty.toFixed(4)}</td>
                            <td className={`py-1 px-2 text-right font-bold ${
                              liq.usdValue > 50000 ? 'text-amber-300' : 'text-gray-300'
                            }`}>
                              ${Math.round(liq.usdValue).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'OPTIONS_GEX' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-2">
              <div className="bg-[#161a24] p-3 rounded border border-gray-800">
                <div className="text-gray-400 text-[10px] mb-1">CALL WALL (RESISTANCE)</div>
                <div className="text-lg font-bold text-emerald-400">
                  ${optionsData?.callWall ? optionsData.callWall.toLocaleString() : '--'}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  Highest Call Open Interest. Dealers heavily short calls above this level.
                </div>
              </div>

              <div className="bg-[#161a24] p-3 rounded border border-gray-800">
                <div className="text-gray-400 text-[10px] mb-1">PUT WALL (SUPPORT)</div>
                <div className="text-lg font-bold text-rose-400">
                  ${optionsData?.putWall ? optionsData.putWall.toLocaleString() : '--'}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  Highest Put Open Interest. Institutional downside protection wall.
                </div>
              </div>

              <div className="bg-[#161a24] p-3 rounded border border-gray-800">
                <div className="text-gray-400 text-[10px] mb-1">MAX PAIN LEVEL</div>
                <div className="text-lg font-bold text-amber-400">
                  ${optionsData?.maxPain ? optionsData.maxPain.toLocaleString() : '--'}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  Strike where option buyers lose the maximum premium at expiration.
                </div>
              </div>

              <div className="bg-[#161a24] p-3 rounded border border-gray-800">
                <div className="text-gray-400 text-[10px] mb-1">PUT / CALL RATIO (PCR)</div>
                <div className="text-lg font-bold text-cyan-400">
                  {optionsData?.pcr || '0.85'}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  Total Open Interest: {optionsData?.totalCallOI?.toLocaleString()} Calls vs {optionsData?.totalPutOI?.toLocaleString()} Puts
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
