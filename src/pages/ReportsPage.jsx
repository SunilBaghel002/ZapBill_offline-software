import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  ShoppingCart,
  DollarSign,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  XCircle,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart, // Changed from LineChart
  Area,      // Changed from Line
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format, subDays, startOfWeek, addDays } from 'date-fns';
import * as XLSX from 'xlsx';

// Order Details Modal Component
const OrderDetailsModal = ({ order, onClose }) => {
  if (!order) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center'
    }} onClick={onClose}>
      <div 
        style={{
          background: 'white', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto',
          borderRadius: '8px', padding: '24px', position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }} 
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', cursor: 'pointer' }}>
          <XCircle size={24} color="#546E7A" />
        </button>
        
        <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
          Order #{order.order_number}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
           <div>
             <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Date & Time</div>
             <div style={{ fontWeight: '500' }}>{new Date(order.created_at).toLocaleString()}</div>
           </div>
           <div>
             <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Order Type</div>
             <div style={{ fontWeight: '500', textTransform: 'capitalize' }}>{order.order_type?.replace('_', ' ')}</div>
           </div>
           <div>
             <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Payment Type</div>
             <div style={{ fontWeight: '500', textTransform: 'capitalize' }}>{order.payment_method || '-'}</div>
           </div>
           <div>
             <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Status</div>
             <div style={{ fontWeight: '500', textTransform: 'capitalize' }}>{order.status}</div>
           </div>
           <div>
             <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Customer Name</div>
             <div style={{ fontWeight: '500' }}>{order.customer_name || 'Walk-in'}</div>
           </div>
           <div>
             <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Phone</div>
             <div style={{ fontWeight: '500' }}>{order.customer_phone || '-'}</div>
           </div>
        </div>

        <h3 style={{ fontSize: '16px', margin: '0 0 12px 0', color: '#34495e' }}>Order Items</h3>
        <div style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
             <thead style={{ background: '#f8f9fa' }}>
               <tr>
                 <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Item</th>
                 <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid #eee' }}>Qty</th>
                 <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>Price</th>
               </tr>
             </thead>
             <tbody>
               {order.items?.map((item, idx) => (
                 <tr key={idx} style={{ borderBottom: '1px solid #f5f5f5' }}>
                   <td style={{ padding: '8px 12px' }}>{item.item_name || item.name}</td>
                   <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.quantity}</td>
                   <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{(item.price || item.unit_price) * item.quantity}</td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '18px', fontWeight: 'bold', borderTop: '1px solid #eee', paddingTop: '16px' }}>
           <span>Total Amount</span>
           <span style={{ color: '#27ae60' }}>₹{order.total_amount || 0}</span>
        </div>
      </div>
    </div>
  );
};

const ReportsPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reportType, setReportType] = useState('daily'); // 'daily', 'weekly', 'monthly'
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    loadReport();
  }, [selectedDate, reportType]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      let result;
      if (reportType === 'daily') {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        result = await window.electronAPI.invoke('reports:daily', { date: dateStr });
      } else if (reportType === 'weekly') {
        const weekStart = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        result = await window.electronAPI.invoke('reports:weekly', { startDate: weekStart });
      } else if (reportType === 'monthly') {
        const monthStr = format(selectedDate, 'yyyy-MM');
        result = await window.electronAPI.invoke('reports:monthly', { month: monthStr });
      }
      setData(result);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateDate = (direction) => {
    if (reportType === 'daily') {
      setSelectedDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1));
    } else if (reportType === 'weekly') {
      setSelectedDate(prev => direction === 'prev' ? subDays(prev, 7) : addDays(prev, 7));
    } else {
      // Monthly
      setSelectedDate(prev => {
        const d = new Date(prev);
        d.setMonth(d.getMonth() + (direction === 'prev' ? -1 : 1));
        return d;
      });
    }
  };

  const handleDateChange = (e) => {
    if (e.target.value) {
      setSelectedDate(new Date(e.target.value));
    }
  };

  const FormatDateRange = () => {
    if (reportType === 'daily') return format(selectedDate, 'EEEE, MMMM d, yyyy');
    if (reportType === 'weekly') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = addDays(start, 6);
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    }
    return format(selectedDate, 'MMMM yyyy');
  };

  const exportToExcel = async () => {
    try {
      if (!data) return;
      const wb = XLSX.utils.book_new();
      
      // 1. Summary Sheet
      const summaryData = [{
        'Period': FormatDateRange(),
        'Total Revenue': data.sales?.total_revenue || 0,
        'Total Orders': data.sales?.total_orders || 0,
        'Total Tax': data.sales?.total_tax || 0,
        'Total Discount': data.sales?.total_discount || 0
      }];
      // Add payment breakdown if available
      if (data.sales?.cash_amount !== undefined) {
         summaryData[0]['Cash Sales'] = data.sales.cash_amount;
         summaryData[0]['Card Sales'] = data.sales.card_amount;
         summaryData[0]['UPI Sales'] = data.sales.upi_amount;
      }

      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

      // 2. Daily Detailed Export (For Daily Report Only)
      if (reportType === 'daily') {
          const dateStr = format(selectedDate, 'yyyy-MM-dd');
          const detailedData = await window.electronAPI.invoke('reports:dailyDetailed', { date: dateStr });
          
          if (detailedData && detailedData.length > 0) {
              const detailedSheetData = detailedData.map(d => ({
                'Order #': d.order_number,
                'Date': d.order_date,
                'Time': d.order_time,
                'Cashier': d.cashier_name,
                'Customer Name': d.customer_name || 'N/A',
                'Phone': d.customer_phone || 'N/A',
                'Order Type': d.order_type,
                'Table No': d.table_number || 'N/A',
                'Item Name': d.item_name,
                'Quantity': d.quantity,
                'Total': d.item_total,
                'Payment Mode': d.payment_method
            }));
              const detailedSheet = XLSX.utils.json_to_sheet(detailedSheetData);
              XLSX.utils.book_append_sheet(wb, detailedSheet, 'Detailed Sales');
          }
      }

      // 3. Daily Trend Sheet (Weekly/Monthly)
      if (data.dailyTrend?.length > 0) {
        const trendData = data.dailyTrend.map(d => ({
            'Date': d.date,
            'Revenue': d.total_revenue,
            'Orders': d.total_orders,
            'Tax': d.total_tax
        }));
        const trendSheet = XLSX.utils.json_to_sheet(trendData);
        XLSX.utils.book_append_sheet(wb, trendSheet, 'Daily Trend');
      }

      // 4. Category Sales Sheet
      if (data.categorySales?.length > 0) {
        const catData = data.categorySales.map(c => ({
            'Category': c.category_name,
            'Quantity Sold': c.total_quantity,
            'Revenue': c.total_revenue
        }));
        const catSheet = XLSX.utils.json_to_sheet(catData);
        XLSX.utils.book_append_sheet(wb, catSheet, 'Category Sales');
      }

      // 5. Top Items Sheet
      if (data.topItems?.length > 0) {
        const topItemsData = data.topItems.map(item => ({
        'Item Name': item.item_name,
        'Quantity Sold': item.total_quantity,
        'Revenue': item.total_revenue
        }));
        const topItemsSheet = XLSX.utils.json_to_sheet(topItemsData);
        XLSX.utils.book_append_sheet(wb, topItemsSheet, 'Top Items');
      }

      // 6. Orders List (Daily Only)
      if (data.orders?.length > 0) {
        const ordersData = data.orders.map(order => ({
        'Order #': order.order_number,
        'Time': new Date(order.created_at).toLocaleTimeString(),
        'Type': order.order_type,
        'Payment': order.payment_method,
        'Amount': order.total_amount
        }));
        const ordersSheet = XLSX.utils.json_to_sheet(ordersData);
        XLSX.utils.book_append_sheet(wb, ordersSheet, 'Orders List');
      }
      
      const fileName = `${reportType}_Report_${format(selectedDate, 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      alert('Report exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export: ' + error.message);
    }
  };

  const sales = data?.sales || {};
  const topItems = data?.topItems || [];
  const categorySales = data?.categorySales || [];
  const dailyTrend = data?.dailyTrend || [];
  const orders = data?.orders || [];
  const paymentData = sales.cash_amount !== undefined ? [
    { name: 'Cash', value: sales.cash_amount || 0 },
    { name: 'Card', value: sales.card_amount || 0 },
    { name: 'UPI', value: sales.upi_amount || 0 },
  ].filter(d => d.value > 0) : [];
  
  const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    // Removed manual margins to let standard layout padding work
    <div style={{ padding: '20px', height: 'calc(100vh - 64px)', marginTop: '64px', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ 
        padding: 'var(--spacing-4) var(--spacing-6)',
        background: 'white',
        borderBottom: '1px solid var(--gray-200)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 className="text-xl font-bold text-gray-800">Reports</h1>
          
          {/* View Selector */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
            {['daily', 'weekly', 'monthly'].map(type => (
              <button
                key={type}
                onClick={() => setReportType(type)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: reportType === type ? 'white' : 'transparent',
                  color: reportType === type ? '#6366f1' : '#64748b',
                  fontWeight: reportType === type ? 600 : 500,
                  boxShadow: reportType === type ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s'
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="date-navigator" style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-md)', position: 'relative' }}>
            <button onClick={() => navigateDate('prev')} className="icon-btn" style={{ padding: '8px' }}>
              <ChevronLeft size={20} />
            </button>
            <div style={{ padding: '0 16px', fontWeight: 500, minWidth: '200px', textAlign: 'center', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
              <Calendar size={16} className="text-gray-400" />
              <span>{FormatDateRange()}</span>
              {/* Hidden Date Input for Calendar Picker */}
              <input 
                type="date" 
                value={format(selectedDate, 'yyyy-MM-dd')} // Ensure this format
                onChange={handleDateChange} // Must be present
                style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '100%', 
                    opacity: 0, 
                    cursor: 'pointer' 
                }} 
              />
            </div>
            <button onClick={() => navigateDate('next')} className="icon-btn" style={{ padding: '8px' }}>
              <ChevronRight size={20} />
            </button>
          </div>

          <button className="btn btn-secondary" onClick={exportToExcel} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Download size={18} />
            Download Excel
          </button>
        </div>
      </div>

      <div style={{ padding: 'var(--spacing-6) 0', overflowY: 'auto', flex: 1 }}>
        {isLoading && !data ? (
          <div className="text-center p-8 text-gray-500">Loading...</div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', color: 'white', boxShadow: '0 10px 40px rgba(99, 102, 241, 0.3)' }}>
                <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.2)' }}><DollarSign size={24} /></div>
                <div>
                  <div className="stat-value">₹{(sales.total_revenue || 0).toFixed(2)}</div>
                  <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Total Revenue</div>
                </div>
              </div>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', color: 'white', boxShadow: '0 10px 40px rgba(16, 185, 129, 0.3)' }}>
                <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.2)' }}><ShoppingCart size={24} /></div>
                <div>
                  <div className="stat-value">{sales.total_orders || 0}</div>
                  <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Total Orders</div>
                </div>
              </div>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', color: 'white', boxShadow: '0 10px 40px rgba(245, 158, 11, 0.3)' }}>
                <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.2)' }}><TrendingUp size={24} /></div>
                <div>
                  <div className="stat-value">₹{sales.total_orders ? (sales.total_revenue / sales.total_orders).toFixed(2) : '0.00'}</div>
                  <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Avg. Order Value</div>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 'var(--spacing-6)', marginTop: 'var(--spacing-6)' }}>
              
              {/* Trend Chart (Area Chart) */}
              {(reportType === 'weekly' || reportType === 'monthly') && (
                <div className="card" style={{ gridColumn: 'span 12', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                  <div className="card-header" style={{ background: '#f8fafc', borderBottom: '1px solid var(--gray-200)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendingUp size={20} style={{ color: '#6366f1' }} />
                      Revenue Trend
                    </h3>
                  </div>
                  <div className="card-body" style={{ padding: 'var(--spacing-4)', height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                            dataKey="date" 
                            tickFormatter={(str) => format(new Date(str), 'MMM d')} 
                            tick={{ fontSize: 12, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis 
                            tick={{ fontSize: 12, fill: '#64748b' }} 
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `₹${value}`}
                        />
                        <Tooltip 
                            labelFormatter={(str) => format(new Date(str), 'MMM d, yyyy')}
                            formatter={(value) => [`₹${value.toFixed(2)}`, 'Revenue']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="total_revenue" 
                            stroke="#6366f1" 
                            fillOpacity={1} 
                            fill="url(#colorRevenue)" 
                            strokeWidth={3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Category Sales (Donut Chart) */}
              <div className="card" style={{ gridColumn: 'span 4', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <div className="card-header" style={{ background: '#f8fafc', borderBottom: '1px solid var(--gray-200)' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PieChartIcon size={20} style={{ color: '#8b5cf6' }} />
                    Sales by Category
                  </h3>
                </div>
                <div className="card-body" style={{ padding: 'var(--spacing-4)', height: '350px' }}>
                  {categorySales.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categorySales}
                          cx="50%"
                          cy="50%"
                          innerRadius={80} // Donut style
                          outerRadius={110}
                          paddingAngle={3}
                          dataKey="total_revenue"
                        >
                          {categorySales.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name, props) => [`₹${value.toFixed(2)}`, props.payload.category_name]} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="empty-state"><p className="text-muted">No category data</p></div>}
                </div>
              </div>

              {/* Top Items (Bar Chart) */}
              <div className="card" style={{ gridColumn: 'span 8', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <div className="card-header" style={{ background: '#f8fafc', borderBottom: '1px solid var(--gray-200)' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={20} style={{ color: 'var(--primary-500)' }} />
                    Top Selling Items
                  </h3>
                </div>
                <div className="card-body" style={{ padding: 'var(--spacing-4)', height: '350px' }}>
                  {topItems.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topItems} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="item_name" 
                            type="category" 
                            width={120} 
                            tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} 
                            interval={0}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip 
                            cursor={{fill: 'transparent'}}
                            formatter={(value) => [`${value} sold`, 'Quantity']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Bar 
                            dataKey="total_quantity" 
                            fill="#10b981" 
                            radius={[0, 6, 6, 0]} 
                            barSize={24}
                            background={{ fill: '#f1f5f9', radius: [0, 6, 6, 0] }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="empty-state"><p className="text-muted">No sales data</p></div>}
                </div>
              </div>

               {/* Payment Methods */}
               <div className="card" style={{ gridColumn: 'span 12', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <div className="card-header" style={{ background: '#f8fafc', borderBottom: '1px solid var(--gray-200)' }}>
                  <h3>💳 Payment Methods Summary</h3>
                </div>
                <div className="card-body" style={{ padding: 'var(--spacing-4)', height: '350px' }}>
                  {paymentData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={110}
                          paddingAngle={3}
                          dataKey="value"
                          animationDuration={800}
                        >
                          {paymentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % 3]} stroke="white" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`₹${value.toFixed(2)}`, 'Amount']}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                      <div className="empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <p className="text-muted">No payment data</p>
                      </div>
                  )}
                </div>
              </div>
            </div>

            {/* Orders Table OR Daily Breakdown Table */}
            <div className="card" style={{ marginTop: 'var(--spacing-6)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <div className="card-header" style={{ background: '#f8fafc', borderBottom: '1px solid var(--gray-200)' }}>
                <h3>
                    {reportType === 'daily' ? '📋 Orders Today' : '📅 Daily Breakdown'}
                </h3>
              </div>
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    {reportType === 'daily' ? (
                        <tr>
                        <th>Order #</th>
                        <th>Time</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th className="text-right">Amount</th>
                        </tr>
                    ) : (
                        <tr>
                        <th>Date</th>
                        <th>Orders Count</th>
                        <th className="text-right">Tax</th>
                        <th className="text-right">Revenue</th>
                        </tr>
                    )}
                  </thead>
                  <tbody>
                    {reportType === 'daily' ? (
                        orders.length > 0 ? (
                            orders.map(order => (
                            <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-gray-50" style={{ cursor: 'pointer' }}>
                                <td style={{ fontWeight: 600 }}>#{order.order_number}</td>
                                <td>{new Date(order.created_at).toLocaleTimeString()}</td>
                                <td>{order.order_type.replace('_', ' ')}</td>
                                <td><span className={`badge badge-${order.status === 'completed' ? 'success' : 'warning'}`}>{order.status}</span></td>
                                <td><span className="badge badge-gray">{order.payment_method?.toUpperCase()}</span></td>
                                <td className="text-right" style={{ fontWeight: 600 }}>₹{order.total_amount.toFixed(2)}</td>
                            </tr>
                            ))
                        ) : <tr><td colSpan={6} className="text-center p-4">No orders</td></tr>
                    ) : (
                        dailyTrend.length > 0 ? (
                            dailyTrend.map((day, idx) => (
                            <tr key={idx}>
                                <td>{format(new Date(day.date), 'MMM d, yyyy')}</td>
                                <td>{day.total_orders}</td>
                                <td className="text-right">₹{day.total_tax.toFixed(2)}</td>
                                <td className="text-right" style={{ fontWeight: 600, color: '#10b981' }}>₹{day.total_revenue.toFixed(2)}</td>
                            </tr>
                            ))
                        ) : <tr><td colSpan={4} className="text-center p-4">No data for this period</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
};

export default ReportsPage;
