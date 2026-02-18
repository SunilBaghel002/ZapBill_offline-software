import React, { useState, useEffect } from 'react';
import { Download, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const PaymentReports = () => {
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
            const result = await window.electronAPI.invoke('reports:paymentMode', { startDate, endDate });
            setData(result || []);
        } catch (error) {
            console.error("Error fetching payment data:", error);
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Payment");
        XLSX.writeFile(wb, `Payment_Report_${startDate}.xlsx`);
    };

    const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <div className="report-container">
            <div className="report-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3>Payment Reconciliation</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '6px' }} />
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '6px' }} />
                    <button onClick={exportToExcel} className="btn-secondary" style={{ display: 'flex', gap: '5px', alignItems: 'center', padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        <Download size={16} /> Export
                    </button>
                </div>
            </div>

            {loading ? <div>Loading...</div> : (
                <>
                    {/* Charts */}
                    {data.length > 0 && (
                        <div style={{ height: '300px', marginBottom: '30px', background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="total_amount"
                                    nameKey="payment_method"
                                    label={({ payment_method, percent }) => `${payment_method.toUpperCase()} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `₹${value}`} />
                                <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <tr>
                                    <th style={thStyle}>Payment Mode</th>
                                    <th style={{...thStyle, textAlign: 'center'}}>Transaction Count</th>
                                    <th style={{...thStyle, textAlign: 'right'}}>Total Collected</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{...tdStyle, textTransform: 'uppercase', fontWeight: 500}}>{item.payment_method}</td>
                                        <td style={{...tdStyle, textAlign: 'center'}}>{item.count}</td>
                                        <td style={{...tdStyle, textAlign: 'right'}}>₹{item.total_amount?.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

const thStyle = { padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b' };
const tdStyle = { padding: '12px 16px', color: '#334155' };

export default PaymentReports;
