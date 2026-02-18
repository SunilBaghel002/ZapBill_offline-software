import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const thStyle = { padding: '14px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '15px' };
const tdStyle = { padding: '14px 20px', color: '#334155', fontSize: '15px' };
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#0ea5e9', '#14b8a6', '#f43f5e', '#a855f7'];

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

    // Custom Label for Pie Chart
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payment_method }) => {
        const RADIAN = Math.PI / 180;
        const radius = outerRadius + 25; // Push label outside
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        const textAnchor = x > cx ? 'start' : 'end';

        return (
            <text x={x} y={y} fill="#1e293b" textAnchor={textAnchor} dominantBaseline="central" fontSize="13" fontWeight="700">
                {`${payment_method.toUpperCase()} (${(percent * 100).toFixed(0)}%)`}
            </text>
        );
    };

    return (
        <div className="report-container">
            <div className="report-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: 800 }}>Payment Reconciliation</h3>
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
                    <span style={{ fontSize: '16px', fontWeight: 500 }}>Loading report data...</span>
                </div>
            ) : (
                <div className="report-content">
                    {/* Charts */}
                    {data.length > 0 && (
                        <div style={{ height: '450px', marginBottom: '24px', background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
                            <ResponsiveContainer width="100%" height="95%">
                                <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                                    <Pie
                                        data={data}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={70}
                                        outerRadius={110}
                                        paddingAngle={3}
                                        dataKey="total_amount"
                                        nameKey="payment_method"
                                        labelLine={true}
                                        label={renderCustomizedLabel}
                                    >
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value) => [`₹${value.toFixed(2)}`, 'Collected']} 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                                    />
                                    <Legend verticalAlign="bottom" height={40} iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '14px', fontWeight: 500, paddingTop: '20px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <tr>
                                    <th style={thStyle}>Payment Mode</th>
                                    <th style={{...thStyle, textAlign: 'center'}}>Transaction Count</th>
                                    <th style={{...thStyle, textAlign: 'right'}}>Total Collected</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{...tdStyle, textTransform: 'uppercase', fontWeight: 700, color: '#6366f1'}}>{item.payment_method}</td>
                                        <td style={{...tdStyle, textAlign: 'center', fontWeight: 600}}>{item.count}</td>
                                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 800, color: '#10b981', fontSize: '16px'}}>₹{item.total_amount?.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {data.length === 0 && (
                                    <tr>
                                        <td colSpan="3" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '16px' }}>No payment data found for the selected period.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentReports;
