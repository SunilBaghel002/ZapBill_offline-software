import React, { useState, useEffect } from 'react';
import { 
  Server, Smartphone, Cloud, Printer, Activity, Save, RefreshCw, X, Check,
  AlertTriangle, Shield, Search, Wifi, HardDrive
} from 'lucide-react';
import { useAlertStore } from '../../stores/alertStore';
import { useLicenseStore } from '../../stores/licenseStore';

const NetworkTab = () => {
  const { showAlert } = useAlertStore();
  const { license } = useLicenseStore();
  
  const [activeSubTab, setActiveSubTab] = useState('server');
  const [config, setConfig] = useState(null);
  const [interfaces, setInterfaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Specific States
  const [portChecks, setPortChecks] = useState({});
  const [conflicts, setConflicts] = useState([]);

  useEffect(() => {
    loadNetworkData();
  }, []);

  const loadNetworkData = async () => {
    setIsLoading(true);
    try {
      const netConfig = await window.electronAPI.invoke('network:getConfig');
      const netInterfaces = await window.electronAPI.invoke('network:getInterfaces') || [];
      setConfig(netConfig);
      setInterfaces(netInterfaces);
    } catch (e) {
      showAlert('Failed to load network settings: ' + e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await window.electronAPI.invoke('network:saveConfig', config);
      showAlert('Network settings saved! Server is restarting to apply changes...', 'success');
      setTimeout(async () => {
        try {
          await window.electronAPI.invoke('app:restart');
        } catch (err) {
          console.warn('App restart not supported in browser environment');
        }
      }, 1500);
    } catch (e) {
      showAlert('Failed to save settings: ' + e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const checkPorts = async () => {
    const { port, websocket_port, kds_port, qr_port } = config.server;
    const checks = await window.electronAPI.invoke('network:checkPorts', [port, websocket_port, kds_port, qr_port]);
    const res = {};
    checks.forEach(c => res[c.port] = c.available);
    setPortChecks(res);
  };
  
  const scanConflicts = async () => {
    const defaultPorts = [3000, 3001, 8080, 5432, 9090, config.server.port, config.server.websocket_port, config.server.kds_port, config.server.qr_port];
    const results = await window.electronAPI.invoke('network:scanPortConflicts', defaultPorts);
    setConflicts(results || []);
  };

  const updateConfig = (section, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const updateNestedConfig = (section, item, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [item]: {
          ...prev[section][item],
          [key]: value
        }
      }
    }));
  };

  // UI Components
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

  const renderServerConfig = () => (
    <div style={{ display: 'grid', gap: '24px' }}>
      {/* Port Settings */}
      <div style={{ padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>Server Port Allocation</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Change these only if conflicting with other software on this computer.</p>
          </div>
          <button onClick={checkPorts} style={{ padding: '8px 12px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '500', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <Activity size={14} /> Check Availability
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div>
             <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Main Server Port</label>
             <input type="number" value={config.server.port} onChange={(e) => updateConfig('server', 'port', parseInt(e.target.value))} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
             {portChecks[config.server.port] !== undefined && (
               <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: '600', color: portChecks[config.server.port] ? '#10b981' : '#ef4444' }}>
                 {portChecks[config.server.port] ? '✅ Available' : '🔴 In Use'}
               </div>
             )}
          </div>
          <div>
             <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>QR Server Port</label>
             <input type="number" value={config.server.qr_port} onChange={(e) => updateConfig('server', 'qr_port', parseInt(e.target.value))} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
             {portChecks[config.server.qr_port] !== undefined && (
               <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: '600', color: portChecks[config.server.qr_port] ? '#10b981' : '#ef4444' }}>
                 {portChecks[config.server.qr_port] ? '✅ Available' : '🔴 In Use'}
               </div>
             )}
          </div>
          <div>
             <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>WebSocket Port</label>
             <input type="number" value={config.server.websocket_port} onChange={(e) => updateConfig('server', 'websocket_port', parseInt(e.target.value))} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
             {portChecks[config.server.websocket_port] !== undefined && (
               <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: '600', color: portChecks[config.server.websocket_port] ? '#10b981' : '#ef4444' }}>
                 {portChecks[config.server.websocket_port] ? '✅ Available' : '🔴 In Use'}
               </div>
             )}
          </div>
          <div>
             <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Kitchen Display Port (KDS)</label>
             <input type="number" value={config.server.kds_port} onChange={(e) => updateConfig('server', 'kds_port', parseInt(e.target.value))} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
             {portChecks[config.server.kds_port] !== undefined && (
               <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: '600', color: portChecks[config.server.kds_port] ? '#10b981' : '#ef4444' }}>
                 {portChecks[config.server.kds_port] ? '✅ Available' : '🔴 In Use'}
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Network Interface */}
      <div style={{ padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>Network Interface (Bind Address)</h4>
        <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
           <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#475569' }}><Shield size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px', color: '#3b82f6' }}/>Use Specific IP if conflicting with other POS software (like PetPooja) on the same computer.</p>
           <select 
             value={config.server.bind_address} 
             onChange={(e) => updateConfig('server', 'bind_address', e.target.value)} 
             style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
            >
             <option value="0.0.0.0">All Interfaces (0.0.0.0) - Best for normal use</option>
             <option value="127.0.0.1">Localhost Only (127.0.0.1) - No other devices can connect</option>
             <optgroup label="Specific Interfaces">
               {interfaces.map((iface, i) => (
                 <option key={i} value={iface.address}>{iface.name} ({iface.address})</option>
               ))}
             </optgroup>
           </select>
        </div>
      </div>

      {/* Access Control & Security */}
      <div style={{ padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
           <div>
             <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>Access Control</h4>
             <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Manage who can connect to this ZapBill server.</p>
           </div>
         </div>
         <div style={{ display: 'grid', gap: '12px' }}>
           <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#334155', cursor: 'pointer' }}>
             <input type="radio" checked={config.access_control.mode === 'anyone'} onChange={() => updateConfig('access_control', 'mode', 'anyone')} />
             Anyone on same WiFi network
           </label>
           <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#334155', cursor: 'pointer' }}>
             <input type="radio" checked={config.access_control.mode === 'approved_only'} onChange={() => updateConfig('access_control', 'mode', 'approved_only')} />
             Only approved devices (Recommended)
           </label>
           
           <div style={{ marginTop: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div>
               <div style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>Require PIN for new device connection</div>
               <div style={{ fontSize: '12px', color: '#64748b' }}>New devices must enter this PIN to connect initially</div>
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
               {config.access_control.require_pin && (
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <div style={{ padding: '4px 12px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '4px', letterSpacing: '2px', fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>
                     {config.access_control.pin}
                   </div>
                   <button onClick={() => updateConfig('access_control', 'pin', Math.floor(1000 + Math.random() * 9000).toString())} style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Regenerate</button>
                 </div>
               )}
               <Toggle checked={config.access_control.require_pin} onChange={(val) => updateConfig('access_control', 'require_pin', val)} />
             </div>
           </div>
         </div>
      </div>
    </div>
  );

  const renderConnectedDevices = () => (
    <div style={{ display: 'grid', gap: '24px' }}>
      <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
           <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1' }}>
             <HardDrive size={24} style={{ color: '#0f172a' }} />
           </div>
           <div>
             <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>This Computer (Main Server)</h4>
             <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b' }}>
               <span>IP: {config.server.bind_address === '0.0.0.0' ? 'Auto/Dynamic' : config.server.bind_address}</span>
               <span>Status: <span style={{ color: '#10b981', fontWeight: '600' }}>Running</span></span>
             </div>
           </div>
         </div>
      </div>

      <div style={{ padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>Connected Devices Link</h4>
        <div style={{ padding: '16px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#1e40af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Access URL for other devices</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e3a8a', fontFamily: 'monospace' }}>
              http://{interfaces.length > 0 ? interfaces[0].address : 'localhost'}:{config.server.qr_port}
            </div>
            <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '4px' }}>Type this URL in browser on kitchen tablet or mobile</div>
          </div>
          <button style={{ padding: '8px 16px', background: '#2563eb', color: 'white', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>Show QR Code</button>
        </div>
      </div>
      
      <div style={{ padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ margin: '0', fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>Approved Devices List</h4>
          <span style={{ fontSize: '12px', padding: '4px 8px', background: '#f1f5f9', borderRadius: '12px', fontWeight: '500', color: '#64748b' }}>
            {config.access_control.approved_devices.length} Devices
          </span>
        </div>
        
        {config.access_control.approved_devices.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
             No remote devices approved yet. Other devices can connect if Access Control is set to "Anyone on same WiFi".
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
             {config.access_control.approved_devices.map((dev, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Smartphone size={20} style={{ color: '#475569' }} />
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>{dev.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>IP: {dev.ip} • Type: {dev.type}</div>
                      </div>
                   </div>
                   <button style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', padding: '4px 8px' }}>Remove</button>
                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderCloudSync = () => (
    <div style={{ display: 'grid', gap: '24px' }}>
       <div style={{ padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
           <div>
             <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>Cloud Connection Status</h4>
             <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Server URL: {config.cloud_sync.server_url}</p>
           </div>
           <button style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
             Sync Now
           </button>
         </div>

         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>License Key</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', fontFamily: 'monospace' }}>
                {license ? license.license_key : 'UNLICENSED'}
              </div>
            </div>
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Offline Token Validity</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                {config.cloud_sync.offline_token_valid_days} Days without internet
              </div>
            </div>
         </div>
       </div>

       <div style={{ padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
         <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>Sync Intervals & Behavior</h4>
         <div style={{ display: 'grid', gap: '16px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div>
               <div style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>Menu Sync Mode</div>
               <div style={{ fontSize: '12px', color: '#64748b' }}>When to push menu changes to cloud apps</div>
             </div>
             <select value={config.cloud_sync.menu_sync_mode} onChange={(e) => updateConfig('cloud_sync', 'menu_sync_mode', e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
               <option value="on_change">Immediately when saved</option>
               <option value="hourly">Every 1 hour</option>
               <option value="manual">Manual sync only</option>
             </select>
           </div>
           
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div>
               <div style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>Online Orders Check Interval</div>
               <div style={{ fontSize: '12px', color: '#64748b' }}>How often to poll cloud for new web orders</div>
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <input type="number" value={config.cloud_sync.order_check_interval_seconds} onChange={(e) => updateConfig('cloud_sync', 'order_check_interval_seconds', parseInt(e.target.value))} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center' }} />
               <span style={{ fontSize: '13px', color: '#475569' }}>seconds</span>
             </div>
           </div>

           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div>
               <div style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>Compress Sync Data</div>
               <div style={{ fontSize: '12px', color: '#64748b' }}>Use gzip compression (saves bandwidth)</div>
             </div>
             <Toggle checked={config.cloud_sync.compress_data} onChange={(val) => updateConfig('cloud_sync', 'compress_data', val)} />
           </div>
         </div>
       </div>
    </div>
  );

  const renderHardware = () => (
    <div style={{ display: 'grid', gap: '24px' }}>
       {/* Printers */}
       <div style={{ padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
         <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>Receipt & Kitchen Printers</h4>
         
         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
           {/* Billing Printer */}
           <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', color: '#0f172a' }}>
                  <Printer size={16} /> {config.printers.receipt_printer.name}
                </div>
                <span style={{ padding: '2px 8px', background: '#dcfce7', color: '#166534', borderRadius: '12px', fontSize: '10px', fontWeight: '700' }}>READY</span>
             </div>
             <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Type:</span><span style={{ fontWeight: '500' }}>{config.printers.receipt_printer.type.toUpperCase()}</span></div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Port:</span><span style={{ fontWeight: '500' }}>{config.printers.receipt_printer.port}</span></div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Paper:</span><span style={{ fontWeight: '500' }}>{config.printers.receipt_printer.paper_width}</span></div>
             </div>
             <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
               <button style={{ flex: 1, padding: '6px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Test Print</button>
               <button style={{ flex: 1, padding: '6px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Edit</button>
             </div>
           </div>

           {/* Kitchen Printer */}
           <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', color: '#0f172a' }}>
                  <Printer size={16} /> {config.printers.kitchen_printer.name}
                </div>
                <span style={{ padding: '2px 8px', background: '#dcfce7', color: '#166534', borderRadius: '12px', fontSize: '10px', fontWeight: '700' }}>READY</span>
             </div>
             <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Type:</span><span style={{ fontWeight: '500' }}>{config.printers.kitchen_printer.type.toUpperCase()}</span></div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>IP Address:</span><span style={{ fontWeight: '500' }}>{config.printers.kitchen_printer.ip || 'Not Configured'}</span></div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Port:</span><span style={{ fontWeight: '500' }}>{config.printers.kitchen_printer.port}</span></div>
             </div>
             <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
               <button style={{ flex: 1, padding: '6px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Test KOT</button>
               <button style={{ flex: 1, padding: '6px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Edit</button>
             </div>
           </div>
         </div>
       </div>

       {/* Barcode & Cash Drawer */}
       <div style={{ padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '24px' }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>Cash Drawer</h4>
             <select value={config.cash_drawer.connection} onChange={(e) => updateConfig('cash_drawer', 'connection', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', marginBottom: '12px' }}>
               <option value="through_printer">Through USB Printer (RJ11 Cable)</option>
               <option value="direct_serial">Direct Serial Port</option>
               <option value="none">None</option>
             </select>
             <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                <input type="checkbox" checked={config.cash_drawer.auto_open_on_payment} onChange={(e) => updateConfig('cash_drawer', 'auto_open_on_payment', e.target.checked)} />
                Open automatically exactly on successful payment
             </label>
          </div>
          <div style={{ width: '1px', background: '#e2e8f0' }}></div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>Barcode Scanner</h4>
             <select value={config.barcode_scanner.mode} onChange={(e) => updateConfig('barcode_scanner', 'mode', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', marginBottom: '12px' }}>
               <option value="auto_detect">Auto Detect (Hardware Keyboard Emulation)</option>
               <option value="serial">Serial COM Port</option>
               <option value="none">Disable Scanner Listener</option>
             </select>
          </div>
       </div>
    </div>
  );

  const [isScanning, setIsScanning] = useState(false);

  const runDiagnosticScan = async () => {
    setIsScanning(true);
    showAlert("Initiating full system diagnostics...", "info");
    
    try {
      // Basic checks
      const isOnline = await window.electronAPI.invoke('email:checkInternet');
      await checkPorts();
      await scanConflicts();
      
      setTimeout(() => {
        setIsScanning(false);
        if(isOnline) {
           showAlert("Diagnostics complete! Network is online and ports are verified.", "success");
        } else {
           showAlert("Diagnostics complete. Warning: System is offline, Cloud Sync will pause.", "warning");
        }
      }, 1500);
    } catch(e) {
      setIsScanning(false);
    }
  };

  const renderDiagnostics = () => (
    <div style={{ display: 'grid', gap: '24px' }}>
       {/* Diagnostic Runner */}
       <div style={{ padding: '24px', background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)', color: 'white', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(14, 165, 233, 0.2)' }}>
          <div>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '700' }}>System Health Check</h3>
            <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px' }}>Run a fully automated test to identify network, printer, and cloud sync issues.</p>
          </div>
          <button onClick={runDiagnosticScan} disabled={isScanning} style={{ padding: '12px 24px', background: 'white', color: '#2563eb', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '15px', cursor: isScanning ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', opacity: isScanning ? 0.7 : 1 }}>
             {isScanning ? 'Running Scan...' : 'Run Diagnostic Scan'}
          </button>
       </div>

       {/* Port Scanner Table */}
       <div style={{ padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
           <div>
             <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>Port Conflict Scanner</h4>
             <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>If PetPooja or Swiggy integrates are running, ports might collide.</p>
           </div>
           <button onClick={scanConflicts} style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
             Scan Ports
           </button>
         </div>

         {conflicts.length > 0 ? (
           <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
             <thead>
               <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                 <th style={{ padding: '10px 16px', fontWeight: '600', color: '#475569' }}>Port</th>
                 <th style={{ padding: '10px 16px', fontWeight: '600', color: '#475569' }}>Status</th>
                 <th style={{ padding: '10px 16px', fontWeight: '600', color: '#475569' }}>Used By Process</th>
               </tr>
             </thead>
             <tbody>
               {conflicts.map((c, i) => (
                 <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                   <td style={{ padding: '10px 16px', fontWeight: '600' }}>{c.port}</td>
                   <td style={{ padding: '10px 16px' }}>
                     <span style={{ color: c.status === 'Free' ? '#10b981' : '#ef4444', fontWeight: '600' }}>{c.status}</span>
                   </td>
                   <td style={{ padding: '10px 16px', color: '#64748b' }}>{c.usedBy}</td>
                 </tr>
               ))}
             </tbody>
           </table>
         ) : (
           <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
              Click "Scan Ports" to identify any collisions on the network stack.
           </div>
         )}
       </div>
    </div>
  );

  if (isLoading || !config) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><RefreshCw className="spin" size={32} color="#94a3b8" /></div>;
  }

  const tabs = [
    { id: 'server', label: 'Server Config', icon: Server },
    { id: 'devices', label: 'Connected Devices', icon: Smartphone },
    { id: 'cloud', label: 'Cloud Sync', icon: Cloud },
    { id: 'hardware', label: 'Printer & Hardware', icon: Printer },
    { id: 'diagnostics', label: 'Diagnose & Fix', icon: Activity },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
       {/* Header */}
       <div style={{ padding: '20px 24px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Network & Devices</h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Configure connectivity, local server APIs, KDS, and synchronization.</p>
          </div>
          <button onClick={handleSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1 }}>
             <Save size={18} />
             {isSaving ? 'Saving...' : 'Save & Restart Server'}
          </button>
       </div>

       {/* Layout Split */}
       <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* Sidebar Tabs */}
          <div style={{ width: '240px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {tabs.map(t => (
               <button 
                 key={t.id} 
                 onClick={() => setActiveSubTab(t.id)}
                 style={{ 
                   display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none',
                   background: activeSubTab === t.id ? '#e0f2fe' : 'transparent',
                   color: activeSubTab === t.id ? '#0369a1' : '#475569',
                   fontWeight: activeSubTab === t.id ? '600' : '500',
                   transition: 'all 0.2s'
                 }}
               >
                 <t.icon size={18} strokeWidth={activeSubTab === t.id ? 2.5 : 2} />
                 {t.label}
               </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div style={{ flex: 1, padding: '32px', overflowY: 'auto', background: '#f1f5f9' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              {activeSubTab === 'server' && renderServerConfig()}
              {activeSubTab === 'devices' && renderConnectedDevices()}
              {activeSubTab === 'cloud' && renderCloudSync()}
              {activeSubTab === 'hardware' && renderHardware()}
              {activeSubTab === 'diagnostics' && renderDiagnostics()}
            </div>
          </div>
       </div>
    </div>
  );
};

export default NetworkTab;
