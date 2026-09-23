# Tradingtool: 100% Free Live ATAS & Bookmap Order Flow Terminal

An institutional-grade, zero-cost trading terminal running live in the browser. Powered by high-speed public WebSockets, KlineCharts, and React.

## Features

- **Volume Footprint (ATAS Style)**: Real-time Bid × Ask cluster candles, diagonal stacked buying/selling imbalances (3:1 ratio), Bar Point of Control (POC), and Cumulative Volume Delta (CVD).
- **Depth of Market (DOM) Ladder (Bookmap Style)**: 100ms sub-second Level 2 order book ladder displaying resting limit orders, visual liquidity heat bars, and dynamic bid/ask imbalance ratios.
- **Options Gamma Exposure (GEX) Walls**: Dynamic Call Wall (institutional resistance) and Put Wall (institutional support) calculated directly from live options open interest.
- **Live Liquidations / Trapped Traders Tape**: Streaming market stop-outs and liquidation sweeps showing where retail traders get trapped offside.
- **100% Free & Open**: Zero software subscriptions, zero exchange data fees, and zero API keys required. Connects directly to Binance public streams and Deribit options data.

## Supported Instruments

- **Gold (Spot)**: PAXGUSDT (1:1 physically backed spot gold with sub-second tick tape)
- **Bitcoin**: BTCUSDT
- **Ethereum**: ETHUSDT
- **Solana**: SOLUSDT

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Production build
npm run build
```

## Deploy to Vercel (Free)

1. Import this repository into [Vercel](https://vercel.com).
2. Framework Preset: **Vite** (detected automatically).
3. Click **Deploy**. Your terminal will be live at `https://your-tradingtool.vercel.app`.
