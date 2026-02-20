import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Store, 
  Receipt, 
  ChefHat, 
  Image, 
  QrCode, 
  Plus, 
  Trash2, 
  Upload,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const PrintersPage = () => {
  const [settings, setSettings] = useState({});
  const [printers, setPrinters] = useState([]);
  const [stations, setStations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryMap, setCategoryMap] = useState([]);
  
  const [printerTab, setPrinterTab] = useState('bill'); // bill | kot | stations | format
  const [newStation, setNewStation] = useState({ station_name: '', printer_name: '' });
  const [showAddStation, setShowAddStation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
    try {
      const result = await window.electronAPI.invoke('print:testPrint', { printerName });
      if (result.success) alert('Test print sent successfully!');
      else alert('Print failed: ' + (result.error || 'Unknown error'));
    } catch (error) {
      alert('Print failed: ' + error.message);
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

  if (isLoading) {
    return (
      <div className="empty-state">
        <div className="loading-spinner" />
        <p className="mt-4">Loading printers...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'bill', label: 'Bill Printer', icon: <Receipt size={18} />, desc: 'Configure customer receipt printer' },
    { id: 'kot', label: 'Default KOT', icon: <ChefHat size={18} />, desc: 'Set up default kitchen printer' },
    { id: 'stations', label: 'Kitchen Stations', icon: <Store size={18} />, desc: 'Manage stations and routing' },
    { id: 'format', label: 'Bill Format', icon: <Image size={18} />, desc: 'Customize receipts design' }
  ];

  return (
    <div style={{ padding: 'var(--spacing-6)', maxWidth: '1400px', margin: '0 auto', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 'var(--spacing-6)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--gray-900)' }}>Printer Management</h1>
        <p className="text-muted">Configure receipts, kitchen stations, and print formats</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--spacing-6)', flex: 1, minHeight: 0 }}>
        {/* Sidebar Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tabs.map(tab => {
            const isActive = printerTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPrinterTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: isActive ? 'white' : 'transparent',
                  color: isActive ? 'var(--primary-600)' : 'var(--gray-600)',
                  boxShadow: isActive ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none',
                  transition: 'all 0.2s ease',
                  borderLeft: isActive ? '4px solid var(--primary-600)' : '4px solid transparent'
                }}
              >
                <div style={{ 
                  padding: '8px', 
                  borderRadius: '8px', 
                  background: isActive ? 'var(--primary-50)' : 'var(--gray-100)',
                  color: isActive ? 'var(--primary-600)' : 'var(--gray-500)'
                }}>
                  {tab.icon}
                </div>
                <div>
                  <div style={{ fontWeight: isActive ? '600' : '500', fontSize: '15px' }}>{tab.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '2px' }}>{tab.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="card" style={{ height: '100%', overflowY: 'auto', padding: '0' }}>
          <div className="card-header" style={{ borderBottom: '1px solid var(--gray-200)', padding: '20px 24px' }}>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {tabs.find(t => t.id === printerTab)?.icon}
              {tabs.find(t => t.id === printerTab)?.label} Settings
            </h3>
          </div>
          
          <div className="card-body" style={{ padding: '24px' }}>
            {/* TAB: Bill Printer */}
            {printerTab === 'bill' && (
              <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
                <div className="alert alert-info" style={{ display: 'flex', gap: '12px' }}>
                  <Printer size={20} className="flex-shrink-0" />
                  <div>
                    <strong>Primary Bill Printer</strong>
                    <p style={{ marginTop: '4px', opacity: 0.9 }}>This printer will be used for printing customer receipts and invoices.</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-5)' }}>
                  <div className="input-group">
                    <label className="input-label">Select Printer</label>
                    <select
                      className="input select"
                      value={settings.printer_bill || ''}
                      onChange={(e) => updateSetting('printer_bill', e.target.value)}
                      style={{ padding: '12px' }}
                    >
                      <option value="">-- Select Printer --</option>
                      {printers.map(p => (
                        <option key={p.name} value={p.name}>
                          {p.name} {p.isDefault ? '(Default)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Paper Width</label>
                    <select
                      className="input select"
                      value={settings.bill_paper_width || '80'}
                      onChange={(e) => updateSetting('bill_paper_width', e.target.value)}
                      style={{ padding: '12px' }}
                    >
                      <option value="80">80mm (Standard)</option>
                      <option value="58">58mm (Compact)</option>
                    </select>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Receipt Footer Message</label>
                  <input
                    type="text"
                    className="input"
                    value={settings.receipt_footer || ''}
                    onChange={(e) => updateSetting('receipt_footer', e.target.value)}
                    placeholder="Thank you for dining with us!"
                    style={{ padding: '12px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => handleTestPrint(settings.printer_bill)}
                    disabled={!settings.printer_bill}
                    style={{ height: '45px', padding: '0 24px' }}
                  >
                    🖨️ Test Print
                  </button>
                </div>
              </div>
            )}

            {/* TAB: KOT Printer */}
            {printerTab === 'kot' && (
              <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
                <div className="alert alert-warning" style={{ display: 'flex', gap: '12px' }}>
                  <AlertCircle size={20} className="flex-shrink-0" />
                  <div>
                    <strong>Default / Fallback Printer</strong>
                    <p style={{ marginTop: '4px', opacity: 0.9 }}>This printer prints KOTs for items that don't belong to any specific kitchen station.</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-5)' }}>
                  <div className="input-group">
                    <label className="input-label">Select KOT Printer</label>
                    <select
                      className="input select"
                      value={settings.printer_kot || ''}
                      onChange={(e) => updateSetting('printer_kot', e.target.value)}
                      style={{ padding: '12px' }}
                    >
                      <option value="">-- Select Printer --</option>
                      {printers.map(p => (
                        <option key={p.name} value={p.name}>
                          {p.name} {p.isDefault ? '(Default)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => handleTestPrint(settings.printer_kot)}
                      disabled={!settings.printer_kot}
                      style={{ height: '45px', padding: '0 24px' }}
                    >
                      🖨️ Test Print
                    </button>
                  </div>
                </div>

                <div style={{ padding: '20px', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '15px' }}>Auto-Print KOT</strong>
                      <p style={{ color: 'var(--gray-500)', fontSize: '13px', marginTop: '4px' }}>Automatically send KOT to kitchen when saving a new order</p>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={settings.auto_print_kot === 'true'}
                        onChange={(e) => updateSetting('auto_print_kot', e.target.checked ? 'true' : 'false')}
                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary-600)' }}
                      />
                    </label>
                  </div>
                </div>

                <div style={{ padding: '20px', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '15px' }}>Attach Mini-Bill with KOT</strong>
                      <p style={{ color: 'var(--gray-500)', fontSize: '13px', marginTop: '4px' }}>Print a condensed bill summary below each KOT (tear-off copy for kitchen reference)</p>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={settings.kot_attach_bill !== 'false'}
                        onChange={(e) => updateSetting('kot_attach_bill', e.target.checked ? 'true' : 'false')}
                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary-600)' }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Kitchen Stations */}
            {printerTab === 'stations' && (
              <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p className="text-muted">Route category items to specific printers (e.g. Bar, Tandoor)</p>
                  <button className="btn btn-primary" onClick={() => setShowAddStation(true)}>
                    <Plus size={16} /> Add Station
                  </button>
                </div>

                {/* Add Station Form */}
                {showAddStation && (
                  <div style={{ padding: '20px', background: 'var(--primary-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--primary-200)', marginBottom: '10px' }}>
                    <h4 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: 'bold', color: 'var(--primary-700)' }}>New Kitchen Station</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
                      <div className="input-group">
                        <label className="input-label">Station Name</label>
                        <input
                          type="text"
                          className="input"
                          value={newStation.station_name}
                          onChange={(e) => setNewStation(prev => ({ ...prev, station_name: e.target.value }))}
                          placeholder="e.g. Bar Section"
                          style={{ background: 'white' }}
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Assigned Printer</label>
                        <select
                          className="input select"
                          value={newStation.printer_name}
                          onChange={(e) => setNewStation(prev => ({ ...prev, printer_name: e.target.value }))}
                          style={{ background: 'white' }}
                        >
                          <option value="">-- Select --</option>
                          {printers.map(p => (
                            <option key={p.name} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-primary" onClick={handleAddStation}>Save</button>
                        <button className="btn btn-secondary" onClick={() => setShowAddStation(false)}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing Stations List */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {stations.map(station => (
                    <div key={station.id} className="card" style={{ padding: '16px', border: '1px solid var(--gray-200)', boxShadow: 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div>
                          <h4 style={{ fontWeight: 'bold', fontSize: '16px' }}>{station.station_name}</h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gray-600)', fontSize: '13px', marginTop: '4px' }}>
                            <Printer size={12} /> {station.printer_name}
                          </div>
                        </div>
                        <button
                          className="icon-btn"
                          onClick={() => handleDeleteStation(station.id)}
                          style={{ color: 'var(--danger-500)', background: 'var(--danger-50)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <button 
                        className="btn btn-sm btn-secondary" 
                        style={{ width: '100%' }}
                        onClick={() => handleTestPrint(station.printer_name)}
                      >
                        Test Connection
                      </button>
                    </div>
                  ))}
                  
                  {stations.length === 0 && !showAddStation && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--gray-200)' }}>
                      <Store size={32} style={{ color: 'var(--gray-300)', marginBottom: '12px' }} />
                      <p style={{ color: 'var(--gray-500)' }}>No kitchen stations configured yet.</p>
                    </div>
                  )}
                </div>

                {/* Matrix */}
                {stations.length > 0 && categories.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>Category Routing Map</h4>
                    <div style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                            <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: '600', color: 'var(--gray-700)' }}>Category Name</th>
                            {stations.map(s => (
                              <th key={s.id} style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: 'var(--gray-700)', borderLeft: '1px solid var(--gray-200)' }}>
                                {s.station_name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {categories.map((cat, idx) => (
                            <tr key={cat.id} style={{ borderBottom: '1px solid var(--gray-100)', background: idx % 2 === 0 ? 'white' : 'var(--gray-50)' }}>
                              <td style={{ padding: '12px 20px', fontWeight: '500' }}>{cat.name}</td>
                              {stations.map(station => {
                                const isAssigned = categoryMap.some(m => m.category_id === cat.id && m.station_id === station.id);
                                return (
                                  <td key={station.id} style={{ padding: '12px', textAlign: 'center', borderLeft: '1px solid var(--gray-200)' }}>
                                    <div 
                                      onClick={() => handleToggleCategoryStation(cat.id, station.id)}
                                      style={{ 
                                        width: '24px', 
                                        height: '24px', 
                                        borderRadius: '6px', 
                                        border: isAssigned ? 'none' : '2px solid var(--gray-300)',
                                        background: isAssigned ? 'var(--primary-600)' : 'white',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        margin: '0 auto',
                                        transition: 'all 0.1s'
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

            {/* TAB: Bill Format */}
            {printerTab === 'format' && (
              <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
                {/* Logo Section */}
                <div style={{ padding: '24px', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Restaurant Logo</h4>
                      <p className="text-muted" style={{ fontSize: '13px' }}>Printed at the top of every bill. Recommended: Black & White PNG.</p>
                      
                      <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {settings.bill_logo_path ? (
                          <div style={{ padding: '8px', background: 'white', border: '1px solid var(--gray-200)', borderRadius: '8px' }}>
                            <img src={settings.bill_logo_path} alt="Logo" style={{ height: '60px', width: 'auto' }} />
                          </div>
                        ) : (
                          <div style={{ height: '60px', width: '60px', background: 'var(--gray-200)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Image size={24} color="var(--gray-400)" />
                          </div>
                        )}
                        <button className="btn btn-secondary" onClick={handleSelectLogo}>
                          <Upload size={16} /> {settings.bill_logo_path ? 'Change Logo' : 'Upload Logo'}
                        </button>
                      </div>
                    </div>
                    
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={settings.bill_show_logo === 'true'}
                        onChange={(e) => updateSetting('bill_show_logo', e.target.checked ? 'true' : 'false')}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>

                {/* QR Code Section */}
                <div style={{ padding: '24px', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 'bold' }}>UPI QR Code</h4>
                      <p className="text-muted" style={{ fontSize: '13px' }}>Print a scannable payment QR code at the bottom of the bill.</p>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={settings.bill_show_qr === 'true'}
                        onChange={(e) => updateSetting('bill_show_qr', e.target.checked ? 'true' : 'false')}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  
                  {settings.bill_show_qr === 'true' && (
                    <div className="input-group">
                      <label className="input-label">UPI ID (VPA)</label>
                      <input
                        type="text"
                        className="input"
                        value={settings.bill_qr_upi_id || ''}
                        onChange={(e) => updateSetting('bill_qr_upi_id', e.target.value)}
                        placeholder="e.g. merchant@okhdfcbank"
                        style={{ padding: '12px' }}
                      />
                    </div>
                  )}
                </div>

                {/* Other Options */}
                <div style={{ padding: '24px', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '20px' }}>Additional Invoice Details</h4>
                  
                  <div style={{ display: 'grid', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--gray-100)' }}>
                      <div>
                        <strong>Item-wise Tax Breakdown</strong>
                        <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Show tax details (CGST/SGST) for each item row.</p>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={settings.bill_show_itemwise_tax === 'true'}
                          onChange={(e) => updateSetting('bill_show_itemwise_tax', e.target.checked ? 'true' : 'false')}
                        />
                         <span className="slider round"></span>
                      </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--gray-100)' }}>
                      <div>
                        <strong>Customer Details</strong>
                        <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Print customer name and phone number on the bill.</p>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={settings.bill_show_customer_details !== 'false'}
                          onChange={(e) => updateSetting('bill_show_customer_details', e.target.checked ? 'true' : 'false')}
                        />
                         <span className="slider round"></span>
                      </label>
                    </div>

                    <div className="input-group">
                      <label className="input-label">FSSAI License Number</label>
                      <input
                        type="text"
                        className="input"
                        value={settings.bill_fssai_number || ''}
                        onChange={(e) => updateSetting('bill_fssai_number', e.target.value)}
                        placeholder="e.g. 12345678901234"
                        style={{ padding: '12px' }}
                      />
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
