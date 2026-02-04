import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  Printer, 
  Cloud,
  Store,
  RefreshCw
} from 'lucide-react';

const SettingsPage = () => {
  const [settings, setSettings] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await window.electronAPI.invoke('db:query', {
        table: 'settings',
        action: 'SELECT',
        where: {},
      });
      
      const settingsObj = {};
      result.forEach(row => {
        settingsObj[row.key] = row.value;
      });
      setSettings(settingsObj);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      for (const [key, value] of Object.entries(settings)) {
        await window.electronAPI.invoke('db:query', {
          table: 'settings',
          action: 'UPDATE',
          data: { value },
          where: { key },
        });
      }
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Save failed:', error);
      setSaveMessage('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleTestPrint = async () => {
    try {
      const result = await window.electronAPI.invoke('print:testPrint');
      if (result.success) {
        alert('Test print sent successfully!');
      } else {
        alert('Print failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Print failed: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="empty-state">
        <div className="loading-spinner" />
        <p className="mt-4">Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 'var(--spacing-6)'
      }}>
        <div>
          <h1>Settings</h1>
          <p className="text-muted">Configure your restaurant POS system</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Save size={18} />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {saveMessage && (
        <div style={{
          padding: 'var(--spacing-3)',
          background: saveMessage.includes('success') ? 'var(--success-50)' : 'var(--error-50)',
          color: saveMessage.includes('success') ? 'var(--success-700)' : 'var(--error-700)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--spacing-4)',
        }}>
          {saveMessage}
        </div>
      )}

      <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
        {/* Restaurant Info */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <Store size={20} />
              <h3>Restaurant Information</h3>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
              <div className="input-group">
                <label className="input-label">Restaurant Name</label>
                <input
                  type="text"
                  className="input"
                  value={settings.restaurant_name || ''}
                  onChange={(e) => updateSetting('restaurant_name', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Phone Number</label>
                <input
                  type="text"
                  className="input"
                  value={settings.restaurant_phone || ''}
                  onChange={(e) => updateSetting('restaurant_phone', e.target.value)}
                />
              </div>
            </div>

            <div className="input-group" style={{ marginTop: 'var(--spacing-4)' }}>
              <label className="input-label">Address</label>
              <input
                type="text"
                className="input"
                value={settings.restaurant_address || ''}
                onChange={(e) => updateSetting('restaurant_address', e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)', marginTop: 'var(--spacing-4)' }}>
              <div className="input-group">
                <label className="input-label">GST Number</label>
                <input
                  type="text"
                  className="input"
                  value={settings.gst_number || ''}
                  onChange={(e) => updateSetting('gst_number', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Currency Symbol</label>
                <input
                  type="text"
                  className="input"
                  value={settings.currency_symbol || '₹'}
                  onChange={(e) => updateSetting('currency_symbol', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tax Settings */}
        <div className="card">
          <div className="card-header">
            <h3>Tax Settings</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
              <div className="input-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.tax_enabled === 'true'}
                    onChange={(e) => updateSetting('tax_enabled', e.target.checked ? 'true' : 'false')}
                  />
                  <span>Enable Tax</span>
                </label>
              </div>
              <div className="input-group">
                <label className="input-label">Default Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={settings.default_tax_rate || '5'}
                  onChange={(e) => updateSetting('default_tax_rate', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Printer Settings */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <Printer size={20} />
              <h3>Printer Settings</h3>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
              <div className="input-group">
                <label className="input-label">Printer Name</label>
                <input
                  type="text"
                  className="input"
                  value={settings.printer_name || ''}
                  onChange={(e) => updateSetting('printer_name', e.target.value)}
                  placeholder="Leave empty for default"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Printer Type</label>
                <select
                  className="input select"
                  value={settings.printer_type || 'thermal'}
                  onChange={(e) => updateSetting('printer_type', e.target.value)}
                >
                  <option value="thermal">Thermal (ESC/POS)</option>
                  <option value="standard">Standard</option>
                </select>
              </div>
            </div>

            <div className="input-group" style={{ marginTop: 'var(--spacing-4)' }}>
              <label className="input-label">Receipt Footer Message</label>
              <input
                type="text"
                className="input"
                value={settings.receipt_footer || ''}
                onChange={(e) => updateSetting('receipt_footer', e.target.value)}
                placeholder="Thank you for dining with us!"
              />
            </div>

            <button 
              className="btn btn-secondary"
              style={{ marginTop: 'var(--spacing-4)' }}
              onClick={handleTestPrint}
            >
              <Printer size={18} />
              Test Print
            </button>
          </div>
        </div>

        {/* Cloud Sync Settings */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <Cloud size={20} />
              <h3>Cloud Sync</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.sync_enabled === 'true'}
                  onChange={(e) => updateSetting('sync_enabled', e.target.checked ? 'true' : 'false')}
                />
                <span>Enable Cloud Sync</span>
              </label>
            </div>

            <div className="input-group" style={{ marginTop: 'var(--spacing-4)' }}>
              <label className="input-label">Cloud API URL</label>
              <input
                type="url"
                className="input"
                value={settings.cloud_api_url || ''}
                onChange={(e) => updateSetting('cloud_api_url', e.target.value)}
                placeholder="https://your-api-server.com"
              />
            </div>

            <div className="input-group" style={{ marginTop: 'var(--spacing-4)' }}>
              <label className="input-label">Sync Interval (milliseconds)</label>
              <input
                type="number"
                className="input"
                value={settings.sync_interval || '30000'}
                onChange={(e) => updateSetting('sync_interval', e.target.value)}
              />
              <p className="text-xs text-muted" style={{ marginTop: 'var(--spacing-1)' }}>
                How often to sync with cloud (default: 30000ms = 30 seconds)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
