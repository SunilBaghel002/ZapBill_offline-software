import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const StaffReports = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        fetchData();
    }, [startDate, endDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await window.electronAPI.invoke('reports:staffPerformance', { startDate, endDate });
            setData(result || []);
        } catch (error) {
            console.error("Error fetching staff data:", error);
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Staff");
        XLSX.writeFile(wb, `Staff_Performance_${startDate}.xlsx`);
    };

    return (
        <div className="report-container">
            <div className="report-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3>Staff Performance</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '6px' }} />
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '6px' }} />
                    <button onClick={exportToExcel} className="btn-secondary" style={{ display: 'flex', gap: '5px', alignItems: 'center', padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        <Download size={16} /> Export
                    </button>
                </div>
            </div>

            {loading ? <div>Loading...</div> : (
                <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={thStyle}>Staff Name</th>
                                <th style={thStyle}>Role</th>
                                <th style={{...thStyle, textAlign: 'center'}}>Orders Handled</th>
                                <th style={{...thStyle, textAlign: 'right'}}>Total Sales Generated</th>
                                <th style={{...thStyle, textAlign: 'right'}}>Avg. Order Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={tdStyle}>{item.staff_name}</td>
                                    <td style={{...tdStyle, textTransform: 'capitalize'}}>{item.role}</td>
                                    <td style={{...tdStyle, textAlign: 'center'}}>{item.orders_handled}</td>
                                    <td style={{...tdStyle, textAlign: 'right'}}>₹{item.total_sales?.toFixed(2)}</td>
                                    <td style={{...tdStyle, textAlign: 'right'}}>₹{item.avg_order_value?.toFixed(2)}</td>
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

export default StaffReports;
