import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  Cloud,
  Store,
  Upload,
  Database,
  Receipt,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info,
  IndianRupee,
  Monitor,
  Plus,
  Minus,
  Check
} from 'lucide-react';

const SettingsPage = () => {
  const [settings, setSettings] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [importStats, setImportStats] = useState(null);
  const [importing, setImporting] = useState(null);
  const [activeTab, setActiveTab] = useState('restaurant');
  const [dbPath, setDbPath] = useState('');
  const [isMovingDb, setIsMovingDb] = useState(false);
  const [importMenuName, setImportMenuName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const settingsResult = await window.electronAPI.invoke('settings:getAll', {});
      if (Array.isArray(settingsResult)) {
        const settingsObj = {};
        settingsResult.forEach(row => { settingsObj[row.key] = row.value; });
        setSettings(settingsObj);
      }
      window.electronAPI.invoke('db:getPath').then(setDbPath).catch(console.error);
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
      setSaveMessage('success');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Save failed:', error);
      setSaveMessage('error');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleImport = async (type) => {
    setImporting(type);
    setImportStats(null);

    try {
      // Use Electron's native file dialog instead of HTML file input
      const fileResult = await window.electronAPI.invoke('dialog:selectFile', {
        title: type === 'menu' ? 'Select Menu File' : 'Select Inventory File',
        filters: [
          { name: 'Spreadsheets', extensions: ['xlsx', 'xls', 'csv'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (!fileResult.success) {
        // User cancelled or error
        if (fileResult.error) alert('Error: ' + fileResult.error);
        setImporting(null);
        return;
      }

      const channel = type === 'menu' ? 'data:importMenu' : 'data:importInventory';
      const result = await window.electronAPI.invoke(channel, { 
        filePath: fileResult.filePath,
        menuName: type === 'menu' ? importMenuName : null
      });
      
      if (result.success) {
        setImportStats({
          type,
          success: result.successCount,
          error: result.errorCount,
          menuName: type === 'menu' ? (importMenuName || 'Default Menu') : null,
          details: result.errors || []
        });
        if (type === 'menu') setImportMenuName(''); // Clear after success
      } else {
        alert('Import failed: ' + result.error);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Error during import: ' + error.message);
    } finally {
      setImporting(null);
    }
  };

  const handleMoveDb = async () => {
    if (!confirm('Are you sure you want to move the database? The application will need to restart.')) return;
    setIsMovingDb(true);
    try {
      const result = await window.electronAPI.invoke('db:movePath');
      if (result.success) {
        alert('Database moved successfully! The application will now restart.');
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

  // Toggle Switch Component
  const Toggle = ({ checked, onChange }) => (
    <button onClick={() => onChange(!checked)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
      <div style={{
        width: '44px', height: '24px', borderRadius: '12px',
        background: checked ? 'var(--primary-500)' : 'var(--gray-300)',
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

  const tabs = [
    { id: 'restaurant', label: 'Restaurant Info', icon: Store, desc: 'Name, address & details', color: 'var(--primary-500)', bg: 'var(--primary-50)' },
    { id: 'tax', label: 'Tax Settings', icon: IndianRupee, desc: 'Tax rates & configuration', color: 'var(--success-500)', bg: 'var(--success-50)' },
    { id: 'display', label: 'Display', icon: Monitor, desc: 'Visual & zoom settings', color: '#6366f1', bg: '#eef2ff' },
    { id: 'import', label: 'Data Import', icon: Upload, desc: 'Import menu & inventory', color: 'var(--warning-600)', bg: 'var(--warning-50)' },
    { id: 'database', label: 'Database', icon: Database, desc: 'Storage & backup', color: 'var(--info-500)', bg: 'var(--info-50)' },
    { id: 'about', label: 'About', icon: Info, desc: 'System information', color: 'var(--gray-500)', bg: 'var(--gray-100)' }
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={32} style={{ color: 'var(--primary-500)', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '12px', color: 'var(--gray-500)' }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', height: 'calc(100vh - 65px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--gray-900)', margin: 0 }}>Settings</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '13px', margin: '4px 0 0' }}>Configure your restaurant POS system</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {saveMessage && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
              background: saveMessage === 'success' ? 'var(--success-50)' : 'var(--danger-50)',
              color: saveMessage === 'success' ? 'var(--success-700)' : 'var(--danger-700)',
              border: `1px solid ${saveMessage === 'success' ? 'var(--success-200)' : 'var(--danger-200)'}`
            }}>
              {saveMessage === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              {saveMessage === 'success' ? 'Settings saved!' : 'Save failed'}
            </div>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <Save size={15} /> {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Main: Tabs Left + Content Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Left Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)', padding: '12px', height: 'fit-content' }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                  border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', width: '100%',
                  background: isActive ? 'white' : 'transparent',
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s ease', position: 'relative'
                }}>
                {isActive && (
                  <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: '3px', height: '24px', borderRadius: '0 3px 3px 0', background: tab.color }} />
                )}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: isActive ? tab.bg : 'var(--gray-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s'
                }}>
                  <Icon size={18} style={{ color: isActive ? tab.color : 'var(--gray-400)' }} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: isActive ? '600' : '500', fontSize: '14px', color: isActive ? 'var(--gray-900)' : 'var(--gray-600)', whiteSpace: 'nowrap' }}>
                    {tab.label}
                  </div>
                  <div style={{ fontSize: '11px', color: isActive ? 'var(--gray-500)' : 'var(--gray-400)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tab.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Content */}
        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {/* Content Header */}
          <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            {(() => {
              const t = tabs.find(t => t.id === activeTab);
              const Icon = t?.icon;
              return (
                <>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: t?.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {Icon && <Icon size={20} style={{ color: t?.color }} />}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: '600', color: 'var(--gray-900)', margin: 0 }}>{t?.label}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: '2px 0 0' }}>{t?.desc}</p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Content Body */}
          <div style={{ padding: '28px', overflowY: 'auto', flex: 1 }}>

            {/* ═══════════ TAB: Restaurant Info ═══════════ */}
            {activeTab === 'restaurant' && (
              <div style={{ display: 'grid', gap: '28px' }}>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--gray-800)' }}>Basic Information</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="input-group">
                      <label className="input-label">Restaurant Name</label>
                      <input type="text" className="input" value={settings.restaurant_name || ''}
                        onChange={(e) => updateSetting('restaurant_name', e.target.value)} placeholder="e.g. Tasty Bites" />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Phone Number</label>
                      <input type="text" className="input" value={settings.restaurant_phone || ''}
                        onChange={(e) => updateSetting('restaurant_phone', e.target.value)} placeholder="e.g. +91 9876543210" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--gray-800)' }}>Address</h4>
                  <div className="input-group">
                    <label className="input-label">Full Address</label>
                    <textarea className="input" value={settings.restaurant_address || ''}
                      onChange={(e) => updateSetting('restaurant_address', e.target.value)}
                      placeholder="Full address of the restaurant" rows={3} style={{ resize: 'vertical' }} />
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--gray-800)' }}>Billing Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="input-group">
                      <label className="input-label">GST Number</label>
                      <input type="text" className="input" value={settings.gst_number || ''}
                        onChange={(e) => updateSetting('gst_number', e.target.value)} placeholder="GSTIN" />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Currency Symbol</label>
                      <input type="text" className="input" value={settings.currency_symbol || '₹'}
                        onChange={(e) => updateSetting('currency_symbol', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div style={{ padding: '16px 20px', background: 'var(--primary-50)', borderRadius: '12px', border: '1px solid var(--primary-200)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Info size={18} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                  <p style={{ fontSize: '13px', color: 'var(--primary-700)', margin: 0 }}>
                    Restaurant details appear on printed bills and receipts. Click <strong>Save Changes</strong> to apply.
                  </p>
                </div>
              </div>
            )}

            {/* ═══════════ TAB: Tax Settings ═══════════ */}
            {activeTab === 'tax' && (
              <div style={{ display: 'grid', gap: '28px' }}>
                <div style={{ display: 'flex', gap: '14px', padding: '16px 20px', background: 'var(--success-50)', borderRadius: '12px', border: '1px solid var(--success-200)', alignItems: 'flex-start' }}>
                  <IndianRupee size={22} style={{ color: 'var(--success-600)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: 'var(--success-700)', fontSize: '14px' }}>Tax Configuration</strong>
                    <p style={{ color: 'var(--success-600)', fontSize: '13px', marginTop: '4px', lineHeight: '1.5' }}>
                      Configure GST/tax settings for your bills. When enabled, tax will be calculated and applied to all orders.
                    </p>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--gray-800)' }}>Tax Options</h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '18px 20px', background: 'var(--gray-50)', borderRadius: '12px', border: '1px solid var(--gray-200)'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--gray-800)' }}>Enable Tax</div>
                        <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '3px' }}>
                          Apply tax to all orders. Tax will be shown on bills and reports.
                        </div>
                      </div>
                      <Toggle checked={settings.tax_enabled === 'true'} onChange={(v) => updateSetting('tax_enabled', v ? 'true' : 'false')} />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--gray-800)' }}>Tax Rate</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="input-group">
                      <label className="input-label">Default Tax Rate (%)</label>
                      <input type="number" step="0.01" className="input" value={settings.default_tax_rate || '5'}
                        onChange={(e) => updateSetting('default_tax_rate', e.target.value)} />
                      <p style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '6px' }}>
                        This is the total GST rate. It will be split equally into CGST and SGST on bills.
                      </p>
                    </div>
                    <div style={{ padding: '16px 20px', background: 'var(--gray-50)', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '8px' }}>Preview</div>
                      <div style={{ display: 'grid', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                          <span style={{ color: 'var(--gray-600)' }}>Total GST</span>
                          <strong>{settings.default_tax_rate || '5'}%</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--gray-500)' }}>
                          <span>CGST</span>
                          <span>{((parseFloat(settings.default_tax_rate) || 5) / 2).toFixed(2)}%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--gray-500)' }}>
                          <span>SGST</span>
                          <span>{((parseFloat(settings.default_tax_rate) || 5) / 2).toFixed(2)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════ TAB: Data Import ═══════════ */}
            {activeTab === 'import' && (
              <div style={{ display: 'grid', gap: '28px' }}>
                <div style={{ display: 'flex', gap: '14px', padding: '16px 20px', background: 'var(--warning-50)', borderRadius: '12px', border: '1px solid var(--warning-200)', alignItems: 'flex-start' }}>
                  <Info size={22} style={{ color: 'var(--warning-600)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: 'var(--warning-700)', fontSize: '14px' }}>Import Data from Excel/CSV</strong>
                    <p style={{ color: 'var(--warning-600)', fontSize: '13px', marginTop: '4px', lineHeight: '1.5' }}>
                      Import menu items or inventory data from spreadsheet files. Make sure the column names match ZapBill's expected format.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {/* Menu Import Card */}
                  <div style={{ padding: '24px', border: '1px solid var(--gray-200)', borderRadius: '12px', background: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Receipt size={20} style={{ color: 'var(--primary-500)' }} />
                      </div>
                      <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--gray-800)', margin: 0 }}>Import Menu Items</h4>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '16px', lineHeight: '1.5' }}>
                      Updates existing items by Name, creates new Categories if needed. Supports <strong>.xlsx</strong>, <strong>.xls</strong>, and <strong>.csv</strong> formats.
                    </p>
                    <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginBottom: '16px', padding: '12px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                      <strong style={{ color: 'var(--gray-600)' }}>Expected columns:</strong> Name, Category, Price, Tax Rate, Description
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <label className="input-label" style={{ fontSize: '11px', marginBottom: '6px' }}>Menu Profile Name (Optional)</label>
                      <input 
                        type="text" 
                        className="input" 
                        placeholder="e.g. Summer Menu, Breakfast"
                        value={importMenuName}
                        onChange={(e) => setImportMenuName(e.target.value)}
                        style={{ fontSize: '12px', padding: '8px 12px' }}
                      />
                      <p style={{ fontSize: '10px', color: 'var(--gray-400)', marginTop: '4px' }}>
                        If blank, items will be imported into the currently active menu.
                      </p>
                    </div>

                    <button className="btn btn-primary" onClick={() => handleImport('menu')} disabled={importing !== null}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}>
                      <Upload size={16} />
                      {importing === 'menu' ? 'Importing...' : 'Select Menu File'}
                    </button>
                  </div>

                  {/* Inventory Import Card */}
                  <div style={{ padding: '24px', border: '1px solid var(--gray-200)', borderRadius: '12px', background: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--info-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Database size={20} style={{ color: 'var(--info-500)' }} />
                      </div>
                      <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--gray-800)', margin: 0 }}>Import Inventory</h4>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '16px', lineHeight: '1.5' }}>
                      Updates Stock and Unit details for existing inventory items. Supports <strong>.xlsx</strong>, <strong>.xls</strong>, and <strong>.csv</strong> formats.
                    </p>
                    <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginBottom: '16px', padding: '12px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                      <strong style={{ color: 'var(--gray-600)' }}>Expected columns:</strong> Item Name, Stock, Unit, Min Stock
                    </div>
                    <button className="btn btn-primary" onClick={() => handleImport('inventory')} disabled={importing !== null}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}>
                      <Upload size={16} />
                      {importing === 'inventory' ? 'Importing...' : 'Select Inventory File'}
                    </button>
                  </div>
                </div>

                {/* Import Results */}
                {importStats && (
                  <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--gray-800)' }}>
                      Last Import Results ({importStats.type === 'menu' ? 'Menu' : 'Inventory'})
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: importStats.error > 0 ? '16px' : '0' }}>
                      <div style={{ padding: '14px 16px', background: 'var(--success-50)', borderRadius: '10px', border: '1px solid var(--success-200)' }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success-600)' }}>{importStats.success}</div>
                        <div style={{ fontSize: '12px', color: 'var(--success-600)', marginTop: '2px' }}>Successfully Imported</div>
                      </div>
                      <div style={{ padding: '14px 16px', background: 'white', borderRadius: '10px', border: '1px solid var(--primary-200)' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary-600)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{importStats.menuName || 'N/A'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--primary-600)', marginTop: '2px' }}>Menu Profile</div>
                      </div>
                      <div style={{ padding: '14px 16px', background: importStats.error > 0 ? 'var(--danger-50)' : 'var(--success-50)', borderRadius: '10px', border: `1px solid ${importStats.error > 0 ? 'var(--danger-200)' : 'var(--success-200)'}` }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: importStats.error > 0 ? 'var(--danger-600)' : 'var(--success-600)' }}>{importStats.error}</div>
                        <div style={{ fontSize: '12px', color: importStats.error > 0 ? 'var(--danger-600)' : 'var(--success-600)', marginTop: '2px' }}>Failed</div>
                      </div>
                    </div>
                    {importStats.error > 0 && importStats.details.length > 0 && (
                      <div style={{ padding: '12px 16px', background: 'white', borderRadius: '8px', border: '1px solid var(--danger-200)' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--danger-600)', marginBottom: '8px' }}>Errors:</div>
                        <ul style={{ fontSize: '12px', color: 'var(--gray-600)', paddingLeft: '20px', margin: 0 }}>
                          {importStats.details.slice(0, 5).map((err, i) => <li key={i} style={{ marginBottom: '4px' }}>{err}</li>)}
                          {importStats.details.length > 5 && <li style={{ color: 'var(--gray-400)' }}>...and {importStats.details.length - 5} more</li>}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'display' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>
                <div style={{ display: 'grid', gap: '28px' }}>
                  <div style={{ display: 'flex', gap: '14px', padding: '16px 20px', background: '#eef2ff', borderRadius: '12px', border: '1px solid #e0e7ff', alignItems: 'flex-start' }}>
                    <Monitor size={22} style={{ color: '#6366f1', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#4338ca', fontSize: '14px' }}>System Scale & Visibility</strong>
                      <p style={{ color: '#6366f1', fontSize: '13px', marginTop: '4px', lineHeight: '1.5' }}>
                        Customize the interface size to match your preference. This adjusts text, buttons, and layouts globally.
                      </p>
                    </div>
                  </div>

                  <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>Global Zoom</h4>
                      <div style={{ background: 'var(--primary-50)', color: 'var(--primary-700)', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
                        {settings.system_zoom || '100'}%
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                      <button
                        className="btn btn-secondary btn-icon"
                        onClick={() => {
                          const current = parseInt(settings.system_zoom || '100');
                          const newVal = Math.max(80, current - 5);
                          updateSetting('system_zoom', newVal.toString());
                          if (window.electronAPI?.setZoomFactor) {
                            window.electronAPI.setZoomFactor(newVal / 100);
                          }
                          // Save immediately to persist across refreshes
                          window.electronAPI.invoke('settings:update', { key: 'system_zoom', value: newVal.toString() });
                        }}
                      >
                        <Minus size={18} />
                      </button>

                      <div style={{ flex: 1, position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
                        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '4px', background: 'var(--gray-200)', borderRadius: '2px', transform: 'translateY(-50%)' }} />
                        <div style={{ 
                          position: 'absolute', top: '50%', left: 0, 
                          width: `${((parseInt(settings.system_zoom || '100') - 80) / 70) * 100}%`, 
                          height: '4px', background: 'var(--primary-500)', borderRadius: '2px', transform: 'translateY(-50%)' 
                        }} />
                        <input 
                          type="range" 
                          min="80" 
                          max="150" 
                          step="5"
                          value={settings.system_zoom || '100'} 
                          onChange={(e) => {
                            const val = e.target.value;
                            updateSetting('system_zoom', val);
                          if (window.electronAPI?.setZoomFactor) {
                            window.electronAPI.setZoomFactor(parseInt(val) / 100);
                          }
                          // Save immediately to persist across refreshes
                          window.electronAPI.invoke('settings:update', { key: 'system_zoom', value: val.toString() });
                        }}
                          style={{ 
                            position: 'relative', width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2
                          }}
                        />
                        <div style={{ 
                          position: 'absolute', top: '50%', 
                          left: `${((parseInt(settings.system_zoom || '100') - 80) / 70) * 100}%`,
                          width: '18px', height: '18px', background: 'white', border: '3px solid var(--primary-500)', 
                          borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transform: 'translate(-50%, -50%)', 
                          pointerEvents: 'none', transition: 'left 0.1s ease-out'
                        }} />
                      </div>

                      <button
                        className="btn btn-secondary btn-icon"
                        onClick={() => {
                          const current = parseInt(settings.system_zoom || '100');
                          const newVal = Math.min(150, current + 5);
                          updateSetting('system_zoom', newVal.toString());
                          if (window.electronAPI?.setZoomFactor) {
                            window.electronAPI.setZoomFactor(newVal / 100);
                          }
                          // Save immediately to persist across refreshes
                          window.electronAPI.invoke('settings:update', { key: 'system_zoom', value: newVal.toString() });
                        }}
                      >
                        <Plus size={18} />
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                      {[80, 100, 120, 150].map(val => (
                        <button
                          key={val}
                          onClick={() => {
                            updateSetting('system_zoom', val.toString());
                            if (window.electronAPI?.setZoomFactor) {
                              window.electronAPI.setZoomFactor(val / 100);
                            }
                            // Save immediately to persist across refreshes
                            window.electronAPI.invoke('settings:update', { key: 'system_zoom', value: val.toString() });
                          }}
                          style={{
                            padding: '10px', borderRadius: '8px', border: '1px solid',
                            borderColor: (settings.system_zoom || '100') == val ? 'var(--primary-500)' : 'var(--gray-200)',
                            background: (settings.system_zoom || '100') == val ? 'var(--primary-50)' : 'white',
                            color: (settings.system_zoom || '100') == val ? 'var(--primary-700)' : 'var(--gray-600)',
                            fontSize: '13px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                          }}
                        >
                          <span style={{ fontSize: val == 80 ? '11px' : val == 150 ? '15px' : '13px' }}>Aa</span>
                          {val}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: '16px 20px', background: 'var(--gray-50)', borderRadius: '12px', border: '1px dashed var(--gray-300)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Info size={18} style={{ color: 'var(--gray-400)', flexShrink: 0 }} />
                    <p style={{ fontSize: '13px', color: 'var(--gray-500)', margin: 0 }}>
                      Scaling uses browser-native <strong>REM units</strong> for smooth transitions and crisp rendering.
                    </p>
                  </div>
                </div>

                {/* Live Preview Side Panel */}
                <div className="card" style={{ position: 'sticky', top: '24px' }}>
                  <div className="card-header" style={{ padding: '14px 20px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--gray-700)' }}>Live Preview</span>
                  </div>
                  <div style={{ padding: '20px', background: 'var(--gray-50)' }}>
                    <div style={{ 
                      background: 'white', borderRadius: '12px', padding: '16px', boxShadow: 'var(--shadow-sm)',
                      transform: 'scale(1)', transformOrigin: 'top center',
                      display: 'flex', flexDirection: 'column', gap: '12px' 
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ height: '12px', width: '80px', background: 'var(--gray-200)', borderRadius: '6px' }} />
                        <Check size={14} style={{ color: 'var(--success-500)' }} />
                      </div>
                      <div style={{ height: '32px', width: '100%', background: 'var(--primary-500)', borderRadius: '8px', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                        <div style={{ height: '8px', width: '40%', background: 'rgba(255,255,255,0.3)', borderRadius: '4px' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        <div style={{ height: '40px', background: 'var(--gray-100)', borderRadius: '8px' }} />
                        <div style={{ height: '40px', background: 'var(--gray-100)', borderRadius: '8px' }} />
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--gray-400)', textAlign: 'center', margin: 0 }}>
                        Current interface size example
                      </p>
                    </div>

                    <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Text Size</span>
                        <span style={{ fontWeight: 600 }}>{Math.round((parseInt(settings.system_zoom || '100') / 100) * 16)}px</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Button Height</span>
                        <span style={{ fontWeight: 600 }}>{Math.round((parseInt(settings.system_zoom || '100') / 100) * 44)}px</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════ TAB: Database ═══════════ */}
            {activeTab === 'database' && (
              <div style={{ display: 'grid', gap: '28px' }}>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--gray-800)' }}>Database Location</h4>
                  <div style={{ padding: '20px', background: 'var(--gray-50)', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
                    <div className="input-group">
                      <label className="input-label">Current Database Path</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input type="text" className="input" value={dbPath || 'Loading...'} readOnly disabled
                          style={{ background: 'var(--gray-100)', color: 'var(--gray-600)', fontFamily: 'monospace', fontSize: '13px' }} />
                        <button className="btn btn-secondary" onClick={handleMoveDb} disabled={isMovingDb}
                          style={{ whiteSpace: 'nowrap' }}>
                          {isMovingDb ? 'Moving...' : 'Move...'}
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '12px', padding: '12px 16px', background: 'var(--warning-50)', borderRadius: '8px', border: '1px solid var(--warning-200)' }}>
                      <AlertCircle size={16} style={{ color: 'var(--warning-600)', flexShrink: 0, marginTop: '1px' }} />
                      <p style={{ fontSize: '12px', color: 'var(--warning-700)', margin: 0, lineHeight: '1.5' }}>
                        Moving the database will restart the application. Make sure no orders are being processed.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--gray-800)' }}>Storage Information</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ padding: '18px 20px', background: 'var(--gray-50)', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--gray-400)', fontWeight: '600', letterSpacing: '0.5px' }}>Database Type</div>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--gray-800)', marginTop: '6px' }}>SQLite (Local)</div>
                    </div>
                    <div style={{ padding: '18px 20px', background: 'var(--gray-50)', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--gray-400)', fontWeight: '600', letterSpacing: '0.5px' }}>Mode</div>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--success-600)', marginTop: '6px' }}>Fully Offline</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════ TAB: About ═══════════ */}
            {activeTab === 'about' && (
              <div style={{ display: 'grid', gap: '28px' }}>
                <div style={{ padding: '32px', background: 'linear-gradient(135deg, var(--success-50) 0%, #f0fdf4 100%)', borderRadius: '12px', border: '1px solid var(--success-200)', textAlign: 'center' }}>
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '50%', background: 'var(--success-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
                  }}>
                    <Cloud size={28} style={{ color: 'var(--success-600)' }} />
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--success-700)', margin: '0 0 8px' }}>
                    Fully Offline POS System
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--success-600)', margin: 0, lineHeight: '1.6' }}>
                    ZapBill works completely offline. All data is stored locally on your device.
                    <br />No internet connection required for any functionality.
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--gray-800)' }}>System Details</h4>
                  <div style={{ border: '1px solid var(--gray-200)', borderRadius: '12px', overflow: 'hidden' }}>
                    {[
                      { label: 'Application', value: 'ZapBill POS' },
                      { label: 'Platform', value: 'Electron (Desktop)' },
                      { label: 'Database', value: 'SQLite' },
                      { label: 'Data Storage', value: 'Local (Offline)' },
                    ].map((item, idx) => (
                      <div key={idx} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '14px 20px', borderBottom: idx < 3 ? '1px solid var(--gray-100)' : 'none',
                        background: idx % 2 === 0 ? 'white' : 'var(--gray-50)'
                      }}>
                        <span style={{ fontSize: '14px', color: 'var(--gray-600)' }}>{item.label}</span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--gray-800)' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
