/**
 * Binance Public WebSocket Service for Depth of Market (DOM) L2 Order Book
 * Stream: wss://stream.binance.com:9443/ws/<symbol>@depth20@100ms
 * Provides top 20 bids and asks updated every 100ms
 */

export class DOMWebSocketService {
  constructor({ onDepthUpdate, onStatusChange }) {
    this.onDepthUpdate = onDepthUpdate || (() => {});
    this.onStatusChange = onStatusChange || (() => {});
    this.ws = null;
    this.symbol = 'paxgusdt';
    this.isManualClosed = false;
    this.reconnectTimer = null;
  }

  connect(symbol = 'paxgusdt') {
    this.isManualClosed = false;
    let streamSymbol = symbol.toLowerCase().replace('/', '');
    if (streamSymbol === 'xauusd') {
      streamSymbol = 'paxgusdt';
    }
    this.symbol = streamSymbol;

    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const wsUrl = `wss://stream.binance.com:9443/ws/${this.symbol}@depth20@100ms`;
    this.onStatusChange({ status: 'CONNECTING', symbol: this.symbol });

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.onStatusChange({ status: 'CONNECTED', symbol: this.symbol });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Binance depth20 format:
          // {
          //   "lastUpdateId": 160,
          //   "bids": [ [ "0.0024", "10" ], ... ],
          //   "asks": [ [ "0.0026", "100" ], ... ]
          // }
          if (data && data.bids && data.asks) {
            const parsedBids = data.bids.map(([price, qty]) => ({
              price: parseFloat(price),
              qty: parseFloat(qty),
            }));
            const parsedAsks = data.asks.map(([price, qty]) => ({
              price: parseFloat(price),
              qty: parseFloat(qty),
            }));

            // Calculate aggregate depth and liquidity metrics
            const totalBidVol = parsedBids.reduce((acc, b) => acc + b.qty, 0);
            const totalAskVol = parsedAsks.reduce((acc, a) => acc + a.qty, 0);
            const maxBidQty = Math.max(...parsedBids.map(b => b.qty), 0.0001);
            const maxAskQty = Math.max(...parsedAsks.map(a => a.qty), 0.0001);
            const bestBid = parsedBids[0]?.price || 0;
            const bestAsk = parsedAsks[0]?.price || 0;
            const spread = bestAsk > 0 && bestBid > 0 ? (bestAsk - bestBid) : 0;

            this.onDepthUpdate({
              lastUpdateId: data.lastUpdateId,
              bids: parsedBids,
              asks: parsedAsks,
              totalBidVol,
              totalAskVol,
              maxQty: Math.max(maxBidQty, maxAskQty),
              bestBid,
              bestAsk,
              spread,
              imbalanceRatio: (totalBidVol + totalAskVol > 0)
                ? (totalBidVol / (totalBidVol + totalAskVol)) * 100
                : 50,
            });
          }
        } catch (err) {
          console.error('Error parsing depth20 message:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.warn('DOM WebSocket error:', error);
        this.onStatusChange({ status: 'ERROR', error });
      };

      this.ws.onclose = () => {
        if (!this.isManualClosed) {
          this.onStatusChange({ status: 'DISCONNECTED' });
          this.reconnectTimer = setTimeout(() => this.connect(this.symbol), 3000);
        }
      };
    } catch (err) {
      console.error('Failed to create DOM WebSocket:', err);
      this.reconnectTimer = setTimeout(() => this.connect(this.symbol), 5000);
    }
  }

  disconnect() {
    this.isManualClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
      this.ws = null;
    }
    this.onStatusChange({ status: 'CLOSED' });
  }

  switchSymbol(newSymbol) {
    this.disconnect();
    this.connect(newSymbol);
  }
}
