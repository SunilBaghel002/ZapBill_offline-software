import React, { useState, useEffect } from 'react';
import { Server, Wifi, WifiOff, Printer, Users, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useLicenseStore } from '../../stores/licenseStore';

const NetworkStatusBar = () => {
  const { license } = useLicenseStore();
  const [status, setStatus] = useState({
    serverIp: '127.0.0.1',
    serverPort: '4500',
    isOnline: true,
    printerOk: true,
    printerErrorMsg: '',
    deviceCount: 0,
    lastSync: 'Just now',
    hasPortConflict: false,
    portConflictMsg: ''
  });

  const getAmcDays = () => {
    if (!license || !license.amc_valid_upto) return 0;
    const diff = new Date(license.amc_valid_upto) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const amcDays = getAmcDays();

  // Polling simulated for simple UI until full websocket sync is added
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const config = await window.electronAPI.invoke('network:getConfig');
        const interfaces = await window.electronAPI.invoke('network:getInterfaces') || [];
        const isOnline = await window.electronAPI.invoke('email:checkInternet'); // simple ping
        
        let ip = '127.0.0.1';
        if (config.server.bind_address === '0.0.0.0' && interfaces.length > 0) {
          ip = interfaces[0].address;
        } else if (config.server.bind_address !== '127.0.0.1' && config.server.bind_address !== '0.0.0.0') {
          ip = config.server.bind_address;
        }

        setStatus(prev => ({
          ...prev,
          serverIp: ip,
          serverPort: config.server.port,
          isOnline: isOnline,
        }));
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchStatus();
    const intv = setInterval(fetchStatus, 15000);
    return () => clearInterval(intv);
  }, []);

  return (
    <div style={{
      height: '32px',
      background: status.hasPortConflict ? '#fef2f2' : (status.isOnline ? '#0f172a' : '#334155'),
      color: status.hasPortConflict ? '#ef4444' : '#e2e8f0',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      fontSize: '12px',
      fontWeight: '500',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      zIndex: 50,
      position: 'relative'
    }}>
      {status.hasPortConflict ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: '600' }}>
          <AlertTriangle size={14} />
          {status.portConflictMsg} <button onClick={() => window.location.hash = '#/settings?tab=network'} style={{ background: 'transparent', border: 'none', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px' }}>Fix</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', width: '100%' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Server size={14} style={{ color: '#10b981' }} />
            <span>Server: {status.serverIp}:{status.serverPort}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: status.isOnline ? '#38bdf8' : '#94a3b8' }}>
            {status.isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{status.isOnline ? 'Online' : 'Offline - Cloud paused'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: status.printerOk ? '#a3e635' : '#ef4444' }}>
            <Printer size={14} />
            <span>{status.printerOk ? 'Printer OK' : 'Printer Error!'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fcd34d' }}>
            <Users size={14} />
            <span>{status.deviceCount} Devices</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
            <Clock size={14} />
            <span>Synced: {status.lastSync}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: amcDays < 30 ? '#ef4444' : '#e2e8f0', marginLeft: 'auto' }}>
            <ShieldCheck size={14} style={{ color: amcDays < 30 ? '#ef4444' : '#8b5cf6' }} />
            <span>AMC: {amcDays} days</span>
          </div>

        </div>
      )}
    </div>
  );
};

export default NetworkStatusBar;
