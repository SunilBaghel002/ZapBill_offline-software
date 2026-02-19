import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  Printer, 
  Cloud,
  Store,
  RefreshCw,
  Upload
} from 'lucide-react';

const SettingsPage = () => {
  const [settings, setSettings] = useState({});
  const [printers, setPrinters] = useState([]); // Keep printers for now if needed, or remove?
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [importStats, setImportStats] = useState(null);
  const [importing, setImporting] = useState(null);

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



  const handleImport = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Electron specific: file.path exposes the full path
    const filePath = file.path;
    if (!filePath) {
      alert('Unable to get file path. Please ensure you are using the Electron app.');
      return;
    }

    setImporting(type);
    setImportStats(null);

    try {
      const channel = type === 'menu' ? 'data:importMenu' : 'data:importInventory';
      const result = await window.electronAPI.invoke(channel, { filePath });
      
      if (result.success) {
        setImportStats({
          type,
          success: result.successCount,
          error: result.errorCount,
          details: result.errors
        });
        alert(`Import successful! Added: ${result.successCount}, Failed: ${result.errorCount}`);
      } else {
        alert('Import failed: ' + result.error);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Error during import: ' + error.message);
    } finally {
      setImporting(null);
      // Reset input
      e.target.value = '';
    }
  };

  const [dbPath, setDbPath] = useState('');
  const [isMovingDb, setIsMovingDb] = useState(false);

  useEffect(() => {
    window.electronAPI.invoke('db:getPath').then(setDbPath).catch(console.error);
  }, []);

  const handleMoveDb = async () => {
    if (!confirm('Are you sure you want to move the database? The application will need to restart.')) return;
    
    setIsMovingDb(true);
    try {
      const result = await window.electronAPI.invoke('db:movePath');
      if (result.success) {
        alert('Database moved successfully! The application will now restart.');
        // Trigger generic "reload" or just let the user restart. 
        // Ideally main process handles restart but for now we can alert.
        window.location.reload(); 
      } else if (!result.cancelled) {
        alert('Failed to move database: ' + result.error);
      }
    } catch (error) {
      console.error('Move DB error:', error);
      alert('Error moving database: ' + error.message);
    } finally {
      setIsMovingDb(false);
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


        {/* Data Management */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <Upload size={20} />
              <h3>Data Management (Import)</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="alert alert-info" style={{ marginBottom: 'var(--spacing-4)' }}>
              <p>Import data from Excel/CSV files. Compatible with ZapBill exports (ensure column names match).</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-4)' }}>
              {/* Menu Import */}
              <div style={{ padding: 'var(--spacing-4)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ marginBottom: 'var(--spacing-2)' }}>Import Menu Items</h4>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)', marginBottom: 'var(--spacing-3)' }}>
                  Updates existing items by Name, creates new Categories if needed.
                </p>
                <label className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <Upload size={16} />
                  {importing === 'menu' ? 'Importing...' : 'Select Menu File'}
                  <input 
                    type="file" 
                    accept=".xlsx,.xls,.csv" 
                    style={{ display: 'none' }} 
                    onChange={(e) => handleImport(e, 'menu')}
                    disabled={importing !== null}
                  />
                </label>
              </div>

              {/* Inventory Import */}
              <div style={{ padding: 'var(--spacing-4)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ marginBottom: 'var(--spacing-2)' }}>Import Inventory</h4>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)', marginBottom: 'var(--spacing-3)' }}>
                  Updates Stock and Unit details for inventory items.
                </p>
                <label className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <Upload size={16} />
                  {importing === 'inventory' ? 'Importing...' : 'Select Inventory File'}
                  <input 
                    type="file" 
                    accept=".xlsx,.xls,.csv" 
                    style={{ display: 'none' }} 
                    onChange={(e) => handleImport(e, 'inventory')}
                    disabled={importing !== null}
                  />
                </label>
              </div>
            </div>

            {importStats && (
               <div style={{ marginTop: 'var(--spacing-4)', padding: 'var(--spacing-3)', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                 <p style={{ fontWeight: 'bold' }}>Last Import Results ({importStats.type}):</p>
                 <p style={{ color: 'var(--success-600)' }}>✅ Successfully Imported: {importStats.success}</p>
                 {importStats.error > 0 && (
                   <div style={{ color: 'var(--danger-600)', marginTop: 'var(--spacing-2)' }}>
                     <p>❌ Failed: {importStats.error}</p>
                     <ul style={{ fontSize: 'var(--font-size-sm)', paddingLeft: 'var(--spacing-4)' }}>
                       {importStats.details.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                       {importStats.details.length > 5 && <li>...and {importStats.details.length - 5} more</li>}
                     </ul>
                   </div>
                 )}
               </div>
            )}
          </div>
        </div>

        {/* Database Management */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <Settings size={20} />
              <h3>Database Settings</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="input-group">
               <label className="input-label">Current Database Location</label>
               <div style={{ display: 'flex', gap: '10px' }}>
                 <input 
                    type="text" 
                    className="input" 
                    value={dbPath || 'Loading...'} 
                    readOnly 
                    disabled
                    style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}
                 />
                 <button 
                    className="btn btn-secondary"
                    onClick={handleMoveDb}
                    disabled={isMovingDb}
                 >
                    {isMovingDb ? 'Moving...' : 'Move...'}
                 </button>
               </div>
               <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '6px' }}>
                 Note: The application will restart after moving the database.
               </p>
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
