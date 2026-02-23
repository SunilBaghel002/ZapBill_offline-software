import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Store, 
  Receipt, 
  ChefHat, 
  Image, 
  Plus, 
  Trash2, 
  Upload,
  CheckCircle2,
  ArrowRight,
  Zap,
  FileText,
  RefreshCw,
  Info,
  Workflow,
  X
} from 'lucide-react';

const PrintersPage = () => {
  const [settings, setSettings] = useState({});
  const [printers, setPrinters] = useState([]);
  const [stations, setStations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryMap, setCategoryMap] = useState([]);
  
  const [printerTab, setPrinterTab] = useState('bill');
  const [newStation, setNewStation] = useState({ station_name: '', printer_name: '' });
  const [showAddStation, setShowAddStation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [testingPrinter, setTestingPrinter] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsResult, printersResult, stationsResult, categoriesResult, categoryMapResult] = await Promise.all([
        window.electronAPI.invoke('settings:getAll', {}),
        window.electronAPI.invoke('print:getPrinters'),
        window.electronAPI.invoke('printer:getStations').catch(() => []),
        window.electronAPI.invoke('menu:getCategories').catch(() => []),
        window.electronAPI.invoke('printer:getCategoryMap').catch(() => [])
      ]);
      
      if (Array.isArray(settingsResult)) {
        const settingsObj = {};
        settingsResult.forEach(row => { settingsObj[row.key] = row.value; });
        setSettings(settingsObj);
      }
      if (Array.isArray(printersResult)) setPrinters(printersResult);
      if (Array.isArray(stationsResult)) setStations(stationsResult);
      if (Array.isArray(categoriesResult)) setCategories(categoriesResult);
      if (Array.isArray(categoryMapResult)) setCategoryMap(categoryMapResult);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    try {
      await window.electronAPI.invoke('settings:update', { key, value });
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  const handleTestPrint = async (printerName) => {
    if (!printerName) return;
    setTestingPrinter(printerName);
    try {
      const result = await window.electronAPI.invoke('print:testPrint', { printerName });
      if (result.success) alert('✅ Test print sent successfully!');
      else alert('❌ Print failed: ' + (result.error || 'Unknown error'));
    } catch (error) {
      alert('❌ Print failed: ' + error.message);
    } finally {
      setTestingPrinter(null);
    }
  };

  const handleAddStation = async () => {
    if (!newStation.station_name || !newStation.printer_name) {
      alert('Please enter station name and select a printer');
      return;
    }
    try {
      await window.electronAPI.invoke('printer:saveStation', { station: newStation });
      setNewStation({ station_name: '', printer_name: '' });
      setShowAddStation(false);
      const updated = await window.electronAPI.invoke('printer:getStations');
      setStations(updated || []);
    } catch (e) { console.error(e); }
  };

  const handleDeleteStation = async (id) => {
    if (!confirm('Delete this station? This will remove its category assignments.')) return;
    try {
      await window.electronAPI.invoke('printer:deleteStation', { id });
      const updated = await window.electronAPI.invoke('printer:getStations');
      setStations(updated || []);
      const mapUpdated = await window.electronAPI.invoke('printer:getCategoryMap');
      setCategoryMap(mapUpdated || []);
    } catch (e) { console.error(e); }
  };

  const handleToggleCategoryStation = async (categoryId, stationId) => {
    const existing = categoryMap.filter(m => m.category_id === categoryId).map(m => m.station_id);
    let newIds = existing.includes(stationId)
      ? existing.filter(id => id !== stationId)
      : [...existing, stationId];
      
    try {
      await window.electronAPI.invoke('printer:saveCategoryMap', { categoryId, stationIds: newIds });
      const updated = await window.electronAPI.invoke('printer:getCategoryMap');
      setCategoryMap(updated || []);
    } catch (e) { console.error(e); }
  };

  const handleSelectLogo = async () => {
    try {
      const result = await window.electronAPI.invoke('print:selectLogo');
      if (result && result.success) {
        updateSetting('bill_logo_path', result.base64);
      }
    } catch (e) { console.error(e); }
  };

  // Toggle Switch Component
  const Toggle = ({ checked, onChange }) => (
    <button
      onClick={() => onChange(!checked)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
    >
      <div style={{
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        background: checked ? 'var(--primary-500)' : 'var(--gray-300)',
        position: 'relative',
        transition: 'background 0.2s ease'
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'white',
          position: 'absolute',
          top: '2px',
          left: checked ? '22px' : '2px',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
        }} />
      </div>
    </button>
  );

  const tabs = [
    { id: 'bill', label: 'Bill Printer', icon: Receipt, desc: 'Customer receipt printer', color: 'var(--success-500)', bg: 'var(--success-50)' },
    { id: 'kot', label: 'KOT Printer', icon: ChefHat, desc: 'Default kitchen printer', color: 'var(--warning-600)', bg: 'var(--warning-50)' },
    { id: 'stations', label: 'Kitchen Stations', icon: Store, desc: 'Station routing & printers', color: 'var(--info-500)', bg: 'var(--info-50)' },
    { id: 'format', label: 'Bill Format', icon: FileText, desc: 'Logo, QR & invoice options', color: 'var(--gray-600)', bg: 'var(--gray-100)' },
    { id: 'flow', label: 'Print Flow', icon: Workflow, desc: 'How printing works', color: 'var(--primary-500)', bg: 'var(--primary-50)' }
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={32} style={{ color: 'var(--primary-500)', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '12px', color: 'var(--gray-500)' }}>Loading printer configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '24px', 
      height: 'calc(100vh - 65px)', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        flexShrink: 0
      }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--gray-900)', margin: 0 }}>
            Printer Management
          </h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '13px', margin: '4px 0 0' }}>
            Configure receipts, kitchen stations, and print formats
          </p>
        </div>
        <button 
          className="btn btn-secondary"
          onClick={loadData}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
        >
          <RefreshCw size={15} /> Refresh Printers
        </button>
      </div>

      {/* Main Content: Tabs Left + Content Right */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '260px 1fr', 
        gap: '20px', 
        flex: 1, 
        minHeight: 0 
      }}>
        {/* ══════════ LEFT: Tab Navigation ══════════ */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '6px',
          background: 'var(--gray-50)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--gray-200)',
          padding: '12px',
          height: 'fit-content'
        }}>
          {tabs.map(tab => {
            const isActive = printerTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setPrinterTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  background: isActive ? 'white' : 'transparent',
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '3px',
                    height: '24px',
                    borderRadius: '0 3px 3px 0',
                    background: tab.color
                  }} />
                )}
                <div style={{ 
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px', 
                  background: isActive ? tab.bg : 'var(--gray-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s'
                }}>
                  <Icon size={18} style={{ color: isActive ? tab.color : 'var(--gray-400)' }} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ 
                    fontWeight: isActive ? '600' : '500', 
                    fontSize: '14px', 
                    color: isActive ? 'var(--gray-900)' : 'var(--gray-600)',
                    whiteSpace: 'nowrap'
                  }}>
                    {tab.label}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: isActive ? 'var(--gray-500)' : 'var(--gray-400)', 
                    marginTop: '1px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {tab.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ══════════ RIGHT: Content Area ══════════ */}
        <div style={{ 
          background: 'white', 
          borderRadius: 'var(--radius-lg)', 
          border: '1px solid var(--gray-200)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden'
        }}>
          {/* Content Header */}
          <div style={{ 
            padding: '20px 28px', 
            borderBottom: '1px solid var(--gray-200)', 
            background: 'var(--gray-50)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0
          }}>
            {(() => {
              const activeTab = tabs.find(t => t.id === printerTab);
              const Icon = activeTab?.icon;
              return (
                <>
                  <div style={{ 
                    width: '40px', height: '40px', borderRadius: '10px', 
                    background: activeTab?.bg, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center' 
                  }}>
                    {Icon && <Icon size={20} style={{ color: activeTab?.color }} />}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: '600', color: 'var(--gray-900)', margin: 0 }}>
                      {activeTab?.label}
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: '2px 0 0' }}>
                      {activeTab?.desc}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Content Body */}
          <div style={{ padding: '28px', overflowY: 'auto', flex: 1 }}>

            {/* ═══════════ TAB: Bill Printer ═══════════ */}
            {printerTab === 'bill' && (
              <div style={{ display: 'grid', gap: '28px' }}>
                {/* Info Banner */}
                <div style={{ 
                  display: 'flex', gap: '14px', padding: '16px 20px', 
                  background: 'var(--success-50)', borderRadius: '12px', 
                  border: '1px solid var(--success-200)', alignItems: 'flex-start' 
                }}>
                  <Printer size={22} style={{ color: 'var(--success-600)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: 'var(--success-700)', fontSize: '14px' }}>Primary Bill Printer</strong>
                    <p style={{ color: 'var(--success-600)', fontSize: '13px', marginTop: '4px', lineHeight: '1.5' }}>
                      This printer is used for printing customer receipts and invoices. When an order is placed, 
                      the bill is automatically sent to this printer.
                    </p>
                  </div>
                </div>

                {/* Printer Selection */}
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--gray-800)' }}>Printer Configuration</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="input-group">
                      <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        Select Printer 
                        <span style={{ fontSize: '11px', color: 'var(--success-600)', fontWeight: 'normal' }}>USB / Wi-Fi / Bluetooth supported</span>
                      </label>
                      <select className="input select" value={settings.printer_bill || ''} onChange={(e) => updateSetting('printer_bill', e.target.value)}>
                        <option value="">-- Select Printer --</option>
                        {printers.map(p => <option key={p.name} value={p.name}>{p.displayName || p.name} {p.isDefault ? '(Default)' : ''}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Paper Width</label>
                      <select className="input select" value={settings.bill_paper_width || '80'} onChange={(e) => updateSetting('bill_paper_width', e.target.value)}>
                        <option value="80">80mm (Standard)</option>
                        <option value="58">58mm (Compact)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--gray-800)' }}>Receipt Footer</h4>
                  <div className="input-group">
                    <label className="input-label">Footer Message</label>
                    <input
                      type="text" className="input"
                      value={settings.receipt_footer || ''}
                      onChange={(e) => updateSetting('receipt_footer', e.target.value)}
                      placeholder="Thank you for dining with us!"
                    />
                    <p style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '6px' }}>This message will appear at the bottom of every printed bill.</p>
                  </div>
                </div>

                {/* Test Print */}
                <div style={{ 
                  padding: '20px', background: 'var(--gray-50)', borderRadius: '12px', 
                  border: '1px solid var(--gray-200)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--gray-800)' }}>Test Bill Printer</div>
                    <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '2px' }}>
                      Send a test page to verify printer connection
                    </div>
                  </div>
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleTestPrint(settings.printer_bill)}
                    disabled={!settings.printer_bill || testingPrinter === settings.printer_bill}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Printer size={16} />
                    {testingPrinter === settings.printer_bill ? 'Printing...' : 'Test Print'}
                  </button>
                </div>

                {/* System Printers List */}
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={18} style={{ color: 'var(--primary-500)' }} /> Detected System Printers
                  </h4>
                  <div style={{ 
                    background: 'white', borderRadius: '12px', border: '1px solid var(--gray-200)', overflow: 'hidden'
                  }}>
                    {printers.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-500)', fontSize: '13px' }}>
                        No printers detected on this computer.
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead style={{ background: 'var(--gray-50)' }}>
                          <tr>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--gray-700)', borderBottom: '1px solid var(--gray-200)' }}>Printer Name</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--gray-700)', borderBottom: '1px solid var(--gray-200)' }}>Status</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--gray-700)', borderBottom: '1px solid var(--gray-200)' }}>Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {printers.map((p, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                              <td style={{ padding: '12px 16px', fontWeight: '500', color: 'var(--gray-800)' }}>
                                {p.displayName || p.name}
                                {p.isDefault && <span style={{ marginLeft: '8px', fontSize: '10px', background: 'var(--primary-100)', color: 'var(--primary-700)', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>DEFAULT</span>}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                {p.status !== 0 ? (
                                  <span style={{ color: 'var(--error-600)', fontSize: '12px', display:'flex', alignItems:'center', gap:'4px' }}><span style={{width:'8px', height:'8px', borderRadius:'50%', background:'var(--error-500)'}}></span> Offline / Error</span>
                                ) : (
                                  <span style={{ color: 'var(--success-600)', fontSize: '12px', display:'flex', alignItems:'center', gap:'4px' }}><span style={{width:'8px', height:'8px', borderRadius:'50%', background:'var(--success-500)'}}></span> Ready</span>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px', color: 'var(--gray-500)', fontSize: '12px' }}>
                                {p.name.toLowerCase().includes('pdf') || p.name.toLowerCase().includes('xps') || p.name.toLowerCase().includes('onenote') ? 'Virtual/Software' : 'Hardware (USB/Network)'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <Info size={14} /> ZapBill automatically detects any USB, Wi-Fi, Ethernet, or Bluetooth printer connected to your operating system.
                  </p>
                </div>
              </div>
            )}

            {/* ═══════════ TAB: KOT Printer ═══════════ */}
            {printerTab === 'kot' && (
              <div style={{ display: 'grid', gap: '28px' }}>
                {/* Info Banner */}
                <div style={{ 
                  display: 'flex', gap: '14px', padding: '16px 20px', 
                  background: 'var(--warning-50)', borderRadius: '12px', 
                  border: '1px solid var(--warning-200)', alignItems: 'flex-start' 
                }}>
                  <Info size={22} style={{ color: 'var(--warning-600)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: 'var(--warning-700)', fontSize: '14px' }}>Default / Fallback Printer</strong>
                    <p style={{ color: 'var(--warning-600)', fontSize: '13px', marginTop: '4px', lineHeight: '1.5' }}>
                      This printer handles KOTs for items that aren't assigned to any specific kitchen station. 
                      If you have kitchen stations configured, only unmapped category items will print here.
                    </p>
                  </div>
                </div>

                {/* Printer Selection */}
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--gray-800)' }}>KOT Printer Configuration</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="input-group">
                      <label className="input-label">Select KOT Printer</label>
                      <select className="input select" value={settings.printer_kot || ''} onChange={(e) => updateSetting('printer_kot', e.target.value)}>
                        <option value="">-- Select Printer --</option>
                        {printers.map(p => <option key={p.name} value={p.name}>{p.displayName || p.name} {p.isDefault ? '(Default)' : ''}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button 
                        className="btn btn-primary"
                        onClick={() => handleTestPrint(settings.printer_kot)}
                        disabled={!settings.printer_kot || testingPrinter === settings.printer_kot}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '42px' }}
                      >
                        <Printer size={16} />
                        {testingPrinter === settings.printer_kot ? 'Printing...' : 'Test Print'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* KOT Options */}
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--gray-800)' }}>KOT Printing Options</h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '18px 20px', background: 'var(--gray-50)', 
                      borderRadius: '12px', border: '1px solid var(--gray-200)' 
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--gray-800)' }}>Auto-Print KOT</div>
                        <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '3px' }}>
                          Automatically send KOT to kitchen when saving a new order
                        </div>
                      </div>
                      <Toggle checked={settings.auto_print_kot === 'true'} onChange={(v) => updateSetting('auto_print_kot', v ? 'true' : 'false')} />
                    </div>

                    <div style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '18px 20px', background: 'var(--gray-50)', 
                      borderRadius: '12px', border: '1px solid var(--gray-200)' 
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--gray-800)' }}>Attach Mini-Bill with KOT</div>
                        <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '3px' }}>
                          Print a condensed bill summary below each KOT (tear-off kitchen reference copy)
                        </div>
                      </div>
                      <Toggle checked={settings.kot_attach_bill !== 'false'} onChange={(v) => updateSetting('kot_attach_bill', v ? 'true' : 'false')} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════ TAB: Kitchen Stations ═══════════ */}
            {printerTab === 'stations' && (
              <div style={{ display: 'grid', gap: '28px' }}>
                {/* Header with Add Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: 'var(--gray-500)', fontSize: '13px', margin: 0 }}>
                      Create stations (e.g., Bar, Tandoor, Chinese) and assign menu categories to route KOTs to separate kitchen printers.
                    </p>
                  </div>
                  <button className="btn btn-primary" onClick={() => setShowAddStation(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                    <Plus size={16} /> Add Station
                  </button>
                </div>

                {/* Add Station Form */}
                {showAddStation && (
                  <div style={{ padding: '20px', background: 'var(--primary-50)', borderRadius: '12px', border: '1px solid var(--primary-200)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary-700)', margin: 0 }}>New Kitchen Station</h4>
                      <button onClick={() => setShowAddStation(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: '4px' }}>
                        <X size={18} />
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
                      <div className="input-group">
                        <label className="input-label">Station Name</label>
                        <input type="text" className="input" value={newStation.station_name}
                          onChange={(e) => setNewStation(prev => ({ ...prev, station_name: e.target.value }))}
                          placeholder="e.g. Bar Section" style={{ background: 'white' }}
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Assigned Printer</label>
                        <select className="input select" value={newStation.printer_name}
                          onChange={(e) => setNewStation(prev => ({ ...prev, printer_name: e.target.value }))}
                          style={{ background: 'white' }}
                        >
                          <option value="">-- Select --</option>
                          {printers.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-primary" onClick={handleAddStation}>Save</button>
                        <button className="btn btn-secondary" onClick={() => setShowAddStation(false)}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stations Grid */}
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--gray-800)' }}>
                    Active Stations ({stations.length})
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                    {stations.map(station => {
                      const assignedCats = categoryMap
                        .filter(m => m.station_id === station.id)
                        .map(m => categories.find(c => c.id === m.category_id))
                        .filter(Boolean);
                      return (
                        <div key={station.id} style={{ 
                          padding: '20px', border: '1px solid var(--gray-200)', borderRadius: '12px',
                          background: 'white', transition: 'box-shadow 0.2s'
                        }}
                          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div>
                              <h4 style={{ fontWeight: '700', fontSize: '15px', color: 'var(--gray-900)', margin: 0 }}>{station.station_name}</h4>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gray-500)', fontSize: '12px', marginTop: '4px' }}>
                                <Printer size={12} /> {station.printer_name}
                              </div>
                            </div>
                            <button onClick={() => handleDeleteStation(station.id)}
                              style={{ background: 'var(--danger-50)', border: '1px solid var(--danger-200)', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', color: 'var(--danger-500)', height: 'fit-content' }}
                              title="Delete Station"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          {assignedCats.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
                              {assignedCats.map(cat => (
                                <span key={cat.id} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'var(--primary-50)', color: 'var(--primary-700)', border: '1px solid var(--primary-200)' }}>
                                  {cat.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontSize: '12px', color: 'var(--gray-400)', marginBottom: '14px', fontStyle: 'italic' }}>No categories assigned yet</p>
                          )}
                          <button className="btn btn-secondary" style={{ width: '100%', fontSize: '12px', padding: '8px' }}
                            onClick={() => handleTestPrint(station.printer_name)}
                            disabled={testingPrinter === station.printer_name}
                          >
                            <Printer size={13} style={{ marginRight: '6px' }} />
                            {testingPrinter === station.printer_name ? 'Testing...' : 'Test Connection'}
                          </button>
                        </div>
                      );
                    })}
                    {stations.length === 0 && !showAddStation && (
                      <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px', background: 'var(--gray-50)', borderRadius: '12px', border: '2px dashed var(--gray-200)' }}>
                        <Store size={40} style={{ color: 'var(--gray-300)', marginBottom: '12px' }} />
                        <p style={{ color: 'var(--gray-500)', fontWeight: '500', margin: 0 }}>No kitchen stations configured.</p>
                        <p style={{ color: 'var(--gray-400)', fontSize: '13px', marginTop: '4px' }}>Click "Add Station" to create your first station.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Category Routing Matrix */}
                {stations.length > 0 && categories.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--gray-800)', margin: 0 }}>Category → Station Routing</h4>
                      <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '10px', background: 'var(--primary-50)', color: 'var(--primary-700)', fontWeight: '600' }}>
                        Click checkboxes to assign
                      </span>
                    </div>
                    <div style={{ border: '1px solid var(--gray-200)', borderRadius: '12px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
                            <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: 'var(--gray-700)' }}>Category</th>
                            {stations.map(s => (
                              <th key={s.id} style={{ padding: '14px 12px', textAlign: 'center', fontWeight: '600', color: 'var(--gray-700)', borderLeft: '1px solid var(--gray-200)' }}>
                                <div>{s.station_name}</div>
                                <div style={{ fontSize: '10px', fontWeight: '400', color: 'var(--gray-400)', marginTop: '2px' }}>{s.printer_name}</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {categories.map((cat, idx) => (
                            <tr key={cat.id} style={{ borderBottom: '1px solid var(--gray-100)', background: idx % 2 === 0 ? 'white' : 'var(--gray-50)' }}>
                              <td style={{ padding: '12px 20px', fontWeight: '500', color: 'var(--gray-800)' }}>{cat.name}</td>
                              {stations.map(station => {
                                const isAssigned = categoryMap.some(m => m.category_id === cat.id && m.station_id === station.id);
                                return (
                                  <td key={station.id} style={{ padding: '10px', textAlign: 'center', borderLeft: '1px solid var(--gray-200)' }}>
                                    <div onClick={() => handleToggleCategoryStation(cat.id, station.id)}
                                      style={{ 
                                        width: '26px', height: '26px', borderRadius: '7px',
                                        border: isAssigned ? 'none' : '2px solid var(--gray-300)',
                                        background: isAssigned ? 'var(--primary-500)' : 'white',
                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', margin: '0 auto', transition: 'all 0.15s ease',
                                        boxShadow: isAssigned ? '0 2px 4px rgba(0,150,255,0.3)' : 'none'
                                      }}
                                    >
                                      {isAssigned && <CheckCircle2 size={16} />}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════ TAB: Bill Format ═══════════ */}
            {printerTab === 'format' && (
              <div style={{ display: 'grid', gap: '28px' }}>
                {/* Logo Section */}
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--gray-800)' }}>Restaurant Logo</h4>
                  <div style={{ padding: '20px', background: 'var(--gray-50)', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontSize: '13px', color: 'var(--gray-500)', margin: '0 0 16px' }}>Printed at the top of every bill. Recommended: Black & White PNG.</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          {settings.bill_logo_path ? (
                            <div style={{ padding: '8px', background: 'white', border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                              <img src={settings.bill_logo_path} alt="Logo" style={{ height: '60px', width: 'auto' }} />
                            </div>
                          ) : (
                            <div style={{ height: '60px', width: '60px', background: 'var(--gray-200)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Image size={24} color="var(--gray-400)" />
                            </div>
                          )}
                          <button className="btn btn-secondary" onClick={handleSelectLogo} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Upload size={16} /> {settings.bill_logo_path ? 'Change Logo' : 'Upload Logo'}
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>Show on bill</span>
                        <Toggle checked={settings.bill_show_logo === 'true'} onChange={(v) => updateSetting('bill_show_logo', v ? 'true' : 'false')} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--gray-800)' }}>UPI QR Code</h4>
                  <div style={{ padding: '20px', background: 'var(--gray-50)', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: settings.bill_show_qr === 'true' ? '16px' : '0' }}>
                      <p style={{ fontSize: '13px', color: 'var(--gray-500)', margin: 0 }}>Print a scannable payment QR code at the bottom of the bill.</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>Enable</span>
                        <Toggle checked={settings.bill_show_qr === 'true'} onChange={(v) => updateSetting('bill_show_qr', v ? 'true' : 'false')} />
                      </div>
                    </div>
                    {settings.bill_show_qr === 'true' && (
                      <div className="input-group" style={{ marginTop: '8px' }}>
                        <label className="input-label">UPI ID (VPA)</label>
                        <input type="text" className="input" value={settings.bill_qr_upi_id || ''}
                          onChange={(e) => updateSetting('bill_qr_upi_id', e.target.value)}
                          placeholder="e.g. merchant@okhdfcbank"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Details */}
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--gray-800)' }}>Additional Invoice Details</h4>
                  <div style={{ display: 'grid', gap: '0', border: '1px solid var(--gray-200)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--gray-100)', background: 'white' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--gray-800)' }}>Item-wise Tax Breakdown</div>
                        <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '3px' }}>Show tax details (CGST/SGST) for each item row.</p>
                      </div>
                      <Toggle checked={settings.bill_show_itemwise_tax === 'true'} onChange={(v) => updateSetting('bill_show_itemwise_tax', v ? 'true' : 'false')} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--gray-100)', background: 'white' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--gray-800)' }}>Customer Details</div>
                        <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '3px' }}>Print customer name and phone number on the bill.</p>
                      </div>
                      <Toggle checked={settings.bill_show_customer_details !== 'false'} onChange={(v) => updateSetting('bill_show_customer_details', v ? 'true' : 'false')} />
                    </div>

                    <div style={{ padding: '18px 20px', background: 'white' }}>
                      <div className="input-group">
                        <label className="input-label">FSSAI License Number</label>
                        <input type="text" className="input" value={settings.bill_fssai_number || ''}
                          onChange={(e) => updateSetting('bill_fssai_number', e.target.value)}
                          placeholder="e.g. 12345678901234"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════ TAB: Print Flow ═══════════ */}
            {printerTab === 'flow' && (
              <div style={{ display: 'grid', gap: '28px' }}>
                <div style={{ 
                  padding: '24px', background: 'linear-gradient(135deg, var(--primary-50) 0%, #f0f4ff 100%)', 
                  borderRadius: '12px', border: '1px solid var(--primary-200)' 
                }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: 'var(--gray-900)' }}>How Order Printing Works</h4>
                  <p style={{ fontSize: '13px', color: 'var(--gray-600)', lineHeight: '1.6', margin: 0 }}>
                    When a biller places an order, multiple print jobs are triggered simultaneously. Here's the complete flow:
                  </p>
                </div>

                {/* Flow Steps */}
                <div style={{ display: 'grid', gap: '16px' }}>
                  {/* Step 1 */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ 
                      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                      background: 'var(--primary-500)', color: 'white', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' 
                    }}>1</div>
                    <div style={{ padding: '16px 20px', background: 'var(--gray-50)', borderRadius: '12px', border: '1px solid var(--gray-200)', flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--gray-800)', marginBottom: '4px' }}>
                        📋 Order is Placed
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--gray-500)', margin: 0, lineHeight: '1.5' }}>
                        Biller saves an order from the POS billing page. The system identifies all items and their categories.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ 
                      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                      background: 'var(--success-500)', color: 'white', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' 
                    }}>2</div>
                    <div style={{ padding: '16px 20px', background: 'var(--success-50)', borderRadius: '12px', border: '1px solid var(--success-200)', flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--gray-800)', marginBottom: '4px' }}>
                        🧾 Customer Bill Prints
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--gray-500)', margin: 0, lineHeight: '1.5' }}>
                        The complete bill (with all items, totals, taxes, logo, QR code) is sent to the <strong>Bill Printer</strong> for the customer.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ 
                      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                      background: 'var(--warning-500)', color: 'white', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' 
                    }}>3</div>
                    <div style={{ padding: '16px 20px', background: 'var(--warning-50)', borderRadius: '12px', border: '1px solid var(--warning-200)', flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--gray-800)', marginBottom: '4px' }}>
                        🍳 Station KOTs Print (Simultaneously)
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--gray-500)', margin: 0, lineHeight: '1.5' }}>
                        Items are grouped by their category → station mapping. Each station's printer receives only its assigned items. 
                        For example, "Drinks" category items go to Bar printer, "Tandoor" items go to Tandoor printer.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ 
                      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                      background: 'var(--info-500)', color: 'white', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' 
                    }}>4</div>
                    <div style={{ padding: '16px 20px', background: 'var(--info-50)', borderRadius: '12px', border: '1px solid var(--info-200)', flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--gray-800)', marginBottom: '4px' }}>
                        📎 Mini-Bill Attached (Optional)
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--gray-500)', margin: 0, lineHeight: '1.5' }}>
                        If "Attach Mini-Bill" is enabled, each KOT printout includes a tear-off condensed bill summary below the kitchen items, 
                        showing the complete order total for kitchen reference.
                      </p>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ 
                      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                      background: 'var(--gray-400)', color: 'white', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' 
                    }}>5</div>
                    <div style={{ padding: '16px 20px', background: 'var(--gray-50)', borderRadius: '12px', border: '1px solid var(--gray-200)', flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--gray-800)', marginBottom: '4px' }}>
                        📦 Unmapped Items → Default KOT Printer
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--gray-500)', margin: 0, lineHeight: '1.5' }}>
                        Any items whose category is not assigned to a specific station will be sent to the <strong>Default KOT Printer</strong> as a fallback.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Current Config Summary */}
                <div style={{ padding: '20px', background: 'var(--gray-50)', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--gray-800)' }}>Current Configuration</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div style={{ padding: '12px 16px', background: 'white', borderRadius: '10px', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--gray-400)', fontWeight: '600', letterSpacing: '0.5px' }}>Bill Printer</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: settings.printer_bill ? 'var(--success-600)' : 'var(--danger-500)', marginTop: '4px' }}>
                        {settings.printer_bill || 'Not Configured'}
                      </div>
                    </div>
                    <div style={{ padding: '12px 16px', background: 'white', borderRadius: '10px', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--gray-400)', fontWeight: '600', letterSpacing: '0.5px' }}>KOT Printer</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: settings.printer_kot ? 'var(--success-600)' : 'var(--danger-500)', marginTop: '4px' }}>
                        {settings.printer_kot || 'Not Configured'}
                      </div>
                    </div>
                    <div style={{ padding: '12px 16px', background: 'white', borderRadius: '10px', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--gray-400)', fontWeight: '600', letterSpacing: '0.5px' }}>Kitchen Stations</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--gray-800)', marginTop: '4px' }}>
                        {stations.length} Station{stations.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ padding: '12px 16px', background: 'white', borderRadius: '10px', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--gray-400)', fontWeight: '600', letterSpacing: '0.5px' }}>Auto-Print KOT</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: settings.auto_print_kot === 'true' ? 'var(--success-600)' : 'var(--gray-400)', marginTop: '4px' }}>
                        {settings.auto_print_kot === 'true' ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
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

export default PrintersPage;
