import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

const thStyle = { padding: '14px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '15px' };
const tdStyle = { padding: '14px 20px', color: '#334155', fontSize: '15px' };
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#0ea5e9', '#14b8a6', '#f43f5e', '#a855f7'];

const SalesReports = () => {
  const [activeTab, setActiveTab] = useState('item-wise'); // item-wise, category-wise, add-ons, hourly, cancelled, discounts, gst
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    console.log(`[SalesReports] Fetching ${activeTab} for ${startDate} to ${endDate}`);
    try {
      let result = [];
      switch (activeTab) {
        case 'item-wise':
          result = await window.electronAPI.invoke('reports:itemWiseSales', { startDate, endDate });
          break;
        case 'category-wise':
          result = await window.electronAPI.invoke('reports:categoryWiseSales', { startDate, endDate });
          break;
        case 'add-ons':
          result = await window.electronAPI.invoke('reports:addonSales', { startDate, endDate });
          break;
        case 'hourly':
          result = await window.electronAPI.invoke('reports:hourlySales', { date: startDate });
          break;
        case 'cancelled':
          result = await window.electronAPI.invoke('reports:cancelledOrders', { startDate, endDate });
          break;
        case 'discounts':
          result = await window.electronAPI.invoke('reports:discounts', { startDate, endDate });
          break;
        case 'gst':
          result = await window.electronAPI.invoke('reports:gst', { startDate, endDate });
          break;
        default:
          break;
      }
      console.log(`[SalesReports] Received ${result?.length} rows`, result);
      setData(result || []);
    } catch (error) {
      console.error("Error fetching sales data:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `Sales_${activeTab}_${startDate}.xlsx`);
  };

  // Custom Label for Pie Chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, category_name }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 25; // Push label outside
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const textAnchor = x > cx ? 'start' : 'end';

    return (
      <text x={x} y={y} fill="#1e293b" textAnchor={textAnchor} dominantBaseline="central" fontSize="13" fontWeight="700">
        {`${category_name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  return (
    <div className="report-container">
      <div className="report-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div className="tabs" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['item-wise', 'category-wise', 'add-ons', 'hourly', 'cancelled', 'discounts', 'gst'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === tab ? '#6366f1' : 'white',
                color: activeTab === tab ? 'white' : '#64748b',
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontWeight: 600,
                fontSize: '15px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>
        
        <div className="controls" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none' }}
          />
          {activeTab !== 'hourly' && (
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none' }}
            />
          )}
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
          {/* Visualizations for specific tabs */}
          {activeTab === 'item-wise' && data.length > 0 && (
            <div style={{ height: '400px', marginBottom: '24px', background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
              <h4 style={{ margin: '0 0 24px 0', color: '#1e293b', fontSize: '18px', fontWeight: 700 }}>Top Items by Revenue</h4>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={data.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="item_name" tick={{ fontSize: 13, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 13, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                    labelStyle={{ fontWeight: 700, marginBottom: '4px' }}
                    formatter={(value) => `₹${value}`} 
                  />
                  <Bar dataKey="total_revenue" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={65} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === 'category-wise' && data.length > 0 && (
            <div style={{ height: '450px', marginBottom: '24px', background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
               <h4 style={{ margin: '0 0 24px 0', color: '#1e293b', fontSize: '18px', fontWeight: 700 }}>Category Breakdown</h4>
               <ResponsiveContainer width="100%" height="95%">
                 <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="45%"
                      labelLine={true}
                      label={renderCustomizedLabel}
                      outerRadius={110}
                      innerRadius={70}
                      paddingAngle={3}
                      dataKey="total_revenue"
                      nameKey="category_name"
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`₹${value.toFixed(2)}`, 'Revenue']} 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                    />
                    <Legend verticalAlign="bottom" height={40} iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '14px', fontWeight: 500, paddingTop: '20px' }} />
                 </PieChart>
               </ResponsiveContainer>
            </div>
          )}

          {/* Data Table */}
          <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <tr>
                   {activeTab === 'item-wise' && (
                     <>
                       <th style={thStyle}>Item Name</th>
                       <th style={thStyle}>Category</th>
                       <th style={{...thStyle, textAlign: 'right'}}>Quantity</th>
                       <th style={{...thStyle, textAlign: 'right'}}>Revenue</th>
                     </>
                   )}
                   {activeTab === 'category-wise' && (
                     <>
                       <th style={thStyle}>Category</th>
                       <th style={{...thStyle, textAlign: 'right'}}>Orders</th>
                       <th style={{...thStyle, textAlign: 'right'}}>Quantity</th>
                       <th style={{...thStyle, textAlign: 'right'}}>Revenue</th>
                     </>
                   )}
                   {activeTab === 'add-ons' && (
                     <>
                       <th style={thStyle}>Add-on Name</th>
                       <th style={{...thStyle, textAlign: 'right'}}>Quantity Sold</th>
                       <th style={{...thStyle, textAlign: 'right'}}>Total Revenue</th>
                     </>
                   )}
                   {activeTab === 'hourly' && (
                     <>
                       <th style={thStyle}>Hour</th>
                       <th style={{...thStyle, textAlign: 'right'}}>Orders Per Hour</th>
                       <th style={{...thStyle, textAlign: 'right'}}>Revenue Per Hour</th>
                     </>
                   )}
                   {activeTab === 'cancelled' && (
                     <>
                       <th style={thStyle}>Order #</th>
                       <th style={thStyle}>Cancelled At</th>
                       <th style={thStyle}>Reason</th>
                       <th style={thStyle}>Cashier</th>
                       <th style={{...thStyle, textAlign: 'right'}}>Amount</th>
                     </>
                   )}
                   {activeTab === 'discounts' && (
                     <>
                       <th style={thStyle}>Order #</th>
                       <th style={thStyle}>Date</th>
                       <th style={thStyle}>Discount Reason</th>
                       <th style={{...thStyle, textAlign: 'right'}}>Subtotal</th>
                       <th style={{...thStyle, textAlign: 'right'}}>Discount</th>
                       <th style={{...thStyle, textAlign: 'right'}}>Final</th>
                     </>
                   )}
                   {activeTab === 'gst' && (
                     <>
                       <th style={thStyle}>Date</th>
                       <th style={{...thStyle, textAlign: 'center'}}>Total Orders</th>
                       <th style={{...thStyle, textAlign: 'right'}}>Taxable Amount</th>
                       <th style={{...thStyle, textAlign: 'right'}}>Tax (GST)</th>
                       <th style={{...thStyle, textAlign: 'right'}}>Total Amount</th>
                     </>
                   )}
                </tr>
              </thead>
              <tbody>
                {data.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                    {activeTab === 'item-wise' && (
                      <>
                        <td style={tdStyle}>{item.item_name}</td>
                        <td style={tdStyle}>{item.category_name}</td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 600}}>{item.total_quantity}</td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 700, color: '#10b981'}}>₹{item.total_revenue?.toFixed(2)}</td>
                      </>
                    )}
                    {activeTab === 'category-wise' && (
                      <>
                        <td style={tdStyle}>{item.category_name}</td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 600}}>{item.orders_count}</td>
                        <td style={{...tdStyle, textAlign: 'right'}}>{item.total_quantity}</td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 700, color: '#10b981'}}>₹{item.total_revenue?.toFixed(2)}</td>
                      </>
                    )}
                    {activeTab === 'add-ons' && (
                      <>
                        <td style={tdStyle}>{item.name}</td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 600}}>{item.quantity}</td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 700, color: '#10b981'}}>₹{item.revenue?.toFixed(2)}</td>
                      </>
                    )}
                    {activeTab === 'hourly' && (
                      <>
                        <td style={tdStyle}>{item.hour}:00 - {item.hour}:59</td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 600}}>{item.total_orders}</td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 700, color: '#10b981'}}>₹{item.total_revenue?.toFixed(2)}</td>
                      </>
                    )}
                    {activeTab === 'cancelled' && (
                      <>
                        <td style={tdStyle}>#{item.order_number}</td>
                        <td style={tdStyle}>{new Date(item.cancelled_at).toLocaleString()}</td>
                        <td style={tdStyle}>{item.reason || '-'}</td>
                        <td style={tdStyle}>{item.cashier_name || 'Unknown'}</td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 700, color: '#ef4444'}}>₹{item.total_amount?.toFixed(2)}</td>
                      </>
                    )}
                    {activeTab === 'discounts' && (
                      <>
                        <td style={tdStyle}>#{item.order_number}</td>
                        <td style={tdStyle}>{new Date(item.created_at).toLocaleDateString()}</td>
                        <td style={tdStyle}>{item.discount_reason || 'Manual'}</td>
                        <td style={{...tdStyle, textAlign: 'right'}}>₹{item.subtotal?.toFixed(2)}</td>
                        <td style={{...tdStyle, textAlign: 'right', color: '#ef4444', fontWeight: 600}}>-₹{item.discount_amount?.toFixed(2)}</td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 800}}>₹{item.total_amount?.toFixed(2)}</td>
                      </>
                    )}
                    {activeTab === 'gst' && (
                      <>
                        <td style={tdStyle}>{new Date(item.date).toLocaleDateString()}</td>
                        <td style={{...tdStyle, textAlign: 'center', fontWeight: 600}}>{item.total_orders}</td>
                        <td style={{...tdStyle, textAlign: 'right'}}>₹{item.taxable_amount?.toFixed(2)}</td>
                        <td style={{...tdStyle, textAlign: 'right', color: '#6366f1'}}>₹{item.total_tax?.toFixed(2)}</td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 800, color: '#10b981'}}>₹{item.total_amount?.toFixed(2)}</td>
                      </>
                    )}
                  </tr>
                ))}
                {data.length === 0 && (
                   <tr>
                     <td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '16px' }}>No data found for the selected period.</td>
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

export default SalesReports;
