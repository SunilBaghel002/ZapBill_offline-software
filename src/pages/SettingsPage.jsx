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
  const [printers, setPrinters] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsResult, printersResult] = await Promise.all([
        window.electronAPI.invoke('settings:getAll', {}),
        window.electronAPI.invoke('print:getPrinters')
      ]);
      
      if (Array.isArray(settingsResult)) {
        const settingsObj = {};
        settingsResult.forEach(row => {
          settingsObj[row.key] = row.value;
        });
        setSettings(settingsObj);
      }

      if (Array.isArray(printersResult)) {
        setPrinters(printersResult);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      for (const [key, value] of Object.entries(settings)) {
        await window.electronAPI.invoke('settings:update', { key, value });
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

  const handleTestPrint = async (printerName) => {
    try {
      const result = await window.electronAPI.invoke('print:testPrint', { printerName });
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
    <div style={{ padding: 'var(--spacing-6)', maxWidth: '1200px', margin: '0 auto' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-4)' }}>
              <div className="input-group">
                <label className="input-label">Restaurant Name</label>
                <input
                  type="text"
                  className="input"
                  value={settings.restaurant_name || ''}
                  onChange={(e) => updateSetting('restaurant_name', e.target.value)}
                  placeholder="e.g. Tasty Bites"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Phone Number</label>
                <input
                  type="text"
                  className="input"
                  value={settings.restaurant_phone || ''}
                  onChange={(e) => updateSetting('restaurant_phone', e.target.value)}
                  placeholder="e.g. +91 9876543210"
                />
              </div>
            </div>

            <div className="input-group" style={{ marginTop: 'var(--spacing-4)' }}>
              <label className="input-label">Address</label>
              <textarea
                className="input"
                value={settings.restaurant_address || ''}
                onChange={(e) => updateSetting('restaurant_address', e.target.value)}
                placeholder="Full address of the restaurant"
                rows={2}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-4)', marginTop: 'var(--spacing-4)' }}>
              <div className="input-group">
                <label className="input-label">GST Number</label>
                <input
                  type="text"
                  className="input"
                  value={settings.gst_number || ''}
                  onChange={(e) => updateSetting('gst_number', e.target.value)}
                  placeholder="GSTIN"
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

        {/* Printer Settings */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <Printer size={20} />
              <h3>Printer Configuration</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="alert alert-info" style={{ marginBottom: 'var(--spacing-4)' }}>
              <p>Select different printers for Customer Bills and Kitchen Orders (KOT). If using the same printer, select it in both fields.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-6)' }}>
              {/* Bill Printer */}
              <div style={{ padding: 'var(--spacing-4)', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ marginBottom: 'var(--spacing-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Printer size={16} /> Customer Bill Printer
                </h4>
                <div className="input-group">
                  <label className="input-label">Select Printer</label>
                  <select
                    className="input select"
                    value={settings.printer_bill || ''}
                    onChange={(e) => updateSetting('printer_bill', e.target.value)}
                  >
                    <option value="">-- Select Printer --</option>
                    {printers.map(p => (
                      <option key={p.name} value={p.name}>
                        {p.name} {p.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginTop: 'var(--spacing-2)' }}>
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleTestPrint(settings.printer_bill)}
                    disabled={!settings.printer_bill}
                  >
                    Test Bill Print
                  </button>
                </div>
              </div>

              {/* KOT Printer */}
              <div style={{ padding: 'var(--spacing-4)', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ marginBottom: 'var(--spacing-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Store size={16} /> Kitchen (KOT) Printer
                </h4>
                <div className="input-group">
                  <label className="input-label">Select Printer</label>
                  <select
                    className="input select"
                    value={settings.printer_kot || ''}
                    onChange={(e) => updateSetting('printer_kot', e.target.value)}
                  >
                    <option value="">-- Select Printer --</option>
                    {printers.map(p => (
                      <option key={p.name} value={p.name}>
                        {p.name} {p.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginTop: 'var(--spacing-2)' }}>
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleTestPrint(settings.printer_kot)}
                    disabled={!settings.printer_kot}
                  >
                    Test KOT Print
                  </button>
                </div>
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
          </div>
        </div>

        {/* Tax Settings */}
        <div className="card">
          <div className="card-header">
            <h3>Tax Settings</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-4)' }}>
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

        {/* Offline Mode Notice */}
        <div className="card" style={{ background: 'var(--success-50)', border: '1px solid var(--success-200)' }}>
          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--spacing-6)' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '50%',
              background: 'var(--success-100)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--spacing-3)'
            }}>
              <Cloud size={24} style={{ color: 'var(--success-600)' }} />
            </div>
            <h3 style={{ color: 'var(--success-700)', marginBottom: 'var(--spacing-2)' }}>
              Fully Offline Mode
            </h3>
            <p style={{ color: 'var(--success-600)', fontSize: 'var(--font-size-sm)' }}>
              This POS system works completely offline. All data is stored locally on this device.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
