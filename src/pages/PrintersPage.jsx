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
  Upload 
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

  return (
    <div style={{ padding: 'var(--spacing-6)', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--spacing-6)' }}>
        <h1>Printer Management</h1>
        <p className="text-muted">Configure receipts, kitchen stations, and print formats</p>
      </div>

      <div className="card">
        <div className="card-header">
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid var(--gray-200)', paddingBottom: '0' }}>
              {[
                { id: 'bill', label: 'Bill Printer', icon: <Receipt size={14} /> },
                { id: 'kot', label: 'KOT Printer', icon: <ChefHat size={14} /> },
                { id: 'stations', label: 'Kitchen Stations', icon: <Store size={14} /> },
                { id: 'format', label: 'Bill Format', icon: <Image size={14} /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setPrinterTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '10px 16px', border: 'none', cursor: 'pointer',
                    background: printerTab === tab.id ? 'var(--primary-600)' : 'transparent',
                    color: printerTab === tab.id ? '#fff' : 'var(--gray-600)',
                    borderRadius: '8px 8px 0 0',
                    fontWeight: printerTab === tab.id ? '600' : '400',
                    fontSize: '13px', transition: 'all 0.2s', marginBottom: '-2px'
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
        </div>

        <div className="card-body">
            {/* TAB: Bill Printer */}
            {printerTab === 'bill' && (
              <div style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-3)' }}>
                    <div className="input-group">
                      <label className="input-label">Paper Width</label>
                      <select
                        className="input select"
                        value={settings.bill_paper_width || '80'}
                        onChange={(e) => updateSetting('bill_paper_width', e.target.value)}
                      >
                        <option value="80">80mm (Standard)</option>
                        <option value="58">58mm (Compact)</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleTestPrint(settings.printer_bill)}
                        disabled={!settings.printer_bill}
                        style={{ width: '100%' }}
                      >
                        🖨️ Test Bill Print
                      </button>
                    </div>
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
                  />
                </div>
              </div>
            )}

            {/* TAB: KOT Printer */}
            {printerTab === 'kot' && (
              <div style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
              <div style={{ padding: 'var(--spacing-4)', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ marginBottom: 'var(--spacing-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ChefHat size={16} /> Default KOT Printer
                </h4>
                <div className="alert alert-info" style={{ marginBottom: 'var(--spacing-3)', fontSize: '13px' }}>
                  <p>This is the <strong>default</strong> KOT printer. If you set up Kitchen Stations below, KOTs will route to station-specific printers instead.</p>
                </div>
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
                    🖨️ Test KOT Print
                  </button>
                </div>
              </div>

              <div className="input-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', background: 'var(--gray-50)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <input
                        type="checkbox"
                        checked={settings.auto_print_kot === 'true'}
                        onChange={(e) => updateSetting('auto_print_kot', e.target.checked ? 'true' : 'false')}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--primary-600)' }}
                      />
                      <span>Auto-Print KOT when saving an order</span>
                    </label>
                </div>
              </div>
            )}

            {/* TAB: Kitchen Stations */}
            {printerTab === 'stations' && (
              <div style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
                <div className="alert alert-info" style={{ fontSize: '13px' }}>
                  <p><strong>Station-wise KOT Routing:</strong> Assign categories to kitchen stations so KOTs automatically print to the correct printer. For example, "Indian Kitchen" →  Tandoor Printer, "Bar" → Bar Printer.</p>
                </div>

                {/* Existing Stations */}
                {stations.length > 0 && (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {stations.map(station => (
                      <div key={station.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--gray-200)'
                      }}>
                        <div>
                          <strong style={{ fontSize: '14px' }}>{station.station_name}</strong>
                          <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>🖨️ {station.printer_name}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleTestPrint(station.printer_name)}
                            title="Test Print"
                          >
                            🖨️
                          </button>
                          <button
                            className="btn btn-sm"
                            onClick={() => handleDeleteStation(station.id)}
                            style={{ color: 'var(--danger-600)', background: 'var(--danger-50)', border: '1px solid var(--danger-200)' }}
                            title="Delete Station"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Station */}
                {showAddStation ? (
                  <div style={{ padding: 'var(--spacing-4)', background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-200)' }}>
                    <h4 style={{ marginBottom: 'var(--spacing-3)', fontSize: '14px' }}>Add New Station</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
                      <div className="input-group">
                        <label className="input-label">Station Name</label>
                        <input
                          type="text"
                          className="input"
                          value={newStation.station_name}
                          onChange={(e) => setNewStation(prev => ({ ...prev, station_name: e.target.value }))}
                          placeholder="e.g. Indian Kitchen, Bar"
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Printer</label>
                        <select
                          className="input select"
                          value={newStation.printer_name}
                          onChange={(e) => setNewStation(prev => ({ ...prev, printer_name: e.target.value }))}
                        >
                          <option value="">-- Select --</option>
                          {printers.map(p => (
                            <option key={p.name} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--spacing-3)' }}>
                      <button className="btn btn-sm btn-primary" onClick={handleAddStation}>
                        <Plus size={14} /> Add Station
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => setShowAddStation(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-sm btn-secondary" onClick={() => setShowAddStation(true)} style={{ justifySelf: 'start' }}>
                    <Plus size={14} /> Add Kitchen Station
                  </button>
                )}

                {/* Category → Station Matrix */}
                {stations.length > 0 && categories.length > 0 && (
                  <div style={{ marginTop: 'var(--spacing-2)' }}>
                    <h4 style={{ marginBottom: 'var(--spacing-3)', fontSize: '14px' }}>Category → Station Assignment</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ background: 'var(--gray-100)' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--gray-300)' }}>Category</th>
                            {stations.map(s => (
                              <th key={s.id} style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '2px solid var(--gray-300)', minWidth: '100px' }}>
                                {s.station_name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {categories.map(cat => (
                            <tr key={cat.id} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                              <td style={{ padding: '10px 12px', fontWeight: '500' }}>{cat.name}</td>
                              {stations.map(station => {
                                const isAssigned = categoryMap.some(m => m.category_id === cat.id && m.station_id === station.id);
                                return (
                                  <td key={station.id} style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    <input
                                      type="checkbox"
                                      checked={isAssigned}
                                      onChange={() => handleToggleCategoryStation(cat.id, station.id)}
                                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary-600)' }}
                                    />
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
              <div style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
                {/* Logo */}
                <div style={{ padding: 'var(--spacing-4)', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-3)' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <Image size={16} /> Restaurant Logo on Bill
                    </h4>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={settings.bill_show_logo === 'true'}
                        onChange={(e) => updateSetting('bill_show_logo', e.target.checked ? 'true' : 'false')}
                         style={{ width: '18px', height: '18px', accentColor: 'var(--primary-600)' }}
                      />
                      Enable
                    </label>
                  </div>
                  {settings.bill_show_logo === 'true' && (
                    <div style={{ display: 'flex', gap: 'var(--spacing-3)', alignItems: 'center' }}>
                      {settings.bill_logo_path && (
                        <img
                          src={settings.bill_logo_path}
                          alt="Logo preview"
                          style={{ maxWidth: '120px', maxHeight: '60px', objectFit: 'contain', border: '1px solid var(--gray-300)', borderRadius: '6px', padding: '4px' }}
                        />
                      )}
                      <button className="btn btn-sm btn-secondary" onClick={handleSelectLogo}>
                        <Upload size={14} /> {settings.bill_logo_path ? 'Change Logo' : 'Upload Logo'}
                      </button>
                    </div>
                  )}
                </div>

                {/* QR Code */}
                <div style={{ padding: 'var(--spacing-4)', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-3)' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <QrCode size={16} /> UPI Payment QR on Bill
                    </h4>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={settings.bill_show_qr === 'true'}
                        onChange={(e) => updateSetting('bill_show_qr', e.target.checked ? 'true' : 'false')}
                         style={{ width: '18px', height: '18px', accentColor: 'var(--primary-600)' }}
                      />
                      Enable
                    </label>
                  </div>
                  {settings.bill_show_qr === 'true' && (
                    <div className="input-group">
                      <label className="input-label">UPI ID</label>
                      <input
                        type="text"
                        className="input"
                        value={settings.bill_qr_upi_id || ''}
                        onChange={(e) => updateSetting('bill_qr_upi_id', e.target.value)}
                        placeholder="e.g. yourbusiness@upi"
                      />
                    </div>
                  )}
                </div>

                {/* Toggles grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-3)' }}>
                  <div style={{ padding: 'var(--spacing-3)', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={settings.bill_show_itemwise_tax === 'true'}
                        onChange={(e) => updateSetting('bill_show_itemwise_tax', e.target.checked ? 'true' : 'false')}
                         style={{ width: '18px', height: '18px', accentColor: 'var(--primary-600)' }}
                      />
                      Show Item-wise Tax Breakdown
                    </label>
                  </div>
                  <div style={{ padding: 'var(--spacing-3)', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={settings.bill_show_customer_details !== 'false'}
                        onChange={(e) => updateSetting('bill_show_customer_details', e.target.checked ? 'true' : 'false')}
                         style={{ width: '18px', height: '18px', accentColor: 'var(--primary-600)' }}
                      />
                      Show Customer Details on Bill
                    </label>
                  </div>
                </div>

                {/* FSSAI */}
                <div className="input-group">
                  <label className="input-label">FSSAI License Number</label>
                  <input
                    type="text"
                    className="input"
                    value={settings.bill_fssai_number || ''}
                    onChange={(e) => updateSetting('bill_fssai_number', e.target.value)}
                    placeholder="e.g. 12345678901234"
                  />
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default PrintersPage;
