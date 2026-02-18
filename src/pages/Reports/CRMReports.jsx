import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const thStyle = { padding: '14px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '15px' };
const tdStyle = { padding: '14px 20px', color: '#334155', fontSize: '15px' };

const CRMReports = () => {
  const [activeTab, setActiveTab] = useState('frequency');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchData();
  }, [activeTab, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let result = [];
      if (activeTab === 'frequency') {
        result = await window.electronAPI.invoke('reports:customerVisitFrequency', { startDate, endDate });
      }
      setData(result || []);
    } catch (error) {
      console.error("Error fetching CRM data:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "CRM");
      XLSX.writeFile(wb, `CRM_Report.xlsx`);
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
                <button onClick={() => setActiveTab('frequency')} style={getTabStyle(activeTab === 'frequency')}>Visit Frequency</button>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none' }} 
                />
                <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none' }} 
                />
                <button onClick={exportToExcel} className="btn-secondary" style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '15px' }}>
                    <Download size={18} /> Export
                </button>
            </div>
        </div>

        {loading ? (
            <div style={{ padding: '80px', textAlign: 'center', color: '#64748b' }}>
                <div className="spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #6366f1', borderRadius: '50%', width: '32px', height: '32px', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
                <span style={{ fontSize: '16px', fontWeight: 500 }}>Loading CRM data...</span>
            </div>
        ) : (
             <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                 <tr>
                    <th style={thStyle}>Customer Name</th>
                    <th style={thStyle}>Phone</th>
                    <th style={{...thStyle, textAlign: 'center'}}>Visits</th>
                    <th style={{...thStyle, textAlign: 'right'}}>Total Spent</th>
                    <th style={thStyle}>Last Visit</th>
                    <th style={thStyle}>Avg. Ticket Size</th>
                 </tr>
               </thead>
               <tbody>
                 {data.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{...tdStyle, fontWeight: 700, color: '#6366f1'}}>{item.customer_name || 'Unknown'}</td>
                        <td style={{...tdStyle, fontWeight: 500}}>{item.customer_phone}</td>
                        <td style={{...tdStyle, textAlign: 'center', fontWeight: 600}}>{item.visit_count}</td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 700, color: '#10b981'}}>₹{item.total_spent?.toFixed(2)}</td>
                        <td style={tdStyle}>{new Date(item.last_visit).toLocaleDateString()}</td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 600}}>₹{(item.total_spent / item.visit_count).toFixed(2)}</td>
                    </tr>
                 ))}
                 {data.length === 0 && (
                    <tr>
                        <td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '16px' }}>No CRM data found.</td>
                    </tr>
                 )}
               </tbody>
            </table>
            </div>
        )}
    </div>
  );
};

export default CRMReports;
