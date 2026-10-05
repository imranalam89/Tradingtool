/**
 * Tradovate API Integration Service
 * Connects to Tradovate REST and WebSocket APIs (Demo and Live environments)
 * Provides real CME Futures Level 2 Market Depth (GC Gold, NQ Nasdaq, ES S&P 500, etc.)
 * Official Docs: https://api.tradovate.com/
 */

export class TradovateService {
  constructor({ onDepthUpdate, onQuoteUpdate, onStatusChange }) {
    this.onDepthUpdate = onDepthUpdate || (() => {});
    this.onQuoteUpdate = onQuoteUpdate || (() => {});
    this.onStatusChange = onStatusChange || (() => {});

    this.env = 'demo'; // 'demo' or 'live'
    this.ws = null;
    this.accessToken = null;
    this.isConnected = false;
    this.activeSymbol = 'GC';
    this.reqId = 1;
    this.heartbeatTimer = null;
  }

  getRestUrl() {
    return this.env === 'live' 
      ? 'https://live.tradovateapi.com/v1' 
      : 'https://demo.tradovateapi.com/v1';
  }

  getWsUrl() {
    return this.env === 'live'
      ? 'wss://live.tradovateapi.com/v1/websocket'
      : 'wss://demo.tradovateapi.com/v1/websocket';
  }

  /**
   * Authenticate with Tradovate Credentials
   * Can use username/password + app credentials OR directly an Access Token
   */
  async authenticate({ username, password, appId, appVersion = '1.0', cid, sec, accessToken, env = 'demo' }) {
    this.env = env;
    this.onStatusChange({ status: 'AUTHENTICATING', env: this.env });

    if (accessToken) {
      this.accessToken = accessToken;
      return this.connectWebSocket();
    }

    try {
      const resp = await fetch(`${this.getRestUrl()}/auth/accesstokenRequest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: username,
          password: password,
          appId: appId || 'TradovateWeb',
          appVersion: appVersion,
          cid: cid ? Number(cid) : undefined,
          sec: sec || undefined,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || data['p-ticket'] || data.errorText) {
        throw new Error(data.errorText || data.message || 'Tradovate authentication failed');
      }

      this.accessToken = data.accessToken;
      return this.connectWebSocket();
    } catch (err) {
      this.onStatusChange({ status: 'ERROR', error: err.message });
      throw err;
    }
  }

  /**
   * Connect to Tradovate Market Data WebSocket
   */
  connectWebSocket() {
    if (!this.accessToken) {
      throw new Error('Access token required to connect to Tradovate WebSocket');
    }

    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }

    this.onStatusChange({ status: 'CONNECTING', env: this.env });

    try {
      this.ws = new WebSocket(this.getWsUrl());

      this.ws.onopen = () => {
        // Tradovate requires sending authorize packet as first message
        this.sendAuthorize();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.warn('Tradovate WS Error:', error);
        this.onStatusChange({ status: 'ERROR', error: 'WebSocket connection failed' });
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.stopHeartbeat();
        this.onStatusChange({ status: 'DISCONNECTED' });
      };
    } catch (err) {
      this.onStatusChange({ status: 'ERROR', error: err.message });
      throw err;
    }
  }

  sendAuthorize() {
    const authMsg = `authorize\n${this.reqId++}\n\n${this.accessToken}`;
    this.ws.send(authMsg);
  }

  handleMessage(raw) {
    // Tradovate WebSocket framing:
    // "o" = Open frame
    // "h" = Heartbeat
    // "a[...]" = Array of payload packets
    if (raw === 'o') {
      this.startHeartbeat();
      return;
    }

    if (raw === 'h') {
      return;
    }

    if (raw.startsWith('a[')) {
      try {
        const packets = JSON.parse(raw.substring(1));
        packets.forEach((pkt) => {
          this.processPacket(pkt);
        });
      } catch (e) {
        console.error('Error parsing Tradovate packet:', e);
      }
    }
  }

  processPacket(pkt) {
    // Authorization response (200 OK)
    if (pkt.s === 200 && pkt.d && pkt.d.userId) {
      this.isConnected = true;
      this.onStatusChange({ status: 'CONNECTED', user: pkt.d.name, env: this.env });
      // Automatically subscribe to active symbol market depth
      this.subscribeDepth(this.activeSymbol);
      return;
    }

    // Market Depth Updates: "md/subscribeDepth" stream
    if (pkt.e === 'md' && pkt.d && pkt.d.doms) {
      this.parseTradovateDOM(pkt.d.doms);
    }

    // Quotes / BBO
    if (pkt.e === 'md' && pkt.d && pkt.d.quotes) {
      this.parseTradovateQuotes(pkt.d.quotes);
    }
  }

  /**
   * Parse Tradovate Level 2 DOM into terminal format
   */
  parseTradovateDOM(doms) {
    if (!Array.isArray(doms) || doms.length === 0) return;

    doms.forEach((dom) => {
      const bids = (dom.bids || []).map((b) => ({
        price: b.price,
        qty: b.size,
      })).sort((a, b) => b.price - a.price);

      const asks = (dom.asks || []).map((a) => ({
        price: a.price,
        qty: a.size,
      })).sort((a, b) => a.price - b.price);

      const totalBidVol = bids.reduce((acc, b) => acc + b.qty, 0);
      const totalAskVol = asks.reduce((acc, a) => acc + a.qty, 0);
      const maxBidQty = Math.max(...bids.map((b) => b.qty), 1);
      const maxAskQty = Math.max(...asks.map((a) => a.qty), 1);
      const bestBid = bids[0]?.price || 0;
      const bestAsk = asks[0]?.price || 0;

      this.onDepthUpdate({
        source: 'TRADOVATE',
        symbol: dom.contractId || this.activeSymbol,
        bids,
        asks,
        totalBidVol,
        totalAskVol,
        maxQty: Math.max(maxBidQty, maxAskQty),
        bestBid,
        bestAsk,
        spread: bestAsk > 0 && bestBid > 0 ? Number((bestAsk - bestBid).toFixed(2)) : 0,
        imbalanceRatio: (totalBidVol + totalAskVol > 0)
          ? (totalBidVol / (totalBidVol + totalAskVol)) * 100
          : 50,
      });
    });
  }

  parseTradovateQuotes(quotes) {
    if (!Array.isArray(quotes) || quotes.length === 0) return;
    const q = quotes[quotes.length - 1];
    if (q && (q.lastPrice || q.bidPrice || q.askPrice)) {
      this.onQuoteUpdate({
        symbol: this.activeSymbol,
        lastPrice: q.lastPrice || q.bidPrice,
        bidPrice: q.bidPrice,
        askPrice: q.askPrice,
        volume: q.volume,
      });
    }
  }

  subscribeDepth(symbol = 'GC') {
    this.activeSymbol = symbol;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const subMsg = `md/subscribeDepth\n${this.reqId++}\n\n{"symbol":"${symbol}"}`;
    this.ws.send(subMsg);
  }

  unsubscribeDepth(symbol = 'GC') {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const unsubMsg = `md/unsubscribeDepth\n${this.reqId++}\n\n{"symbol":"${symbol}"}`;
    this.ws.send(unsubMsg);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('[]');
      }
    }, 2500);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
      this.ws = null;
    }
    this.isConnected = false;
    this.accessToken = null;
    this.onStatusChange({ status: 'DISCONNECTED' });
  }
}
