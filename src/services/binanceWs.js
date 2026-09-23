/**
 * Binance Public WebSocket Service for Real-Time Order Flow AggTrades
 * wss://stream.binance.com:9443/ws/<symbol>@aggTrade
 */

export class BinanceWebSocketService {
  constructor({ onTrade, onStatusChange }) {
    this.onTrade = onTrade || (() => {});
    this.onStatusChange = onStatusChange || (() => {});
    this.ws = null;
    this.symbol = 'paxgusdt';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 20;
    this.baseReconnectDelay = 1000;
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.isManualClosed = false;
    this.lastTradeTime = 0;
  }

  /**
   * Connect to Binance aggTrade stream
   * @param {string} symbol - e.g. 'paxgusdt', 'btcusdt'
   */
  connect(symbol = 'paxgusdt') {
    this.isManualClosed = false;
    // Map XAUUSD to Binance PAXGUSDT gold proxy
    let streamSymbol = symbol.toLowerCase().replace('/', '');
    if (streamSymbol === 'xauusd') {
      streamSymbol = 'paxgusdt';
    }
    this.symbol = streamSymbol;

    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const wsUrl = `wss://stream.binance.com:9443/ws/${this.symbol}@aggTrade`;
    this.onStatusChange({ status: 'CONNECTING', symbol: this.symbol, url: wsUrl });

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.onStatusChange({ status: 'CONNECTED', symbol: this.symbol, url: wsUrl });
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Binance aggTrade format:
          // {
          //   "e": "aggTrade",
          //   "E": 123456789,   // Event time
          //   "s": "PAXGUSDT",  // Symbol
          //   "p": "2714.20",   // Price
          //   "q": "0.0150",    // Quantity
          //   "T": 123456785,   // Trade time
          //   "m": true,        // Buyer is maker? true = aggressive SELL (bid hit), false = aggressive BUY (ask lift)
          // }
          if (data && data.e === 'aggTrade') {
            this.lastTradeTime = Date.now();
            this.onTrade(data);
          }
        } catch (err) {
          console.error('Error parsing aggTrade message:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.warn('Binance WebSocket error:', error);
        this.onStatusChange({ status: 'ERROR', error });
      };

      this.ws.onclose = (event) => {
        this.stopHeartbeat();
        if (!this.isManualClosed) {
          this.onStatusChange({ status: 'DISCONNECTED', code: event.code });
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.isManualClosed) return;
    this.reconnectAttempts++;
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      this.onStatusChange({ status: 'FAILED', message: 'Max reconnect attempts reached' });
      return;
    }

    const delay = Math.min(30000, this.baseReconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1));
    this.onStatusChange({ 
      status: 'RECONNECTING', 
      attempt: this.reconnectAttempts, 
      nextDelayMs: delay 
    });

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.symbol);
    }, delay);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    // Check every 25 seconds if connection is alive
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Binance responds to pong or simple ping frame
        try {
          this.ws.send(JSON.stringify({ method: 'ping' }));
        } catch (e) {}
      }
    }, 25000);
  }

  stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  disconnect() {
    this.isManualClosed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    this.onStatusChange({ status: 'CLOSED' });
  }

  switchSymbol(newSymbol) {
    this.disconnect();
    this.connect(newSymbol);
  }
}
