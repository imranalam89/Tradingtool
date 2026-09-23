/**
 * Binance Futures Public Liquidation WebSocket Service
 * Stream: wss://fstream.binance.com/ws/!forceOrder@arr
 * Streams all real-time market liquidations across contracts, showing where traders are getting trapped/stopped out
 */

export class LiquidationWebSocketService {
  constructor({ onLiquidation, onStatusChange }) {
    this.onLiquidation = onLiquidation || (() => {});
    this.onStatusChange = onStatusChange || (() => {});
    this.ws = null;
    this.isManualClosed = false;
    this.reconnectTimer = null;
    this.targetSymbol = null; // optional filter, e.g. 'BTCUSDT'
  }

  connect(filterSymbol = null) {
    this.isManualClosed = false;
    this.targetSymbol = filterSymbol ? filterSymbol.toUpperCase().replace('/', '') : null;

    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const wsUrl = 'wss://fstream.binance.com/ws/!forceOrder@arr';
    this.onStatusChange({ status: 'CONNECTING' });

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.onStatusChange({ status: 'CONNECTED' });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Binance forceOrder format:
          // {
          //   "e": "forceOrder",
          //   "E": 1568014460893,
          //   "o": {
          //     "s": "BTCUSDT",
          //     "S": "SELL",        // SELL = Long position liquidated, BUY = Short position liquidated
          //     "o": "LIMIT",
          //     "f": "IOC",
          //     "q": "0.014",       // Quantity
          //     "p": "9910",        // Price
          //     "ap": "9910",       // Average price
          //     "X": "FILLED",
          //     "l": "0.014",
          //     "z": "0.014",
          //     "T": 1568014460893  // Trade time
          //   }
          // }
          if (data && data.o) {
            const order = data.o;
            const sym = order.s;
            const price = parseFloat(order.ap || order.p);
            const qty = parseFloat(order.q);
            const usdValue = price * qty;

            const liquidationItem = {
              id: `${sym}-${order.T}-${Math.random().toString(36).substr(2, 6)}`,
              time: order.T,
              symbol: sym,
              side: order.S === 'SELL' ? 'LONG_LIQ' : 'SHORT_LIQ', // When long is liquidated, exchange places a SELL
              price,
              qty,
              usdValue,
            };

            this.onLiquidation(liquidationItem);
          }
        } catch (err) {
          console.error('Error parsing liquidation message:', err);
        }
      };

      this.ws.onerror = (error) => {
        this.onStatusChange({ status: 'ERROR', error });
      };

      this.ws.onclose = () => {
        if (!this.isManualClosed) {
          this.onStatusChange({ status: 'DISCONNECTED' });
          this.reconnectTimer = setTimeout(() => this.connect(this.targetSymbol), 4000);
        }
      };
    } catch (err) {
      console.error('Failed to create Liquidation WebSocket:', err);
      this.reconnectTimer = setTimeout(() => this.connect(this.targetSymbol), 6000);
    }
  }

  setFilterSymbol(symbol) {
    this.targetSymbol = symbol ? symbol.toUpperCase().replace('/', '') : null;
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
}
