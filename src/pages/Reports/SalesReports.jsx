import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { Download, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

const SalesReports = () => {
  const [activeTab, setActiveTab] = useState('item-wise'); // item-wise, category-wise, hourly, cancelled, discounts, gst
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let result = [];
      switch (activeTab) {
        case 'item-wise':
          result = await window.electronAPI.invoke('reports:itemWiseSales', { startDate, endDate });
          break;
        case 'category-wise':
          result = await window.electronAPI.invoke('reports:categoryWiseSales', { startDate, endDate });
          break;
        case 'hourly':
          // Hourly is usually for a single day, but our API takes single date or mapped range if we change logic
          // For now, let's use startDate as the target date
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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="report-container">
      <div className="report-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div className="tabs" style={{ display: 'flex', gap: '10px' }}>
          {['item-wise', 'category-wise', 'hourly', 'cancelled', 'discounts', 'gst'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === tab ? '#6366f1' : '#e2e8f0',
                color: activeTab === tab ? 'white' : '#475569',
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontWeight: 500
              }}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>
        
        <div className="controls" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          {activeTab !== 'hourly' && (
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          )}
          <button onClick={exportToExcel} className="btn-secondary" style={{ display: 'flex', gap: '5px', alignItems: 'center', padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading report data...</div>
      ) : (
        <div className="report-content">
          {/* Visualizations for specific tabs */}
          {activeTab === 'item-wise' && data.length > 0 && (
            <div style={{ height: '300px', marginBottom: '30px', background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <h4>Top Items by Revenue</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="item_name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value}`} />
                  <Bar dataKey="total_revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === 'category-wise' && data.length > 0 && (
            <div style={{ height: '300px', marginBottom: '30px', background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
               <h4>Category Breakdown</h4>
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="total_revenue"
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

          {/* Data Table */}
          <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                   {/* Dynamic Headers based on activeTab */}
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
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {activeTab === 'item-wise' && (
                      <>
                        <td style={tdStyle}>{item.item_name}</td>
                        <td style={tdStyle}>{item.category_name}</td>
                        <td style={{...tdStyle, textAlign: 'right'}}>{item.total_quantity}</td>
                        <td style={{...tdStyle, textAlign: 'right'}}>₹{item.total_revenue?.toFixed(2)}</td>
                      </>
                    )}
                    {activeTab === 'category-wise' && (
                      <>
                        <td style={tdStyle}>{item.category_name}</td>
                        <td style={{...tdStyle, textAlign: 'right'}}>{item.orders_count}</td>
                        <td style={{...tdStyle, textAlign: 'right'}}>{item.total_quantity}</td>
                        <td style={{...tdStyle, textAlign: 'right'}}>₹{item.total_revenue?.toFixed(2)}</td>
                      </>
                    )}
                    {activeTab === 'hourly' && (
                      <>
                        <td style={tdStyle}>{item.hour}:00 - {item.hour}:59</td>
                        <td style={{...tdStyle, textAlign: 'right'}}>{item.total_orders}</td>
                        <td style={{...tdStyle, textAlign: 'right'}}>₹{item.total_revenue?.toFixed(2)}</td>
                      </>
                    )}
                    {activeTab === 'cancelled' && (
                      <>
                        <td style={tdStyle}>#{item.order_number}</td>
                        <td style={tdStyle}>{new Date(item.cancelled_at).toLocaleString()}</td>
                        <td style={tdStyle}>{item.reason || '-'}</td>
                        <td style={tdStyle}>{item.cashier_name || 'Unknown'}</td>
                        <td style={{...tdStyle, textAlign: 'right'}}>₹{item.total_amount?.toFixed(2)}</td>
                      </>
                    )}
                    {activeTab === 'discounts' && (
                      <>
                        <td style={tdStyle}>#{item.order_number}</td>
                        <td style={tdStyle}>{new Date(item.created_at).toLocaleDateString()}</td>
                        <td style={tdStyle}>{item.discount_reason || 'Manual'}</td>
                        <td style={{...tdStyle, textAlign: 'right'}}>₹{item.subtotal?.toFixed(2)}</td>
                        <td style={{...tdStyle, textAlign: 'right', color: '#ef4444'}}>-₹{item.discount_amount?.toFixed(2)}</td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 'bold'}}>₹{item.total_amount?.toFixed(2)}</td>
                      </>
                    )}
                    {activeTab === 'gst' && (
                      <>
                        <td style={tdStyle}>{new Date(item.date).toLocaleDateString()}</td>
                        <td style={{...tdStyle, textAlign: 'center'}}>{item.total_orders}</td>
                        <td style={{...tdStyle, textAlign: 'right'}}>₹{item.taxable_amount?.toFixed(2)}</td>
                        <td style={{...tdStyle, textAlign: 'right'}}>₹{item.total_tax?.toFixed(2)}</td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 'bold'}}>₹{item.total_amount?.toFixed(2)}</td>
                      </>
                    )}
                  </tr>
                ))}
                {data.length === 0 && (
                   <tr>
                     <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No data found for the selected period.</td>
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

const thStyle = { padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b' };
const tdStyle = { padding: '12px 16px', color: '#334155' };

export default SalesReports;
