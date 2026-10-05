import React, { useState } from 'react';
import { X, Key, Shield, Radio, CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

export function TradovateModal({
  isOpen,
  onClose,
  tradovateStatus,
  onConnect,
  onDisconnect,
}) {
  const [env, setEnv] = useState('demo');
  const [authType, setAuthType] = useState('token'); // 'token' or 'credentials'
  const [accessToken, setAccessToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [appId, setAppId] = useState('');
  const [cid, setCid] = useState('');
  const [sec, setSec] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleConnect = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (authType === 'token') {
        if (!accessToken.trim()) {
          throw new Error('Please enter your Tradovate Access Token');
        }
        await onConnect({ env, accessToken: accessToken.trim() });
      } else {
        if (!username.trim() || !password.trim()) {
          throw new Error('Username and Password are required');
        }
        await onConnect({
          env,
          username: username.trim(),
          password: password.trim(),
          appId: appId.trim() || undefined,
          cid: cid.trim() || undefined,
          sec: sec.trim() || undefined,
        });
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const isConnected = tradovateStatus?.status === 'CONNECTED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-[#2a2e39] bg-[#1e222d] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2a2e39] px-5 py-4 bg-[#181b24]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-sm">
              T
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Tradovate CME Data Feed</h2>
              <p className="text-[11px] text-[#787b86]">Connect real CME Gold, Nasdaq & S&P Depth</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#787b86] hover:bg-[#2a2e39] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status Banner */}
        <div className={`px-5 py-2.5 text-xs flex items-center justify-between border-b ${
          isConnected 
            ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300' 
            : 'bg-[#131722] border-[#2a2e39] text-[#787b86]'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="font-medium">
              Status: <span className="text-white font-mono">{tradovateStatus?.status || 'NOT CONNECTED'}</span>
            </span>
          </div>
          {isConnected && (
            <button
              onClick={onDisconnect}
              className="text-[11px] text-rose-400 hover:underline font-semibold"
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleConnect} className="p-5 space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-950/50 border border-rose-500/40 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Environment Selection */}
          <div>
            <label className="text-xs font-semibold text-[#d1d4dc] block mb-1.5">Tradovate Environment</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEnv('demo')}
                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5 ${
                  env === 'demo'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold shadow-sm'
                    : 'bg-[#131722] border-[#2a2e39] text-[#787b86] hover:text-white'
                }`}
              >
                <Radio className="h-3.5 w-3.5" />
                Demo / Simulation
              </button>
              <button
                type="button"
                onClick={() => setEnv('live')}
                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5 ${
                  env === 'live'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-semibold shadow-sm'
                    : 'bg-[#131722] border-[#2a2e39] text-[#787b86] hover:text-white'
                }`}
              >
                <Radio className="h-3.5 w-3.5" />
                Live Brokerage
              </button>
            </div>
          </div>

          {/* Auth Method Tabs */}
          <div>
            <div className="flex border-b border-[#2a2e39] mb-3">
              <button
                type="button"
                onClick={() => setAuthType('token')}
                className={`pb-1.5 text-xs font-medium border-b-2 mr-4 transition-colors ${
                  authType === 'token'
                    ? 'border-[#2962ff] text-white font-semibold'
                    : 'border-transparent text-[#787b86] hover:text-[#d1d4dc]'
                }`}
              >
                API Access Token (Recommended)
              </button>
              <button
                type="button"
                onClick={() => setAuthType('credentials')}
                className={`pb-1.5 text-xs font-medium border-b-2 transition-colors ${
                  authType === 'credentials'
                    ? 'border-[#2962ff] text-white font-semibold'
                    : 'border-transparent text-[#787b86] hover:text-[#d1d4dc]'
                }`}
              >
                User & Password
              </button>
            </div>

            {authType === 'token' ? (
              <div className="space-y-2">
                <label className="text-[11px] text-[#787b86] flex items-center justify-between">
                  <span>Tradovate Access Token</span>
                  <a 
                    href="https://trader.tradovate.com/settings/api" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[#2962ff] hover:underline flex items-center gap-1"
                  >
                    Generate in Tradovate Settings <ExternalLink className="h-3 w-3" />
                  </a>
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#787b86]" />
                  <input
                    type="password"
                    placeholder="Paste your Tradovate Bearer token"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    className="w-full rounded-lg bg-[#131722] py-2 pl-9 pr-3 text-xs text-white border border-[#2a2e39] focus:border-[#2962ff] focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-[#787b86] block mb-1">Username / Email</label>
                  <input
                    type="text"
                    placeholder="Tradovate Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-lg bg-[#131722] py-2 px-3 text-xs text-white border border-[#2a2e39] focus:border-[#2962ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#787b86] block mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="Tradovate Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg bg-[#131722] py-2 px-3 text-xs text-white border border-[#2a2e39] focus:border-[#2962ff] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#787b86] block mb-1">CID (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 12345"
                      value={cid}
                      onChange={(e) => setCid(e.target.value)}
                      className="w-full rounded bg-[#131722] py-1.5 px-2.5 text-xs text-white border border-[#2a2e39]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#787b86] block mb-1">App Secret (Optional)</label>
                    <input
                      type="password"
                      placeholder="Sec key"
                      value={sec}
                      onChange={(e) => setSec(e.target.value)}
                      className="w-full rounded bg-[#131722] py-1.5 px-2.5 text-xs text-white border border-[#2a2e39]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-[#131722] p-3 text-[11px] text-[#787b86] space-y-1 border border-[#2a2e39]">
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              Zero-Log Privacy
            </div>
            <p>
              Your token connects directly from your browser to Tradovate WebSocket. It is never stored on external servers.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2a2e39]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#787b86] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#2962ff] hover:bg-[#1e54e4] text-xs font-bold text-white transition-all shadow-md disabled:opacity-50"
            >
              {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
              {isConnected ? 'Update Connection' : 'Connect Tradovate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
