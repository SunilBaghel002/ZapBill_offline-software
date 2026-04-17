import React, { useState, useEffect } from 'react';
import {
  Globe, Server, Bell, Clock, Truck, RefreshCw, Save, Wifi, WifiOff,
  Volume2, Play, Zap, Shield, AlertTriangle, Trash2, Download, ChevronDown,
  Check, X, Settings, Package
} from 'lucide-react';
import { useAlertStore } from '../../stores/alertStore';

const WebsiteOrdersTab = () => {
  const { showAlert } = useAlertStore();
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('connection');
  const [connectionStatus, setConnectionStatus] = useState(null); // null | 'testing' | { success, latency, message }
  const [logs, setLogs] = useState([]);
  const [pollingStatus, setPollingStatus] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const cfg = await window.electronAPI.invoke('websiteOrders:getConfig');
      setConfig(cfg);
      const logData = await window.electronAPI.invoke('websiteOrders:getLogs');
      setLogs(logData || []);
      const status = await window.electronAPI.invoke('websiteOrders:getPollingStatus');
      setPollingStatus(status);
    } catch (e) {
      showAlert('Failed to load website order settings: ' + e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await window.electronAPI.invoke('websiteOrders:saveConfig', config);
      showAlert('Website Order settings saved successfully!', 'success');
    } catch (e) {
      showAlert('Failed to save: ' + e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    setConnectionStatus('testing');
    try {
      const result = await window.electronAPI.invoke('websiteOrders:testConnection');
      setConnectionStatus(result);
    } catch (e) {
      setConnectionStatus({ success: false, message: e.message });
    }
  };

  const updateConfig = (section, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value }
    }));
  };

  const updateEndpoint = (key, value) => {
    setConfig(prev => ({
      ...prev,
      server: { ...prev.server, endpoints: { ...prev.server.endpoints, [key]: value } }
    }));
  };

  const Toggle = ({ checked, onChange }) => (
    <button onClick={() => onChange(!checked)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
      <div style={{
        width: '44px', height: '24px', borderRadius: '12px',
        background: checked ? '#10b981' : '#cbd5e1',
        position: 'relative', transition: 'background 0.2s ease'
      }}>
        <div style={{
          width: '20px', height: '20px', borderRadius: '50%', background: 'white',
          position: 'absolute', top: '2px', left: checked ? '22px' : '2px',
          transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
        }} />
      </div>
    </button>
  );

  const SettingRow = ({ label, desc, children }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>{label}</div>
        {desc && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{desc}</div>}
      </div>
      <div style={{ marginLeft: '16px', flexShrink: 0 }}>{children}</div>
    </div>
  );

  const SectionCard = ({ title, icon: Icon, children, color = '#3b82f6' }) => (
    <div style={{ padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} style={{ color }} />
        </div>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>{title}</h4>
      </div>
      {children}
    </div>
  );

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#1e293b', outline: 'none', transition: 'border 0.2s' };
  const smallInputStyle = { ...inputStyle, width: '80px', textAlign: 'center' };

  if (isLoading || !config) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><RefreshCw className="spin" size={32} color="#94a3b8" /></div>;
  }

  const sections = [
    { id: 'connection', label: 'Server Connection', icon: Server },
    { id: 'polling', label: 'Polling Config', icon: Clock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'processing', label: 'Order Processing', icon: Package },
    { id: 'sync', label: 'Menu & Coupon Sync', icon: RefreshCw },
    { id: 'logs', label: 'Connection Log', icon: Wifi },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Website Orders</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Configure how ZapBill fetches and processes online orders from your website.</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1 }}>
          <Save size={18} />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: '220px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none',
              background: activeSection === s.id ? '#e0f2fe' : 'transparent',
              color: activeSection === s.id ? '#0369a1' : '#475569',
              fontWeight: activeSection === s.id ? '600' : '500', fontSize: '13px', transition: 'all 0.2s'
            }}>
              <s.icon size={16} strokeWidth={activeSection === s.id ? 2.5 : 2} />
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: '#f1f5f9' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>

            {/* ── Section: Server Connection ── */}
            {activeSection === 'connection' && (
              <>
                <SectionCard title="Server URL" icon={Globe} color="#0ea5e9">
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Website Server URL</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" value={config.server.url} onChange={(e) => updateConfig('server', 'url', e.target.value)} placeholder="https://your-restaurant-api.com" style={{ ...inputStyle, flex: 1 }} />
                      <button onClick={testConnection} disabled={connectionStatus === 'testing'} style={{ padding: '8px 16px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                      </button>
                    </div>
                    <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Enter the cloud server URL where your website sends orders</p>

                    {connectionStatus && connectionStatus !== 'testing' && (
                      <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: '8px', background: connectionStatus.success ? '#f0fdf4' : '#fef2f2', border: `1px solid ${connectionStatus.success ? '#bbf7d0' : '#fecaca'}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {connectionStatus.success ? <Check size={16} style={{ color: '#16a34a' }} /> : <X size={16} style={{ color: '#dc2626' }} />}
                        <span style={{ fontSize: '13px', fontWeight: '500', color: connectionStatus.success ? '#166534' : '#991b1b' }}>
                          {connectionStatus.message}
                        </span>
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="API Credentials" icon={Shield} color="#8b5cf6">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>API Key</label>
                      <input type="password" value={config.server.api_key} onChange={(e) => updateConfig('server', 'api_key', e.target.value)} placeholder="Your API key" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Restaurant ID</label>
                      <input type="text" value={config.server.restaurant_id} onChange={(e) => updateConfig('server', 'restaurant_id', e.target.value)} placeholder="rest-123" style={inputStyle} />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Endpoint Configuration" icon={Settings} color="#f59e0b">
                  {Object.entries(config.server.endpoints).map(([key, val]) => (
                    <div key={key} style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</label>
                      <input type="text" value={val} onChange={(e) => updateEndpoint(key, e.target.value)} style={inputStyle} />
                      {config.server.url && (
                        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>→ {config.server.url}{val}</p>
                      )}
                    </div>
                  ))}
                </SectionCard>
              </>
            )}

            {/* ── Section: Polling ── */}
            {activeSection === 'polling' && (
              <>
                <SectionCard title="Polling Configuration" icon={Clock} color="#0ea5e9">
                  <SettingRow label="Enable Website Order Polling" desc="Master switch to enable or disable order fetching">
                    <Toggle checked={config.polling.enabled} onChange={(v) => updateConfig('polling', 'enabled', v)} />
                  </SettingRow>
                  <SettingRow label="Check for new orders every" desc={`Minimum 5s, Maximum 60s. Current: ${config.polling.interval_seconds}s`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="number" min={5} max={60} value={config.polling.interval_seconds} onChange={(e) => updateConfig('polling', 'interval_seconds', Math.max(5, Math.min(60, parseInt(e.target.value) || 10)))} style={smallInputStyle} />
                      <span style={{ fontSize: '13px', color: '#475569' }}>seconds</span>
                    </div>
                  </SettingRow>
                  <SettingRow label="Connection timeout" desc="How long to wait before giving up on a request">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="number" min={3} max={30} value={config.polling.connection_timeout_seconds} onChange={(e) => updateConfig('polling', 'connection_timeout_seconds', parseInt(e.target.value) || 10)} style={smallInputStyle} />
                      <span style={{ fontSize: '13px', color: '#475569' }}>seconds</span>
                    </div>
                  </SettingRow>
                  <SettingRow label="Max retries per poll" desc="Number of retries if a request fails">
                    <input type="number" min={1} max={10} value={config.polling.max_retries} onChange={(e) => updateConfig('polling', 'max_retries', parseInt(e.target.value) || 3)} style={smallInputStyle} />
                  </SettingRow>
                </SectionCard>

                {pollingStatus && (
                  <SectionCard title="Polling Status (Live)" icon={Wifi} color="#10b981">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                      {[
                        { label: 'Status', value: pollingStatus.active ? '🟢 Active' : '🔴 Paused', color: pollingStatus.active ? '#10b981' : '#ef4444' },
                        { label: 'Total Checks Today', value: pollingStatus.totalChecksToday },
                        { label: 'Successful', value: pollingStatus.successfulChecks },
                        { label: 'Failed', value: pollingStatus.failedChecks },
                        { label: 'Orders Received', value: pollingStatus.ordersReceivedToday },
                        { label: 'Avg Response', value: `${pollingStatus.avgResponseTime || 0}ms` },
                      ].map((stat, i) => (
                        <div key={i} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>{stat.label}</div>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: stat.color || '#0f172a' }}>{stat.value}</div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}
              </>
            )}

            {/* ── Section: Notifications ── */}
            {activeSection === 'notifications' && (
              <>
                <SectionCard title="Sound Notifications" icon={Volume2} color="#f59e0b">
                  <SettingRow label="Play sound on new order" desc="Audible alert when a website order arrives">
                    <Toggle checked={config.notifications.sound_enabled} onChange={(v) => updateConfig('notifications', 'sound_enabled', v)} />
                  </SettingRow>
                  {config.notifications.sound_enabled && (
                    <>
                      <SettingRow label="Notification sound" desc="Select the sound to play">
                        <select value={config.notifications.sound_type} onChange={(e) => updateConfig('notifications', 'sound_type', e.target.value)} style={{ ...inputStyle, width: '180px' }}>
                          <option value="bell_ring">Bell Ring</option>
                          <option value="ding_dong">Ding Dong</option>
                          <option value="alert_beep">Alert Beep</option>
                          <option value="cash_register">Cash Register</option>
                        </select>
                      </SettingRow>
                      <SettingRow label="Volume" desc={`${config.notifications.sound_volume}%`}>
                        <input type="range" min={0} max={100} value={config.notifications.sound_volume} onChange={(e) => updateConfig('notifications', 'sound_volume', parseInt(e.target.value))} style={{ width: '140px' }} />
                      </SettingRow>
                      <SettingRow label="Repeat sound until acknowledged" desc="Sound keeps playing until biller opens the order">
                        <Toggle checked={config.notifications.repeat_sound} onChange={(v) => updateConfig('notifications', 'repeat_sound', v)} />
                      </SettingRow>
                    </>
                  )}
                </SectionCard>

                <SectionCard title="Visual Notifications" icon={Bell} color="#8b5cf6">
                  <SettingRow label="Desktop notification popup" desc="Shows system popup even when ZapBill is minimized">
                    <Toggle checked={config.notifications.desktop_notification} onChange={(v) => updateConfig('notifications', 'desktop_notification', v)} />
                  </SettingRow>
                  <SettingRow label="Flash taskbar icon" desc="Flashes ZapBill icon in taskbar on new order">
                    <Toggle checked={config.notifications.flash_taskbar} onChange={(v) => updateConfig('notifications', 'flash_taskbar', v)} />
                  </SettingRow>
                  <SettingRow label="Show order count badge" desc="Red badge with pending count on Website Orders tab">
                    <Toggle checked={config.notifications.badge_count} onChange={(v) => updateConfig('notifications', 'badge_count', v)} />
                  </SettingRow>
                  <SettingRow label="Full screen alert on new order" desc="Large overlay that must be clicked to dismiss">
                    <Toggle checked={config.notifications.fullscreen_alert} onChange={(v) => updateConfig('notifications', 'fullscreen_alert', v)} />
                  </SettingRow>
                </SectionCard>

                <SectionCard title="Auto Print" icon={Zap} color="#ef4444">
                  <SettingRow label="Auto print KOT when order received" desc="Prints Kitchen Order Ticket immediately (even before acceptance)">
                    <Toggle checked={config.notifications.auto_print_kot} onChange={(v) => updateConfig('notifications', 'auto_print_kot', v)} />
                  </SettingRow>
                  <SettingRow label="Auto print bill when order accepted" desc="Prints customer bill automatically on accept">
                    <Toggle checked={config.notifications.auto_print_bill} onChange={(v) => updateConfig('notifications', 'auto_print_bill', v)} />
                  </SettingRow>
                </SectionCard>
              </>
            )}

            {/* ── Section: Processing ── */}
            {activeSection === 'processing' && (
              <>
                <SectionCard title="Auto Accept" icon={Zap} color="#10b981">
                  <SettingRow label="Auto accept all orders" desc="Orders are automatically accepted without manual action">
                    <Toggle checked={config.processing.auto_accept} onChange={(v) => updateConfig('processing', 'auto_accept', v)} />
                  </SettingRow>
                  {config.processing.auto_accept && (
                    <div style={{ padding: '10px 14px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                      <AlertTriangle size={16} style={{ color: '#d97706' }} />
                      <span style={{ fontSize: '12px', color: '#92400e' }}>All orders will be accepted automatically. Only enable if your kitchen can handle all incoming orders.</span>
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="Order Timeout" icon={Clock} color="#ef4444">
                  <SettingRow label="Enable auto reject timeout" desc="Automatically reject orders not accepted within time limit">
                    <Toggle checked={config.processing.auto_reject_enabled} onChange={(v) => updateConfig('processing', 'auto_reject_enabled', v)} />
                  </SettingRow>
                  {config.processing.auto_reject_enabled && (
                    <SettingRow label="Auto reject after" desc="Orders not accepted within this time are auto-rejected">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="number" min={5} max={120} value={config.processing.auto_reject_minutes} onChange={(e) => updateConfig('processing', 'auto_reject_minutes', parseInt(e.target.value) || 30)} style={smallInputStyle} />
                        <span style={{ fontSize: '13px', color: '#475569' }}>minutes</span>
                      </div>
                    </SettingRow>
                  )}
                </SectionCard>

                <SectionCard title="Order Number Prefix" icon={Package} color="#6366f1">
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Online Order Prefix</label>
                    <input type="text" value={config.processing.order_prefix} onChange={(e) => updateConfig('processing', 'order_prefix', e.target.value)} style={{ ...inputStyle, width: '120px' }} />
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                      Preview: Orders will be numbered as <strong>{config.processing.order_prefix}001</strong>, <strong>{config.processing.order_prefix}002</strong>, etc.
                    </p>
                  </div>
                </SectionCard>

                <SectionCard title="Delivery Settings" icon={Truck} color="#0ea5e9">
                  <SettingRow label="Enable delivery orders"><Toggle checked={config.processing.delivery_enabled} onChange={(v) => updateConfig('processing', 'delivery_enabled', v)} /></SettingRow>
                  <SettingRow label="Enable pickup orders"><Toggle checked={config.processing.pickup_enabled} onChange={(v) => updateConfig('processing', 'pickup_enabled', v)} /></SettingRow>
                  <SettingRow label="Enable dine-in orders (QR/Website)"><Toggle checked={config.processing.dinein_enabled} onChange={(v) => updateConfig('processing', 'dinein_enabled', v)} /></SettingRow>
                  {config.processing.delivery_enabled && (
                    <>
                      <SettingRow label="Minimum order for delivery">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ fontSize: '14px', fontWeight: '600' }}>₹</span><input type="number" value={config.processing.min_delivery_amount} onChange={(e) => updateConfig('processing', 'min_delivery_amount', parseInt(e.target.value) || 0)} style={smallInputStyle} /></div>
                      </SettingRow>
                      <SettingRow label="Delivery charge">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ fontSize: '14px', fontWeight: '600' }}>₹</span><input type="number" value={config.processing.delivery_charge} onChange={(e) => updateConfig('processing', 'delivery_charge', parseInt(e.target.value) || 0)} style={smallInputStyle} /></div>
                      </SettingRow>
                      <SettingRow label="Free delivery above">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ fontSize: '14px', fontWeight: '600' }}>₹</span><input type="number" value={config.processing.free_delivery_above} onChange={(e) => updateConfig('processing', 'free_delivery_above', parseInt(e.target.value) || 0)} style={smallInputStyle} /></div>
                      </SettingRow>
                      <SettingRow label="Maximum delivery distance">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><input type="number" value={config.processing.max_delivery_distance_km} onChange={(e) => updateConfig('processing', 'max_delivery_distance_km', parseInt(e.target.value) || 5)} style={smallInputStyle} /><span style={{ fontSize: '13px', color: '#475569' }}>km</span></div>
                      </SettingRow>
                    </>
                  )}
                </SectionCard>
              </>
            )}

            {/* ── Section: Sync ── */}
            {activeSection === 'sync' && (
              <>
                <SectionCard title="Menu Sync" icon={RefreshCw} color="#10b981">
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Last synced: <strong style={{ color: '#0f172a' }}>{config.sync.last_menu_sync ? new Date(config.sync.last_menu_sync).toLocaleString() : 'Never'}</strong> ({config.sync.menu_item_count} items)</div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <button style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>Sync Menu to Website Now</button>
                  </div>
                  <SettingRow label="Auto sync menu">
                    <select value={config.sync.menu_sync_mode} onChange={(e) => updateConfig('sync', 'menu_sync_mode', e.target.value)} style={{ ...inputStyle, width: '200px' }}>
                      <option value="on_change">When menu changes (recommended)</option>
                      <option value="hourly">Every 1 hour</option>
                      <option value="six_hours">Every 6 hours</option>
                      <option value="manual">Manual only</option>
                    </select>
                  </SettingRow>
                </SectionCard>

                <SectionCard title="Coupon Sync" icon={RefreshCw} color="#f59e0b">
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Last synced: <strong style={{ color: '#0f172a' }}>{config.sync.last_coupon_sync ? new Date(config.sync.last_coupon_sync).toLocaleString() : 'Never'}</strong> ({config.sync.active_coupon_count} active coupons)</div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <button style={{ padding: '8px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>Sync Coupons to Website Now</button>
                  </div>
                  <SettingRow label="Auto sync coupons">
                    <select value={config.sync.coupon_sync_mode} onChange={(e) => updateConfig('sync', 'coupon_sync_mode', e.target.value)} style={{ ...inputStyle, width: '200px' }}>
                      <option value="on_change">When coupons change (recommended)</option>
                      <option value="hourly">Every 1 hour</option>
                      <option value="manual">Manual only</option>
                    </select>
                  </SettingRow>
                </SectionCard>
              </>
            )}

            {/* ── Section: Logs ── */}
            {activeSection === 'logs' && (
              <SectionCard title="Connection Log" icon={Wifi} color="#64748b">
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button onClick={async () => { await window.electronAPI.invoke('websiteOrders:clearLogs'); setLogs([]); }} style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Trash2 size={12} /> Clear Log
                  </button>
                </div>

                {logs.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
                    No connection logs yet. Enable polling to start receiving logs.
                  </div>
                ) : (
                  <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Time</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Status</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Response</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Orders</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleTimeString()}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>{log.status === 'success' ? '✅' : '❌'}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569' }}>{log.responseTime}ms</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', color: log.ordersReceived > 0 ? '#10b981' : '#94a3b8' }}>{log.ordersReceived}</td>
                            <td style={{ padding: '8px 12px', color: '#475569', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default WebsiteOrdersTab;
