import React, { useState, useEffect } from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

const thStyle = { padding: '14px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '15px' };
const tdStyle = { padding: '14px 20px', color: '#334155', fontSize: '15px' };

const InventoryReports = () => {
  const [activeTab, setActiveTab] = useState('stock-level');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let result = [];
      if (activeTab === 'stock-level') {
        result = await window.electronAPI.invoke('reports:stockLevel');
      } else if (activeTab === 'history') {
        const today = new Date().toISOString().split('T')[0];
        result = await window.electronAPI.invoke('reports:inventoryHistory', { startDate: '2024-01-01', endDate: today });
      }
      setData(result || []);
    } catch (error) {
      console.error("Error fetching inventory data:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `Inventory_${activeTab}.xlsx`);
  };

  const getTabStyle = (active) => ({
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: active ? '#6366f1' : 'white',
    color: active ? 'white' : '#64748b',
    cursor: 'pointer',
    textTransform: 'capitalize',
    fontWeight: 600,
    fontSize: '15px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    transition: 'all 0.2s'
  });

  return (
    <div className="report-container">
       <div className="report-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
         <div className="tabs" style={{ display: 'flex', gap: '10px' }}>
           <button onClick={() => setActiveTab('stock-level')} style={getTabStyle(activeTab === 'stock-level')}>Stock Levels</button>
           <button onClick={() => setActiveTab('history')} style={getTabStyle(activeTab === 'history')}>Consumption History</button>
         </div>
         <button onClick={exportToExcel} className="btn-secondary" style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '15px' }}>
            <Download size={18} /> Export
         </button>
       </div>

       {loading ? (
         <div style={{ padding: '80px', textAlign: 'center', color: '#64748b' }}>
           <div className="spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #6366f1', borderRadius: '50%', width: '32px', height: '32px', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
           <span style={{ fontSize: '16px', fontWeight: 500 }}>Loading inventory data...</span>
         </div>
       ) : (
         <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse' }}>
             <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
               <tr>
                 {activeTab === 'stock-level' ? (
                   <>
                     <th style={thStyle}>Item Name</th>
                     <th style={thStyle}>Supplier</th>
                     <th style={{...thStyle, textAlign: 'center'}}>Unit</th>
                     <th style={{...thStyle, textAlign: 'right'}}>Stock</th>
                     <th style={{...thStyle, textAlign: 'right'}}>Value</th>
                     <th style={thStyle}>Status</th>
                   </>
                 ) : (
                   <>
                     <th style={thStyle}>Date</th>
                     <th style={thStyle}>Item</th>
                     <th style={thStyle}>Type</th>
                     <th style={{...thStyle, textAlign: 'center'}}>Reason</th>
                     <th style={{...thStyle, textAlign: 'right'}}>Quantity Change</th>
                     <th style={thStyle}>Notes</th>
                   </>
                 )}
               </tr>
             </thead>
             <tbody>
               {data.map((item, idx) => (
                 <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                   {activeTab === 'stock-level' ? (
                     <>
                       <td style={{...tdStyle, fontWeight: 600}}>{item.name}</td>
                       <td style={tdStyle}>{item.supplier || '-'}</td>
                       <td style={{...tdStyle, textAlign: 'center'}}>{item.unit}</td>
                       <td style={{...tdStyle, textAlign: 'right', fontWeight: 700}}>{item.current_stock}</td>
                       <td style={{...tdStyle, textAlign: 'right', color: '#10b981', fontWeight: 700}}>₹{item.stock_value?.toFixed(2)}</td>
                       <td style={tdStyle}>
                         {item.status === 'Low Stock' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontWeight: 700, background: '#fef2f2', padding: '4px 10px', borderRadius: '20px', fontSize: '13px' }}>
                              <AlertTriangle size={14} /> Low Stock
                            </span>
                         ) : (
                            <span style={{ color: '#10b981', fontWeight: 600, background: '#f0fdf4', padding: '4px 10px', borderRadius: '20px', fontSize: '13px' }}>In Stock</span>
                         )}
                       </td>
                     </>
                   ) : (
                     <>
                        <td style={tdStyle}>{new Date(item.created_at).toLocaleString()}</td>
                        <td style={{...tdStyle, fontWeight: 600}}>{item.item_name}</td>
                        <td style={{...tdStyle, textTransform: 'capitalize', fontWeight: 500}}>{item.type}</td>
                        <td style={{...tdStyle, textAlign: 'center'}}>{item.reason || '-'}</td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 700, color: item.type === 'add' ? '#10b981' : '#ef4444'}}>
                          {item.type === 'add' ? '+' : '-'}{item.quantity} {item.unit}
                        </td>
                        <td style={tdStyle}>{item.notes || '-'}</td>
                     </>
                   )}
                 </tr>
               ))}
               {data.length === 0 && (
                 <tr>
                   <td colSpan="10" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '16px' }}>No inventory data found.</td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
       )}
    </div>
  );
};

export default InventoryReports;
