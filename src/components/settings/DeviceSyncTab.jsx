import React, { useState, useEffect } from 'react';
import { RefreshCw, Wifi, Shield, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, XCircle, Loader2, Copy, MonitorSmartphone } from 'lucide-react';

const DeviceSyncTab = () => {
  const [mode, setMode] = useState(null); // null | 'share' | 'receive'
  const [deviceInfo, setDeviceInfo] = useState(null);

  // Share mode state
  const [syncPin, setSyncPin] = useState(null);
  const [pinCountdown, setPinCountdown] = useState(0);

  // Receive mode state
  const [remoteIp, setRemoteIp] = useState('');
  const [remotePort, setRemotePort] = useState('3000');
  const [remotePin, setRemotePin] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [syncSession, setSyncSession] = useState(null); // { token, serverUrl, tables, deviceName }
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDeviceInfo();
  }, []);

  // PIN countdown timer
  useEffect(() => {
    if (pinCountdown <= 0) return;
    const timer = setInterval(() => {
      setPinCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setSyncPin(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pinCountdown]);

  const loadDeviceInfo = async () => {
    try {
      const info = await window.electronAPI.invoke('sync:getDeviceInfo');
      setDeviceInfo(info);
    } catch (e) {
      console.error('Failed to get device info:', e);
    }
  };

  // ─── SHARE MODE ────────────────────────────
  const handleGeneratePin = async () => {
    try {
      const result = await window.electronAPI.invoke('sync:generatePin');
      setSyncPin(result);
      setPinCountdown(600); // 10 minutes
      setError('');
    } catch (e) {
      setError('Failed to generate PIN: ' + e.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  // ─── RECEIVE MODE ────────────────────────────
  const handleConnect = async () => {
    if (!remoteIp || !remotePin) {
      setError('Please enter both IP address and PIN');
      return;
    }
    setConnecting(true);
    setError('');
    setConnected(false);
    setSyncSession(null);

    try {
      const result = await window.electronAPI.invoke('sync:connect', {
        ip: remoteIp.trim(),
        port: parseInt(remotePort) || 3000,
        pin: remotePin.trim()
      });

      if (result.success) {
        setConnected(true);
        setSyncSession(result);
      } else {
        setError(result.error || 'Connection failed');
      }
    } catch (e) {
      setError('Connection error: ' + e.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleStartSync = async () => {
    if (!syncSession) return;
    setSyncing(true);
    setSyncResult(null);
    setError('');

    try {
      const result = await window.electronAPI.invoke('sync:pullAll', {
        serverUrl: syncSession.serverUrl,
        token: syncSession.token
      });

      setSyncResult(result);
      if (!result.success) {
        setError(result.error || 'Sync completed with errors');
      }
    } catch (e) {
      setError('Sync failed: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const formatMinSec = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ─── RENDER ────────────────────────────
  return (
    <div style={{ display: 'grid', gap: '28px' }}>
      {/* Info Banner */}
      <div style={{ display: 'flex', gap: '14px', padding: '16px 20px', background: '#ede9fe', borderRadius: '12px', border: '1px solid #ddd6fe', alignItems: 'flex-start' }}>
        <MonitorSmartphone size={22} style={{ color: '#8b5cf6', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ color: '#6d28d9', fontSize: '14px' }}>Device Data Sync</strong>
          <p style={{ color: '#7c3aed', fontSize: '13px', marginTop: '4px', lineHeight: '1.5', margin: '4px 0 0' }}>
            Transfer your menu, orders, settings, and all data between devices on the same WiFi network.
            Both devices must be running ZapBill POS.
          </p>
        </div>
      </div>

      {/* This Device Info */}
      {deviceInfo && (
        <div style={{ padding: '16px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '2px' }}>This Device</div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>{deviceInfo.deviceName}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '2px' }}>IP Address</div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', fontFamily: 'monospace' }}>{deviceInfo.ip}:{deviceInfo.port}</div>
          </div>
        </div>
      )}

      {/* Mode Selection */}
      {!mode && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <button
            onClick={() => setMode('share')}
            style={{
              padding: '32px 24px', background: 'white', border: '2px solid #e2e8f0', borderRadius: '16px',
              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.background = '#f0fdf4'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}
          >
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUpFromLine size={28} style={{ color: '#10b981' }} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Share Data</div>
              <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                This device has the data.<br />Generate a PIN for the other device.
              </div>
            </div>
          </button>

          <button
            onClick={() => setMode('receive')}
            style={{
              padding: '32px 24px', background: 'white', border: '2px solid #e2e8f0', borderRadius: '16px',
              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}
          >
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowDownToLine size={28} style={{ color: '#3b82f6' }} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Receive Data</div>
              <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                Pull data from another device.<br />Enter IP and PIN to connect.
              </div>
            </div>
          </button>
        </div>
      )}

      {/* SHARE MODE */}
      {mode === 'share' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Share Data from This Device</h4>
            <button onClick={() => { setMode(null); setSyncPin(null); setPinCountdown(0); }}
              style={{ padding: '6px 14px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>
              ← Back
            </button>
          </div>

          {/* Steps */}
          <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '13px', color: '#166534', lineHeight: '1.8' }}>
              <strong>Steps:</strong><br />
              1️⃣ Click "Generate Sync PIN" below<br />
              2️⃣ On the other device, go to Settings → Device Sync → Receive Data<br />
              3️⃣ Enter this device's IP address and the PIN shown below<br />
              4️⃣ The other device will pull all data from this device
            </div>
          </div>

          {!syncPin ? (
            <button onClick={handleGeneratePin}
              style={{
                padding: '16px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white',
                border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
              }}>
              <Shield size={20} /> Generate Sync PIN
            </button>
          ) : (
            <div style={{ padding: '32px', background: 'white', borderRadius: '16px', border: '2px solid #10b981', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Sync PIN (expires in {formatMinSec(pinCountdown)})</div>
              <div style={{
                fontSize: '48px', fontWeight: '800', letterSpacing: '12px', color: '#0f172a',
                fontFamily: 'monospace', marginBottom: '16px'
              }}>
                {syncPin.pin}
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                  background: '#f1f5f9', borderRadius: '8px', fontSize: '14px', fontFamily: 'monospace', color: '#334155'
                }}>
                  <Wifi size={16} style={{ color: '#10b981' }} />
                  {syncPin.ip}:{syncPin.port}
                  <button onClick={() => copyToClipboard(`${syncPin.ip}:${syncPin.port}`)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                    <Copy size={14} style={{ color: '#94a3b8' }} />
                  </button>
                </div>
                <button onClick={() => copyToClipboard(syncPin.pin)}
                  style={{ padding: '8px 16px', background: '#dbeafe', color: '#2563eb', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Copy size={14} /> Copy PIN
                </button>
              </div>
              <div style={{ marginTop: '20px' }}>
                <button onClick={handleGeneratePin}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', color: '#475569' }}>
                  <RefreshCw size={14} style={{ marginRight: '6px' }} /> Generate New PIN
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RECEIVE MODE */}
      {mode === 'receive' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Receive Data from Another Device</h4>
            <button onClick={() => { setMode(null); setConnected(false); setSyncSession(null); setSyncResult(null); setError(''); }}
              style={{ padding: '6px 14px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>
              ← Back
            </button>
          </div>

          {/* Warning */}
          <div style={{ padding: '14px 18px', background: '#fef9c3', borderRadius: '10px', border: '1px solid #fde68a', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <XCircle size={18} style={{ color: '#b45309', flexShrink: 0, marginTop: '1px' }} />
            <div style={{ fontSize: '13px', color: '#92400e', lineHeight: '1.5' }}>
              <strong>Warning:</strong> This will merge all data from the source device into this device.
              Existing records with matching IDs will be overwritten. Make sure you want to proceed.
            </div>
          </div>

          {/* Connection Form */}
          {!connected && (
            <div style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Source Device IP Address</label>
                  <input
                    type="text"
                    value={remoteIp}
                    onChange={e => setRemoteIp(e.target.value)}
                    placeholder="192.168.1.100"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Port</label>
                  <input
                    type="text"
                    value={remotePort}
                    onChange={e => setRemotePort(e.target.value)}
                    placeholder="3000"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Sync PIN</label>
                <input
                  type="text"
                  value={remotePin}
                  onChange={e => setRemotePin(e.target.value)}
                  placeholder="Enter 6-digit PIN from source device"
                  maxLength={6}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '20px', fontFamily: 'monospace', letterSpacing: '8px', textAlign: 'center', boxSizing: 'border-box' }}
                />
              </div>
              <button onClick={handleConnect} disabled={connecting}
                style={{
                  width: '100%', padding: '14px', background: connecting ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700',
                  cursor: connecting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}>
                {connecting ? <><Loader2 size={18} className="spin" /> Connecting...</> : <><Wifi size={18} /> Connect to Device</>}
              </button>
            </div>
          )}

          {/* Connected — show tables and start sync */}
          {connected && syncSession && !syncResult && (
            <div style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '2px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <CheckCircle2 size={22} style={{ color: '#10b981' }} />
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>Connected to {syncSession.deviceName}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{syncSession.serverUrl}</div>
                </div>
              </div>

              {/* Table list */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '10px' }}>Data Available</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                  {syncSession.tables?.map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}>
                      <span style={{ color: '#334155', fontWeight: '500' }}>{t.name}</span>
                      <span style={{ color: '#64748b' }}>{t.rows} rows</span>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleStartSync} disabled={syncing}
                style={{
                  width: '100%', padding: '14px', background: syncing ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700',
                  cursor: syncing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}>
                {syncing ? <><Loader2 size={18} className="spin" /> Syncing Data...</> : <><ArrowDownToLine size={18} /> Start Full Sync</>}
              </button>
            </div>
          )}

          {/* Sync Result */}
          {syncResult && (
            <div style={{
              padding: '24px', borderRadius: '12px',
              background: syncResult.success ? '#f0fdf4' : '#fef2f2',
              border: `2px solid ${syncResult.success ? '#bbf7d0' : '#fecaca'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                {syncResult.success ?
                  <CheckCircle2 size={24} style={{ color: '#10b981' }} /> :
                  <XCircle size={24} style={{ color: '#ef4444' }} />
                }
                <div>
                  <div style={{ fontSize: '17px', fontWeight: '700', color: syncResult.success ? '#166534' : '#991b1b' }}>
                    {syncResult.success ? 'Sync Complete!' : 'Sync Had Errors'}
                  </div>
                  <div style={{ fontSize: '13px', color: syncResult.success ? '#15803d' : '#b91c1c' }}>
                    {syncResult.totalImported || 0} rows imported across {Object.keys(syncResult.tables || {}).length} tables
                  </div>
                </div>
              </div>

              {/* Per-table results */}
              {syncResult.tables && Object.keys(syncResult.tables).length > 0 && (
                <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
                  {Object.entries(syncResult.tables).map(([name, info]) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', fontSize: '13px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <span style={{ fontWeight: '500' }}>{name}</span>
                      <span style={{ color: '#64748b' }}>{info.imported}/{info.total} rows</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Errors */}
              {syncResult.errors?.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#991b1b', marginBottom: '6px' }}>Errors:</div>
                  {syncResult.errors.map((err, i) => (
                    <div key={i} style={{ padding: '6px 12px', background: '#fee2e2', borderRadius: '6px', fontSize: '12px', color: '#991b1b', marginBottom: '4px' }}>
                      {err.table}: {err.error}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                <button onClick={() => { setMode(null); setConnected(false); setSyncSession(null); setSyncResult(null); setError(''); }}
                  style={{ padding: '10px 20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: '#334155' }}>
                  Done
                </button>
                {syncResult.success && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#15803d' }}>
                    <CheckCircle2 size={16} /> Restart the app to see all synced data
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 18px', background: '#fee2e2', borderRadius: '8px', border: '1px solid #fecaca', color: '#991b1b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <XCircle size={16} /> {error}
        </div>
      )}
    </div>
  );
};

export default DeviceSyncTab;
