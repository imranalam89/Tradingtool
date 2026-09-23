import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ChartContainer } from './components/ChartContainer';
import { SettingsModal } from './components/SettingsModal';
import { OrderFlowHUD } from './components/OrderFlowHUD';
import { DOMLadder } from './components/DOMLadder';
import { InstitutionalFlowPanel } from './components/InstitutionalFlowPanel';
import { BinanceWebSocketService } from './services/binanceWs';
import { DOMWebSocketService } from './services/domWs';
import { LiquidationWebSocketService } from './services/liquidationWs';
import { fetchOptionsGammaData } from './services/optionsService';
import { TickAggregator } from './services/tickAggregator';
import { fetchHistoricalKlines, fetchRecentAggTrades } from './services/binanceRest';
import { clearAllDrawings } from './chart/drawingTools';

export default function App() {
  const [symbol, setSymbol] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('1m');
  const [chartMode, setChartMode] = useState('FOOTPRINT'); // 'FOOTPRINT' or 'CANDLE'
  const [activeTool, setActiveTool] = useState('crosshair');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Panels toggles (ATAS / Bookmap style)
  const [isDOMOpen, setIsDOMOpen] = useState(true);
  const [isFlowOpen, setIsFlowOpen] = useState(false);
  const [subIndicator, setSubIndicator] = useState('DELTA'); // 'DELTA' or 'VOL'
  const [theme, setTheme] = useState('dark'); // 'dark' or 'light'

  const [settings, setSettings] = useState({
    tickSize: 0.50, // Default for PAXG/Gold
    imbalanceRatio: 3.0,
    showPOC: true,
    showDeltaFooter: true,
  });

  const [connectionStatus, setConnectionStatus] = useState({ status: 'CONNECTING' });
  const [latestPrice, setLatestPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(0);
  const [candleDelta, setCandleDelta] = useState(0);
  const [currentCandle, setCurrentCandle] = useState(null);

  // Real-time DOM & Order Book Depth Data
  const [depthData, setDepthData] = useState(null);

  // Real-time Trapped Traders Liquidations (capped at 50)
  const [liquidations, setLiquidations] = useState([]);

  // Options Gamma Exposure & Strike Walls
  const [optionsData, setOptionsData] = useState(null);

  const chartRef = useRef(null);
  const wsServiceRef = useRef(null);
  const domWsServiceRef = useRef(null);
  const liqWsServiceRef = useRef(null);
  const aggregatorRef = useRef(null);

  const lastStateUpdateRef = useRef(0);

  // Initialize Aggregator
  useEffect(() => {
    aggregatorRef.current = new TickAggregator({
      interval: timeframe,
      tickSize: settings.tickSize,
      onCandleUpdate: (candle) => {
        // 1. Direct instantaneous canvas update (0ms delay)
        if (chartRef.current && typeof chartRef.current.updateData === 'function') {
          chartRef.current.updateData(candle);
        }

        // 2. Throttle React state re-renders to 50ms to keep main thread blazing fast
        const now = performance.now();
        if (now - lastStateUpdateRef.current > 50) {
          lastStateUpdateRef.current = now;
          setLatestPrice(candle.close);
          const delta = candle.footprint?.delta || 0;
          setCandleDelta(delta);
          setCurrentCandle(candle);
        }
      },
      onNewCandle: (newCandle) => {
        if (chartRef.current && typeof chartRef.current.applyNewData === 'function' && aggregatorRef.current) {
          chartRef.current.applyNewData(aggregatorRef.current.getCandles());
        }
        setLatestPrice(newCandle.close);
        setCandleDelta(0);
        setCurrentCandle(newCandle);
      },
    });

    // Start Liquidation Feed
    liqWsServiceRef.current = new LiquidationWebSocketService({
      onLiquidation: (item) => {
        setLiquidations((prev) => [item, ...prev].slice(0, 50));
      }
    });
    liqWsServiceRef.current.connect();

    return () => {
      if (liqWsServiceRef.current) {
        liqWsServiceRef.current.disconnect();
      }
    };
  }, []);

  // Update aggregator settings when timeframe or tickSize change
  useEffect(() => {
    if (aggregatorRef.current) {
      aggregatorRef.current.setInterval(timeframe);
      aggregatorRef.current.setTickSize(settings.tickSize);
      if (chartRef.current && typeof chartRef.current.applyNewData === 'function') {
        chartRef.current.applyNewData(aggregatorRef.current.getCandles());
      }
    }
  }, [timeframe, settings.tickSize]);

  // Adjust tick size automatically when switching between Gold, BTC, ETH
  const handleSelectSymbol = (newSymbol) => {
    let newTick = 0.50;
    if (newSymbol.toUpperCase().includes('BTC')) {
      newTick = 5.0;
    } else if (newSymbol.toUpperCase().includes('ETH')) {
      newTick = 0.50;
    } else if (newSymbol.toUpperCase().includes('SOL')) {
      newTick = 0.10;
    }
    setSettings((prev) => ({ ...prev, tickSize: newTick }));
    setSymbol(newSymbol);
  };

  // Load Data and Connect WebSockets
  const loadDataAndConnect = useCallback(async (currentSymbol, currentTf) => {
    setConnectionStatus({ status: 'CONNECTING', symbol: currentSymbol });

    try {
      // 1. Historical klines
      const klines = await fetchHistoricalKlines(currentSymbol, currentTf, 150);
      
      // 2. Recent aggTrades for initial footprint clusters
      const recentTrades = await fetchRecentAggTrades(currentSymbol, 800);

      if (aggregatorRef.current) {
        aggregatorRef.current.setInterval(currentTf);
        aggregatorRef.current.setInitialCandles(klines);
        aggregatorRef.current.populateRecentAggTrades(recentTrades);

        const loadedCandles = aggregatorRef.current.getCandles();
        if (chartRef.current && typeof chartRef.current.applyNewData === 'function' && loadedCandles.length > 0) {
          chartRef.current.applyNewData(loadedCandles);
          if (chartMode === 'FOOTPRINT' && typeof chartRef.current.setBarSpace === 'function') {
            chartRef.current.setBarSpace(65);
          }
          if (typeof chartRef.current.scrollToRealTime === 'function') {
            chartRef.current.scrollToRealTime();
          }

          const lastCandle = loadedCandles[loadedCandles.length - 1];
          setLatestPrice(lastCandle.close);
          setCandleDelta(lastCandle.footprint?.delta || 0);
          setCurrentCandle(lastCandle);

          if (loadedCandles.length > 1) {
            const firstOpen = loadedCandles[0].open;
            const change = ((lastCandle.close - firstOpen) / firstOpen) * 100;
            setPriceChange(change);
          }

          // Fetch Options Gamma Exposure levels
          fetchOptionsGammaData(currentSymbol, lastCandle.close).then(setOptionsData);
        }
      }

      // 3. Connect AggTrades WebSocket
      if (!wsServiceRef.current) {
        wsServiceRef.current = new BinanceWebSocketService({
          onTrade: (trade) => {
            if (aggregatorRef.current) {
              aggregatorRef.current.pushTrade(trade);
            }
          },
          onStatusChange: (status) => {
            setConnectionStatus(status);
          },
        });
      }
      wsServiceRef.current.connect(currentSymbol);

      // 4. Connect DOM L2 100ms WebSocket
      if (!domWsServiceRef.current) {
        domWsServiceRef.current = new DOMWebSocketService({
          onDepthUpdate: (depth) => {
            setDepthData(depth);
          }
        });
      }
      domWsServiceRef.current.connect(currentSymbol);

    } catch (err) {
      console.error('Error loading data and connecting:', err);
      setConnectionStatus({ status: 'ERROR', error: err.message });
    }
  }, [chartMode]);

  useEffect(() => {
    loadDataAndConnect(symbol, timeframe);

    return () => {
      if (wsServiceRef.current) wsServiceRef.current.disconnect();
      if (domWsServiceRef.current) domWsServiceRef.current.disconnect();
    };
  }, [symbol, timeframe, loadDataAndConnect]);

  const handleChartReady = (chart) => {
    chartRef.current = chart;
    if (aggregatorRef.current) {
      const candles = aggregatorRef.current.getCandles();
      if (candles.length > 0) {
        chart.applyNewData(candles);
        if (chartMode === 'FOOTPRINT' && typeof chart.setBarSpace === 'function') {
          chart.setBarSpace(65);
        }
        chart.scrollToRealTime();
      }
    }
  };

  const handleResetZoom = () => {
    if (chartRef.current) {
      try {
        chartRef.current.setBarSpace(chartMode === 'FOOTPRINT' ? 60 : 12);
        chartRef.current.scrollToRealTime();
      } catch (e) {}
    }
  };

  const handleClearDrawings = () => {
    if (chartRef.current) {
      clearAllDrawings(chartRef.current);
      setActiveTool('crosshair');
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-[#131722] text-[#d1d4dc] overflow-hidden">
      {/* Top Navbar */}
      <Navbar
        symbol={symbol}
        onSelectSymbol={handleSelectSymbol}
        timeframe={timeframe}
        onSelectTimeframe={setTimeframe}
        chartMode={chartMode}
        onToggleChartMode={setChartMode}
        connectionStatus={connectionStatus}
        latestPrice={latestPrice}
        priceChange={priceChange}
        candleDelta={candleDelta}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onResetZoom={handleResetZoom}
        isDOMOpen={isDOMOpen}
        onToggleDOM={() => setIsDOMOpen(!isDOMOpen)}
        isFlowOpen={isFlowOpen}
        onToggleFlow={() => setIsFlowOpen(!isFlowOpen)}
        optionsData={optionsData}
        subIndicator={subIndicator}
        onToggleSubIndicator={() => setSubIndicator(prev => prev === 'DELTA' ? 'VOL' : 'DELTA')}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
      />

      {/* Main Workspace */}
      <div className="flex flex-1 w-full overflow-hidden relative">
        {/* Left Drawing Sidebar */}
        <Sidebar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          onClearDrawings={handleClearDrawings}
        />

        {/* Center Chart Canvas */}
        <main className="flex-1 h-full w-full relative">
          <ChartContainer
            chartMode={chartMode}
            activeTool={activeTool}
            onChartReady={handleChartReady}
            optionsData={optionsData}
            subIndicator={subIndicator}
            depthData={depthData}
            theme={theme}
          />

          {/* Real-time Order Flow HUD Telemetry */}
          <OrderFlowHUD 
            currentCandle={currentCandle} 
            chartMode={chartMode} 
          />
        </main>

        {/* Right Bookmap-style Depth of Market (DOM) Ladder */}
        {isDOMOpen && (
          <DOMLadder
            depthData={depthData}
            latestPrice={latestPrice}
            symbol={symbol}
            onClose={() => setIsDOMOpen(false)}
          />
        )}
      </div>

      {/* Bottom Institutional Flow & Liquidation Dock */}
      <InstitutionalFlowPanel
        liquidations={liquidations}
        optionsData={optionsData}
        isOpen={isFlowOpen}
        onToggle={() => setIsFlowOpen(!isFlowOpen)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        symbol={symbol}
      />
    </div>
  );
}
