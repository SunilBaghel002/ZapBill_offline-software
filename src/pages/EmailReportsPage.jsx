import React, { useState, useEffect } from 'react';
import { Mail, Send, CheckCircle2, AlertCircle, RefreshCw, Save, X, Search } from 'lucide-react';
import { useAlertStore } from '../stores/alertStore';
import { useLicenseStore } from '../stores/licenseStore';
import FeatureGate from '../components/common/FeatureGate';
import { RouteFallback } from '../App';

const EmailReportsPage = () => {
  const { showAlert } = useAlertStore();
  const { license } = useLicenseStore();
  
  const [emailConfig, setEmailConfig] = useState({});
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [visibleLogsCount, setVisibleLogsCount] = useState(15);
  
  // Picker states for settings
  const [pickerItems, setPickerItems] = useState([]);
  const [pickerAddons, setPickerAddons] = useState([]);
  const [pickerCategories, setPickerCategories] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [addonSearch, setAddonSearch] = useState('');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const emailResult = await window.electronAPI.invoke('email:getConfig');
      if (emailResult) setEmailConfig(emailResult);
      
      const logsResult = await window.electronAPI.invoke('email:getLogs');
      if (logsResult) setLogs(logsResult);

      try {
        const status = await window.electronAPI.invoke('email:checkInternet');
        setIsOnline(status);
      } catch (e) {
        setIsOnline(false);
      }

      // Pickers
      const items = await window.electronAPI.invoke('email:getMenuItemsForPicker');
      if (Array.isArray(items)) setPickerItems(items);
      const cats = await window.electronAPI.invoke('email:getCategoriesForPicker');
      if (Array.isArray(cats)) setPickerCategories(cats);
      const addons = await window.electronAPI.invoke('email:getAddonsForPicker');
      if (Array.isArray(addons)) setPickerAddons(addons);

    } catch (error) {
      console.error('Failed to load email reports data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh connection status every 30s
    const intv = setInterval(async () => {
      try {
        setIsOnline(await window.electronAPI.invoke('email:checkInternet'));
      } catch (e) {}
    }, 30000);
    return () => clearInterval(intv);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await window.electronAPI.invoke('email:saveConfig', emailConfig);
      showAlert('Email configuration saved successfully!', 'success');
      loadData();
    } catch (error) {
      console.error('Save failed:', error);
      showAlert('Failed to save settings: ' + error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendReportNow = async () => {
    setIsSendingReport(true);
    try {
      const result = await window.electronAPI.invoke('email:sendReportNow');
      if (result.success) {
        showAlert('Daily report sent successfully!', 'success');
        // reload logs
        const logsResult = await window.electronAPI.invoke('email:getLogs');
        if (logsResult) setLogs(logsResult);
      } else {
        showAlert('Failed to send report: ' + result.error, 'error');
      }
    } catch (error) {
      showAlert('Error sending report: ' + error.message, 'error');
    } finally {
      setIsSendingReport(false);
    }
  };

  const updateEmailSetting = (key, value) => {
    setEmailConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateReportSetting = (key, value) => {
    setEmailConfig(prev => ({
      ...prev,
      report_settings: {
        ...(prev.report_settings || {}),
        [key]: value
      }
    }));
  };

  // Toggle Switch
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

  const ModeSelector = ({ value, onChange, label }) => (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
      {[{ v: 'top', l: 'Top Selling' }, { v: 'custom', l: 'Custom Only' }, { v: 'mixed', l: 'Custom + Top' }].map(opt => (
        <button key={opt.v} onClick={() => onChange(opt.v)} style={{
          flex: 1, padding: '10px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
          border: value === opt.v ? '2px solid #0ea5e9' : '1px solid var(--gray-200)',
          background: value === opt.v ? '#e0f2fe' : 'white',
          color: value === opt.v ? '#0369a1' : 'var(--gray-600)',
          transition: 'all 0.2s'
        }}>{opt.l}</button>
      ))}
    </div>
  );

  const rs = emailConfig.report_settings || { items_mode: 'top', items_top_count: 20, items_custom_ids: [], addons_mode: 'top', addons_top_count: 10, addons_custom_names: [], bills_count: 20 };
  const filteredItems = pickerItems.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()) || (i.category_name || '').toLowerCase().includes(itemSearch.toLowerCase()));
  const filteredAddons = pickerAddons.filter(a => a.name.toLowerCase().includes(addonSearch.toLowerCase()));

  // Categorize selected custom items for grouped display
  const selectedIds = new Set(rs.items_custom_ids || []);
  const categorizedItems = {};
  filteredItems.forEach(i => {
    const cat = i.category_name || 'Uncategorized';
    if (!categorizedItems[cat]) categorizedItems[cat] = [];
    categorizedItems[cat].push(i);
  });

  const toggleCategory = (catItems) => {
    const catItemIds = catItems.map(i => i.id);
    const allSelected = catItemIds.every(id => selectedIds.has(id));
    if (allSelected) {
      updateReportSetting('items_custom_ids', (rs.items_custom_ids || []).filter(id => !catItemIds.includes(id)));
    } else {
      const newIds = [...(rs.items_custom_ids || [])];
      catItemIds.forEach(id => { if (!newIds.includes(id)) newIds.push(id); });
      updateReportSetting('items_custom_ids', newIds);
    }
  };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 'calc(100vh - 4rem)', padding: '32px' }}><RefreshCw className="spin" size={32} color="#94a3b8" /></div>;
  }

  return (
    <div style={{ padding: '24px', height: '100%', background: '#f8fafc', overflowY: 'auto' }}>
      <FeatureGate featureKey="email_reports" fallback={<RouteFallback featureName="Automated Email Reports" />}>
        
        {/* Header Section */}
        <div style={{ padding: '20px 24px', background: 'white', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ height: '48px', width: '48px', borderRadius: '12px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={24} style={{ color: '#0ea5e9' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>Email Reports</h1>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Manage your automated reporting and monitor dispatch logs.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleSendReportNow} disabled={isSendingReport || !isOnline} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: isSendingReport || !isOnline ? 'not-allowed' : 'pointer', opacity: isSendingReport || !isOnline ? 0.6 : 1 }}>
              <Send size={18} />
              {isSendingReport ? 'Sending...' : 'Test Send Now'}
            </button>
            <button onClick={handleSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1 }}>
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) minmax(400px, 1fr)', gap: '24px', alignItems: 'start' }}>
          
          {/* Left Column: Email Delivery Configuration */}
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* Active Status Box */}
            <div style={{ padding: '20px', background: 'white', borderRadius: '16px', border: '1px solid var(--gray-200)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--gray-100)' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--gray-800)', margin: '0 0 4px' }}>Automated Routine</h3>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '4px',
                    background: isOnline ? 'var(--success-50)' : 'var(--danger-50)',
                    color: isOnline ? 'var(--success-700)' : 'var(--danger-700)'
                  }}>
                    {isOnline ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {isOnline ? 'System is Online & Ready' : 'System Offline - Emails Queueing'}
                  </div>
                </div>
                <Toggle checked={emailConfig.is_active === 1} onChange={(val) => updateEmailSetting('is_active', val ? 1 : 0)} />
              </div>
              
              <div style={{ display: 'grid', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Daily Send Time (Auto)</label>
                  <input type="time" value={emailConfig.auto_send_time || ''} onChange={(e) => updateEmailSetting('auto_send_time', e.target.value)} className="form-control" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
                
                <div className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Recipient Email (Owner)</label>
                  <input type="email" value={emailConfig.owner_email || ''} onChange={(e) => updateEmailSetting('owner_email', e.target.value)} placeholder="owner@restaurant.com" className="form-control" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Sender Email (Gmail)</label>
                  <input type="email" value={emailConfig.sender_email || ''} onChange={(e) => updateEmailSetting('sender_email', e.target.value)} placeholder="system@gmail.com" className="form-control" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>App Password</label>
                  <input type="password" value={emailConfig.app_password || ''} onChange={(e) => updateEmailSetting('app_password', e.target.value)} placeholder="16-digit Gmail App Password" className="form-control" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              </div>
            </div>

            {/* Email Formatting Rules Box */}
            <div style={{ padding: '20px', background: 'white', borderRadius: '16px', border: '1px solid var(--gray-200)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--gray-800)', margin: 0 }}>Data formatting</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-600)' }}>Hide 0 Qty</span>
                  <Toggle checked={rs.hide_zero_qty} onChange={(val) => updateReportSetting('hide_zero_qty', val)} />
                </div>
              </div>

              {/* Items Section */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--gray-700)', margin: '0 0 12px' }}>Menu Items Export</h4>
                <ModeSelector value={rs.items_mode} label="Include Items" onChange={(v) => updateReportSetting('items_mode', v)} />
                
                {['top', 'mixed'].includes(rs.items_mode) && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--gray-50)', padding: '12px', borderRadius: '8px', border: '1px solid var(--gray-200)', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--gray-700)' }}>Auto Top Items Count</span>
                    <input type="number" value={rs.items_top_count || 20} min={1} max={100} onChange={(e) => updateReportSetting('items_top_count', parseInt(e.target.value))} style={{ width: '70px', padding: '6px', borderRadius: '6px', border: '1px solid var(--gray-300)', textAlign: 'center' }} />
                  </div>
                )}

                {['custom', 'mixed'].includes(rs.items_mode) && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ position: 'relative', marginBottom: '10px' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                      <input type="text" placeholder="Search items or categories..." value={itemSearch} onChange={(e) => setItemSearch(e.target.value)}
                        style={{ width: '100%', padding: '8px 8px 8px 32px', borderRadius: '8px', border: '1px solid var(--gray-300)', fontSize: '12px', boxSizing: 'border-box' }} />
                    </div>

                    {(rs.items_custom_ids || []).length > 0 && (
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--gray-500)', fontWeight: '600' }}>{(rs.items_custom_ids || []).length} items selected</span>
                          <button onClick={() => updateReportSetting('items_custom_ids', [])}
                            style={{ fontSize: '11px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Clear All</button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {(rs.items_custom_ids || []).map(id => {
                            const item = pickerItems.find(i => i.id === id);
                            return item ? (
                              <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', background: '#dbeafe', color: '#1d4ed8', borderRadius: '14px', fontSize: '11px', fontWeight: '500' }}>
                                {item.name}
                                <X size={11} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => updateReportSetting('items_custom_ids', (rs.items_custom_ids || []).filter(i => i !== id))} />
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}

                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: '8px', background: 'white' }}>
                      {Object.entries(categorizedItems).map(([catName, catItems]) => {
                        const allCatSelected = catItems.every(i => selectedIds.has(i.id));
                        const someCatSelected = catItems.some(i => selectedIds.has(i.id));
                        return (
                          <div key={catName}>
                            <div onClick={() => toggleCategory(catItems)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f1f5f9', borderBottom: '1px solid var(--gray-200)', cursor: 'pointer', position: 'sticky', top: 0, zIndex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '16px', height: '16px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: allCatSelected ? '2px solid #2563eb' : someCatSelected ? '2px solid #93c5fd' : '2px solid #cbd5e1', background: allCatSelected ? '#2563eb' : someCatSelected ? '#bfdbfe' : 'white', transition: 'all 0.15s' }}>
                                  {(allCatSelected || someCatSelected) && <CheckCircle2 size={10} style={{ color: allCatSelected ? 'white' : '#2563eb' }} />}
                                </div>
                                <span style={{ fontWeight: '600', fontSize: '12px', color: 'var(--gray-700)' }}>{catName}</span>
                              </div>
                              <span style={{ fontSize: '10px', color: 'var(--gray-400)', fontWeight: '500' }}>{catItems.length} items</span>
                            </div>
                            {catItems.map(item => {
                              const isSelected = selectedIds.has(item.id);
                              return (
                                <div key={item.id} onClick={() => {
                                  if (isSelected) {
                                    updateReportSetting('items_custom_ids', (rs.items_custom_ids || []).filter(i => i !== item.id));
                                  } else {
                                    updateReportSetting('items_custom_ids', [...(rs.items_custom_ids || []), item.id]);
                                  }
                                }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 12px 7px 28px', cursor: 'pointer', borderBottom: '1px solid var(--gray-50)', fontSize: '12px', background: isSelected ? '#eff6ff' : 'white', transition: 'background 0.12s' }}
                                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'white'; }}>
                                  <div style={{ width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0, border: isSelected ? '2px solid #2563eb' : '1.5px solid #cbd5e1', background: isSelected ? '#2563eb' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                    {isSelected && <CheckCircle2 size={9} style={{ color: 'white' }} />}
                                  </div>
                                  <span style={{ fontWeight: '500', color: isSelected ? '#1d4ed8' : 'var(--gray-700)' }}>{item.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                      {Object.keys(categorizedItems).length === 0 && (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '12px' }}>No items found in active menu</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

               {/* Add-ons Sales Section */}
               <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--gray-700)', margin: '0 0 12px' }}>Add-ons Sales Report</h4>
                  <ModeSelector value={rs.addons_mode || 'top'} onChange={(v) => updateReportSetting('addons_mode', v)} />

                  {['top', 'mixed'].includes(rs.addons_mode) && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--gray-50)', padding: '12px', borderRadius: '8px', border: '1px solid var(--gray-200)', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--gray-700)' }}>Auto Top Add-ons Count</span>
                      <input type="number" value={rs.addons_top_count || 10} min={1} max={100} onChange={(e) => updateReportSetting('addons_top_count', parseInt(e.target.value))} style={{ width: '70px', padding: '6px', borderRadius: '6px', border: '1px solid var(--gray-300)', textAlign: 'center' }} />
                    </div>
                  )}

                  {['custom', 'mixed'].includes(rs.addons_mode) && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ position: 'relative', marginBottom: '8px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                        <input type="text" placeholder="Search add-ons..." value={addonSearch} onChange={(e) => setAddonSearch(e.target.value)}
                          style={{ width: '100%', padding: '8px 8px 8px 32px', borderRadius: '8px', border: '1px solid var(--gray-300)', fontSize: '12px', boxSizing: 'border-box' }} />
                      </div>

                      {(rs.addons_custom_names || []).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                          {(rs.addons_custom_names || []).map(name => (
                            <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#fce7f3', color: '#be185d', borderRadius: '16px', fontSize: '11px', fontWeight: '500' }}>
                              {name}
                              <X size={12} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => updateReportSetting('addons_custom_names', (rs.addons_custom_names || []).filter(n => n !== name))} />
                            </span>
                          ))}
                        </div>
                      )}

                      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: '8px', background: 'white' }}>
                        {filteredAddons.filter(a => !(rs.addons_custom_names || []).includes(a.name)).slice(0, 50).map(addon => (
                          <div key={addon.id} onClick={() => updateReportSetting('addons_custom_names', [...(rs.addons_custom_names || []), addon.name])} 
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--gray-100)', fontSize: '12px', transition: 'background 0.15s' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#fdf2f8'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          >
                            <span style={{ fontWeight: '500', color: 'var(--gray-800)' }}>{addon.name}</span>
                            <span style={{ color: 'var(--gray-400)', fontSize: '11px' }}>₹{addon.price}</span>
                          </div>
                        ))}
                        {filteredAddons.filter(a => !(rs.addons_custom_names || []).includes(a.name)).length === 0 && (
                          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '12px' }}>No add-ons found</div>
                        )}
                      </div>
                    </div>
                  )}
               </div>

               {/* Recent Bills config */}
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--gray-50)', padding: '12px', borderRadius: '8px', border: '1px solid var(--gray-200)', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--gray-700)' }}>Recent Bills Attachment Count</span>
                  <input type="number" value={rs.bills_count || 20} min={0} max={100} onChange={(e) => updateReportSetting('bills_count', parseInt(e.target.value))} style={{ width: '70px', padding: '6px', borderRadius: '6px', border: '1px solid var(--gray-300)', textAlign: 'center' }} />
               </div>

            </div>
          </div>

          {/* Right Column: Transmission Log */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--gray-200)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--gray-100)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--gray-800)', margin: '0' }}>Transmission Logs</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>History of dispatched reports</p>
            </div>
            
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '12px', borderBottom: '1px solid #f1f5f9' }}>Dispatched At</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '12px', borderBottom: '1px solid #f1f5f9' }}>Subject</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: '12px', borderBottom: '1px solid #f1f5f9' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length > 0 ? logs.slice(0, visibleLogsCount).map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 20px', color: '#334155', fontSize: '13px' }}>
                        {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '12px 20px', color: '#334155', fontSize: '13px', fontWeight: 500 }}>
                        {log.subject.replace('ZapBill ', '')}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        <span style={{ 
                          padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                          background: log.status === 'sent' ? '#f0fdf4' : (log.status === 'failed' ? '#fef2f2' : '#f8fafc'), 
                          color: log.status === 'sent' ? '#10b981' : (log.status === 'failed' ? '#ef4444' : '#64748b') 
                        }}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="3" style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                        No email records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {logs.length > visibleLogsCount && (
                <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid #f1f5f9' }}>
                  <button onClick={() => setVisibleLogsCount(prev => prev + 15)} style={{ padding: '8px 16px', background: '#f8fafc', color: '#3b82f6', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', transition: 'all 0.2s', width: '100%', maxWidth: '200px' }}>
                    Load More Logs ({logs.length - visibleLogsCount} remaining)
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </FeatureGate>
    </div>
  );
};

export default EmailReportsPage;
