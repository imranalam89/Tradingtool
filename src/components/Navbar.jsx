import React, { useState, useRef, useEffect } from 'react';
import { 
  BarChart2, 
  Layers, 
  Sliders, 
  Search, 
  ChevronDown, 
  RefreshCw,
  Maximize2,
  Activity,
  Flame,
  ShieldAlert
} from 'lucide-react';

const POPULAR_SYMBOLS = [
  { symbol: 'XAUUSD', name: 'Gold / USD (Spot)', badge: 'Gold Spot' },
  { symbol: 'PAXGUSDT', name: 'Paxos Gold / Tether', badge: 'Proxy 1:1' },
  { symbol: 'BTCUSDT', name: 'Bitcoin / Tether', badge: 'Crypto' },
  { symbol: 'ETHUSDT', name: 'Ethereum / Tether', badge: 'Crypto' },
  { symbol: 'SOLUSDT', name: 'Solana / Tether', badge: 'Crypto' },
];

const TIMEFRAMES = [
  { id: '1m', label: '1m' },
  { id: '5m', label: '5m' },
  { id: '15m', label: '15m' },
  { id: '1h', label: '1H' },
];

export function Navbar({
  symbol,
  onSelectSymbol,
  timeframe,
  onSelectTimeframe,
  chartMode, // 'CANDLE' or 'FOOTPRINT'
  onToggleChartMode,
  connectionStatus,
  latestPrice,
  priceChange,
  candleDelta,
  onOpenSettings,
  onResetZoom,
  isDOMOpen,
  onToggleDOM,
  isFlowOpen,
  onToggleFlow,
  optionsData,
  subIndicator = 'DELTA',
  onToggleSubIndicator,
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCustomSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    const clean = searchInput.trim().toUpperCase().replace('/', '');
    onSelectSymbol(clean);
    setIsSearchOpen(false);
    setSearchInput('');
  };

  const isUp = (priceChange || 0) >= 0;

  return (
    <header className="flex h-12 w-full items-center justify-between border-b border-[#2a2e39] bg-[#131722] px-3 select-none">
      {/* Left Section: Brand, Symbol & Timeframes */}
      <div className="flex items-center gap-2">
        {/* Brand / Logo */}
        <div className="flex items-center gap-1.5 pr-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-[#2962ff] text-white font-bold text-xs shadow-md">
            ATAS
          </div>
          <span className="text-xs font-semibold tracking-wide text-white hidden sm:inline">
            LIVE TERMINAL
          </span>
        </div>

        <div className="tv-divider" />

        {/* Symbol Selector Dropdown */}
        <div className="relative" ref={searchRef}>
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-bold text-white hover:bg-[#2a2e39] transition-colors"
          >
            <span className="font-mono text-[#f0b90b]">{symbol}</span>
            <span className="text-[10px] text-[#787b86] font-normal hidden md:inline">
              {symbol === 'XAUUSD' || symbol === 'PAXGUSDT' ? 'Binance 24/7 Gold' : 'Binance Spot'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-[#787b86]" />
          </button>

          {isSearchOpen && (
            <div className="absolute top-10 left-0 z-50 w-72 rounded-lg border border-[#2a2e39] bg-[#1e222d] p-2 shadow-2xl">
              <form onSubmit={handleCustomSearchSubmit} className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#787b86]" />
                <input
                  type="text"
                  placeholder="Search ticker (e.g. BTCUSDT, PAXGUSDT)"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full rounded bg-[#131722] py-1.5 pl-8 pr-3 text-xs text-[#d1d4dc] placeholder-[#787b86] border border-[#2a2e39] focus:border-[#2962ff] focus:outline-none"
                  autoFocus
                />
              </form>

              <div className="text-[10px] font-semibold text-[#787b86] px-2 py-1 uppercase tracking-wider">
                Instruments
              </div>

              <div className="space-y-0.5">
                {POPULAR_SYMBOLS.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => {
                      onSelectSymbol(item.symbol);
                      setIsSearchOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs text-left transition-colors ${
                      symbol === item.symbol 
                        ? 'bg-[#2962ff]/20 text-[#2962ff] font-semibold' 
                        : 'text-[#d1d4dc] hover:bg-[#2a2e39]'
                    }`}
                  >
                    <div>
                      <span className="font-mono font-bold text-white">{item.symbol}</span>
                      <span className="ml-2 text-[11px] text-[#787b86]">{item.name}</span>
                    </div>
                    <span className="rounded bg-[#131722] px-1.5 py-0.5 text-[9px] text-[#787b86] border border-[#2a2e39]">
                      {item.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="tv-divider" />

        {/* Timeframe Selector */}
        <div className="flex items-center bg-[#1e222d] p-0.5 rounded border border-[#2a2e39]">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => onSelectTimeframe(tf.id)}
              className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
                timeframe === tf.id
                  ? 'bg-[#2962ff] text-white shadow-sm'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="tv-divider" />

        {/* Chart Mode Toggle */}
        <div className="flex items-center bg-[#1e222d] p-0.5 rounded border border-[#2a2e39]">
          <button
            onClick={() => onToggleChartMode('CANDLE')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-all ${
              chartMode === 'CANDLE'
                ? 'bg-[#2a2e39] text-white shadow-sm font-semibold'
                : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
            title="Candlestick view"
          >
            <BarChart2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Candles</span>
          </button>

          <button
            onClick={() => onToggleChartMode('FOOTPRINT')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-all ${
              chartMode === 'FOOTPRINT'
                ? 'bg-[#2962ff] text-white shadow-md font-semibold'
                : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
            title="Volume Footprint order flow view"
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="font-semibold">Footprint</span>
          </button>
        </div>

        {/* Footprint Settings */}
        <button
          onClick={onOpenSettings}
          className="rounded p-1.5 text-[#787b86] hover:bg-[#2a2e39] hover:text-[#d1d4dc] transition-colors"
          title="Cluster & Imbalance Settings"
        >
          <Sliders className="h-4 w-4" />
        </button>

        <div className="tv-divider hidden sm:block" />

        {/* DOM Toggle */}
        <button
          onClick={onToggleDOM}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
            isDOMOpen
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
              : 'bg-[#1e222d] text-[#787b86] border-[#2a2e39] hover:text-white'
          }`}
          title="Toggle Bookmap L2 DOM Ladder"
        >
          <Activity className="h-3.5 w-3.5 text-amber-400" />
          <span className="hidden md:inline">DOM Ladder</span>
        </button>

        {/* Flow Panel Toggle */}
        <button
          onClick={onToggleFlow}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
            isFlowOpen
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
              : 'bg-[#1e222d] text-[#787b86] border-[#2a2e39] hover:text-white'
          }`}
          title="Toggle Institutional Options Flow & Liquidations Dock"
        >
          <Flame className="h-3.5 w-3.5 text-rose-400" />
          <span className="hidden md:inline">Flow / Liq</span>
        </button>

        <div className="tv-divider hidden sm:block" />

        {/* Sub-pane Indicator: Delta Bar vs Volume */}
        <button
          onClick={onToggleSubIndicator}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-semibold rounded border transition-colors ${
            subIndicator === 'DELTA'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
              : 'bg-[#1e222d] text-[#787b86] border-[#2a2e39] hover:text-white'
          }`}
          title="Click to toggle between Delta Bars and Standard Volume"
        >
          <span>{subIndicator === 'DELTA' ? 'Δ DELTA BAR' : 'VOLUME'}</span>
        </button>
      </div>

      {/* Right Section: Live Telemetry, Connection State & Controls */}
      <div className="flex items-center gap-3">
        {/* Real-time Ticker Metrics */}
        {latestPrice && (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className={`text-sm font-bold tracking-tight ${isUp ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                ${latestPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-[11px] ${isUp ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                {isUp ? '+' : ''}{(priceChange || 0).toFixed(2)}%
              </span>
            </div>

            {/* Candle Delta HUD */}
            <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono bg-[#1e222d] px-2 py-0.5 rounded border border-[#2a2e39]">
              <span className="text-[#787b86]">Bar Δ:</span>
              <span className={(candleDelta || 0) >= 0 ? 'text-[#089981] font-bold' : 'text-[#f23645] font-bold'}>
                {(candleDelta || 0) >= 0 ? '+' : ''}{(candleDelta || 0).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* WebSocket Connection Status Badge */}
        <div 
          className="flex items-center gap-1.5 rounded-full bg-[#1e222d] px-2.5 py-1 text-[10px] font-medium border border-[#2a2e39]"
          title={connectionStatus.url || 'Binance L2 Stream'}
        >
          {connectionStatus.status === 'CONNECTED' ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#089981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#089981]"></span>
              </span>
              <span className="text-[#089981] font-semibold">LIVE</span>
            </>
          ) : connectionStatus.status === 'CONNECTING' || connectionStatus.status === 'RECONNECTING' ? (
            <>
              <RefreshCw className="h-2.5 w-2.5 animate-spin text-[#f0b90b]" />
              <span className="text-[#f0b90b]">SYNC</span>
            </>
          ) : (
            <span className="text-[#f23645]">OFFLINE</span>
          )}
        </div>

        {/* Reset Zoom */}
        <button
          onClick={onResetZoom}
          className="rounded p-1.5 text-[#787b86] hover:bg-[#2a2e39] hover:text-[#d1d4dc] transition-colors"
          title="Reset Zoom / Fit to Screen"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
