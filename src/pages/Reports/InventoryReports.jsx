import React, { useState, useEffect } from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

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

  return (
    <div className="report-container">
       <div className="report-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
         <div className="tabs" style={{ display: 'flex', gap: '10px' }}>
           <button onClick={() => setActiveTab('stock-level')} style={getTabStyle(activeTab === 'stock-level')}>Stock Levels</button>
           <button onClick={() => setActiveTab('history')} style={getTabStyle(activeTab === 'history')}>Consumption History</button>
         </div>
         <button onClick={exportToExcel} className="btn-secondary" style={{ display: 'flex', gap: '5px', alignItems: 'center', padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            <Download size={16} /> Export
         </button>
       </div>

       {loading ? <div>Loading...</div> : (
         <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
             <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
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
                       <td style={tdStyle}>{item.name}</td>
                       <td style={tdStyle}>{item.supplier || '-'}</td>
                       <td style={{...tdStyle, textAlign: 'center'}}>{item.unit}</td>
                       <td style={{...tdStyle, textAlign: 'right'}}>{item.current_stock}</td>
                       <td style={{...tdStyle, textAlign: 'right'}}>₹{item.stock_value?.toFixed(2)}</td>
                       <td style={tdStyle}>
                         {item.status === 'Low Stock' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontWeight: 600 }}>
                              <AlertTriangle size={14} /> Low Stock
                            </span>
                         ) : (
                            <span style={{ color: '#10b981', fontWeight: 500 }}>In Stock</span>
                         )}
                       </td>
                     </>
                   ) : (
                     <>
                        <td style={tdStyle}>{new Date(item.created_at).toLocaleString()}</td>
                        <td style={tdStyle}>{item.item_name}</td>
                        <td style={{...tdStyle, textTransform: 'capitalize'}}>{item.type}</td>
                        <td style={{...tdStyle, textAlign: 'center'}}>{item.reason || '-'}</td>
                        <td style={{...tdStyle, textAlign: 'right', color: item.type === 'add' ? '#10b981' : '#ef4444'}}>
                          {item.type === 'add' ? '+' : '-'}{item.quantity} {item.unit}
                        </td>
                        <td style={tdStyle}>{item.notes || '-'}</td>
                     </>
                   )}
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       )}
    </div>
  );
};

const thStyle = { padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b' };
const tdStyle = { padding: '12px 16px', color: '#334155' };
const getTabStyle = (active) => ({
  padding: '8px 16px',
  borderRadius: '6px',
  border: 'none',
  background: active ? '#6366f1' : '#e2e8f0',
  color: active ? 'white' : '#475569',
  cursor: 'pointer',
  textTransform: 'capitalize',
  fontWeight: 500
});

export default InventoryReports;
