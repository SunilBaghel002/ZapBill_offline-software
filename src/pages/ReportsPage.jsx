import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import SalesReports from './Reports/SalesReports';
import InventoryReports from './Reports/InventoryReports';
import CRMReports from './Reports/CRMReports';
import StaffReports from './Reports/StaffReports';
import PaymentReports from './Reports/PaymentReports';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  ShoppingCart,
  DollarSign,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  XCircle,
  PieChart as PieChartIcon,
  Search,
  Filter,
  Clock,
  CreditCard,
  LayoutDashboard,
  Table as TableIcon,
  ShoppingBag
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart, 
  Area,      
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format, subDays, startOfWeek, addDays } from 'date-fns';
import * as XLSX from 'xlsx';

// Modern Color Palette
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#0ea5e9', '#14b8a6', '#f43f5e', '#a855f7'];
const PAYMENT_COLORS = { Cash: '#10b981', Card: '#6366f1', UPI: '#f59e0b' };

const thStyle = { padding: '14px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '15px' };
const tdStyle = { padding: '14px 20px', color: '#334155', fontSize: '15px' };

// Order Details Modal Component
const OrderDetailsModal = ({ order, onClose }) => {
  if (!order) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center'
    }} onClick={onClose}>
      <div 
        style={{
          background: 'white', width: '90%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto',
          borderRadius: '20px', padding: '32px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
        }} 
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', border: 'none', background: '#f1f5f9', color: '#64748b', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
          <XCircle size={24} />
        </button>
        
        <h2 style={{ margin: '0 0 24px 0', fontSize: '22px', fontWeight: 800, color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
          Order #{order.order_number}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
           <div>
             <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>Date & Time</div>
             <div style={{ fontWeight: '600', color: '#334155' }}>{new Date(order.created_at).toLocaleString()}</div>
           </div>
           <div>
             <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>Order Type</div>
             <div style={{ fontWeight: '600', color: '#334155', textTransform: 'capitalize' }}>{order.order_type?.replace('_', ' ')}</div>
           </div>
           <div>
             <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>Payment Method</div>
             <div style={{ fontWeight: '600', color: '#6366f1', textTransform: 'uppercase' }}>{order.payment_method || '-'}</div>
           </div>
           <div>
             <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>Status</div>
             <div style={{ fontWeight: '700', textTransform: 'uppercase', color: order.status === 'completed' ? '#10b981' : '#f59e0b', fontSize: '13px' }}>{order.status || 'Completed'}</div>
           </div>
           <div>
             <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>Customer</div>
             <div style={{ fontWeight: '600', color: '#334155' }}>{order.customer_name || 'Walk-in'}</div>
           </div>
           <div>
             <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>Phone</div>
             <div style={{ fontWeight: '600', color: '#334155' }}>{order.customer_phone || '-'}</div>
           </div>
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={18} /> Order Items
        </h3>
        <div style={{ border: '1px solid #f1f5f9', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
             <thead style={{ background: '#f8fafc' }}>
               <tr>
                 <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>Item</th>
                 <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>Qty</th>
                 <th style={{ padding: '12px 16px', textAlign: 'right', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>Price</th>
               </tr>
             </thead>
             <tbody>
               {order.items?.map((item, idx) => (
                 <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                   <td style={{ padding: '12px 16px', fontWeight: 500 }}>{item.item_name || item.name}</td>
                   <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                   <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>₹{(item.item_total || 0).toFixed(2)}</td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #f1f5f9', paddingTop: '20px' }}>
           <span style={{ fontSize: '16px', fontWeight: 600, color: '#64748b' }}>Total Amount</span>
           <span style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>₹{(order.total_amount || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

const ReportsPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reportType, setReportType] = useState('daily'); 
  const [data, setData] = useState(null);
  const [detailedData, setDetailedData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewMode, setViewMode] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');

  useEffect(() => {
    loadReport();
  }, [selectedDate, reportType, startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterPayment, filterType, viewMode]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      let result;
      let dateStr;

      if (reportType === 'daily') {
        dateStr = format(selectedDate, 'yyyy-MM-dd');
        result = await window.electronAPI.invoke('reports:daily', { date: dateStr });
        const details = await window.electronAPI.invoke('reports:dailyDetailed', { date: dateStr });
        setDetailedData(details || []);
      } else if (reportType === 'weekly') {
        const weekStart = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        result = await window.electronAPI.invoke('reports:weekly', { startDate: weekStart });
        setDetailedData([]);
      } else if (reportType === 'monthly') {
        const monthStr = format(selectedDate, 'yyyy-MM');
        result = await window.electronAPI.invoke('reports:monthly', { month: monthStr });
        setDetailedData([]);
      } else if (reportType === 'shift') {
        dateStr = format(selectedDate, 'yyyy-MM-dd');
        const shiftResult = await window.electronAPI.invoke('shifts:getByDate', { date: dateStr });
        result = { shifts: shiftResult || [] };
        setDetailedData([]);
      } else if (reportType === 'custom') {
        const startStr = format(startDate, 'yyyy-MM-dd');
        const endStr = format(endDate, 'yyyy-MM-dd');
        result = await window.electronAPI.invoke('reports:custom', { startDate: startStr, endDate: endStr });
        setDetailedData([]);
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
      setSelectedDate(prev => {
        const d = new Date(prev);
        d.setMonth(d.getMonth() + (direction === 'prev' ? -1 : 1));
        return d;
      });
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
      const summaryData = [{
        'Report Period': FormatDateRange(),
        'Total Revenue (₹)': (data.sales?.total_revenue || 0).toFixed(2),
        'Total Expenses (₹)': (data.sales?.total_expenses || 0).toFixed(2),
        'Net Revenue (₹)': (data.sales?.net_revenue || 0).toFixed(2),
        'Total Orders': data.sales?.total_orders || 0,
        'Cash Sales (₹)': (data.sales?.cash_amount || 0).toFixed(2),
        'Card Sales (₹)': (data.sales?.card_amount || 0).toFixed(2),
        'UPI Sales (₹)': (data.sales?.upi_amount || 0).toFixed(2),
      }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'Summary');
      XLSX.writeFile(wb, `${reportType}_Report_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    } catch (error) { console.error(error); }
  };

  const filteredData = useMemo(() => {
    if (!detailedData) return [];
    return detailedData.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || item.order_number?.toLowerCase().includes(searchLower) || item.customer_name?.toLowerCase().includes(searchLower) || item.item_name?.toLowerCase().includes(searchLower);
      const matchPayment = filterPayment === 'all' || item.payment_method === filterPayment;
      const matchType = filterType === 'all' || item.order_type === filterType;
      return matchSearch && matchPayment && matchType;
    });
  }, [detailedData, searchTerm, filterPayment, filterType]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

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

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, category_name }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const textAnchor = x > cx ? 'start' : 'end';
    return (
      <text x={x} y={y} fill="#1e293b" textAnchor={textAnchor} dominantBaseline="central" fontSize="13" fontWeight="700">
        {`${category_name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  const SubReportWrapper = ({ children }) => (
    <div style={{ padding: '24px', height: 'calc(100vh - 64px)', marginTop: '64px', overflowY: 'auto', background: '#f8fafc' }}>
      {children}
    </div>
  );

  if (category === 'sales') return <SubReportWrapper><SalesReports /></SubReportWrapper>;
  if (category === 'inventory') return <SubReportWrapper><InventoryReports /></SubReportWrapper>;
  if (category === 'crm') return <SubReportWrapper><CRMReports /></SubReportWrapper>;
  if (category === 'staff') return <SubReportWrapper><StaffReports /></SubReportWrapper>;
  if (category === 'payment') return <SubReportWrapper><PaymentReports /></SubReportWrapper>;

  return (
    <div style={{ padding: '24px', height: 'calc(100vh - 64px)', marginTop: '64px', display: 'flex', flexDirection: 'column', background: '#f8fafc', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ 
        padding: '20px 24px',
        background: 'white',
        borderRadius: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: 0 }}>Reports</h1>
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '4px' }}>
            {['daily', 'weekly', 'monthly', 'shift', 'custom'].map(type => (
              <button key={type} onClick={() => setReportType(type)} style={{
                padding: '8px 18px', borderRadius: '8px', border: 'none', background: reportType === type ? 'white' : 'transparent',
                color: reportType === type ? '#6366f1' : '#64748b', fontWeight: 600, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: reportType === type ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', textTransform: 'capitalize'
              }}>{type}</button>
            ))}
          </div>
          {reportType === 'daily' && (
             <div style={{ display: 'flex', background: '#e0e7ff', borderRadius: '10px', padding: '4px' }}>
                <button onClick={() => setViewMode('dashboard')} style={{
                    padding: '8px 14px', borderRadius: '8px', border: 'none', background: viewMode === 'dashboard' ? '#6366f1' : 'transparent',
                    color: viewMode === 'dashboard' ? 'white' : '#4f46e5', fontWeight: 600, fontSize: '14px', cursor: 'pointer', gap: '6px', display: 'flex', alignItems: 'center'
                }}><LayoutDashboard size={16} /> Dashboard</button>
                <button onClick={() => setViewMode('detailed')} style={{
                    padding: '8px 14px', borderRadius: '8px', border: 'none', background: viewMode === 'detailed' ? '#6366f1' : 'transparent',
                    color: viewMode === 'detailed' ? 'white' : '#4f46e5', fontWeight: 600, fontSize: '14px', cursor: 'pointer', gap: '6px', display: 'flex', alignItems: 'center'
                }}><TableIcon size={16} /> Detailed</button>
             </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {reportType === 'custom' ? (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'white', padding: '6px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <input type="date" value={format(startDate, 'yyyy-MM-dd')} onChange={(e) => setStartDate(new Date(e.target.value))} style={{ border: 'none', outline: 'none', fontWeight: 500 }} />
              <span style={{ color: '#cbd5e1' }}>→</span>
              <input type="date" value={format(endDate, 'yyyy-MM-dd')} onChange={(e) => setEndDate(new Date(e.target.value))} style={{ border: 'none', outline: 'none', fontWeight: 500 }} />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <button onClick={() => navigateDate('prev')} style={{ padding: '10px', border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><ChevronLeft size={20} /></button>
              <div style={{ padding: '0 20px', fontWeight: 700, minWidth: '220px', textAlign: 'center', borderLeft: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9' }}>{FormatDateRange()}</div>
              <button onClick={() => navigateDate('next')} style={{ padding: '10px', border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><ChevronRight size={20} /></button>
            </div>
          )}
          <button onClick={exportToExcel} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>
            <Download size={18} /> Export
          </button>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {isLoading ? (
          <div style={{ padding: '100px', textAlign: 'center' }}>
            <div className="spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #6366f1', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
            <span style={{ fontSize: '18px', color: '#64748b', fontWeight: 500 }}>Loading reports...</span>
          </div>
        ) : (
          <>
            {reportType === 'shift' && (
              <div style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock size={20} style={{ color: '#6366f1' }} />
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Shift Reports</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      <th style={thStyle}>Staff</th>
                      <th style={thStyle}>Started At</th>
                      <th style={thStyle}>Ended At</th>
                      <th style={thStyle}>Status</th>
                      <th style={{...thStyle, textAlign: 'right'}}>Orders</th>
                      <th style={{...thStyle, textAlign: 'right'}}>Revenue</th>
                      <th style={{...thStyle, textAlign: 'right'}}>Cash Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.shifts?.length > 0 ? data.shifts.map((shift) => (
                      <tr key={shift.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 700 }}>{shift.user_name}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>{shift.user_role}</div>
                        </td>
                        <td style={tdStyle}>{new Date(shift.start_time).toLocaleTimeString()}</td>
                        <td style={tdStyle}>{shift.end_time ? new Date(shift.end_time).toLocaleTimeString() : '-'}</td>
                        <td style={tdStyle}>
                          <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: shift.status === 'active' ? '#f0fdf4' : '#f1f5f9', color: shift.status === 'active' ? '#10b981' : '#64748b', textTransform: 'uppercase' }}>{shift.status}</span>
                        </td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 700}}>{shift.sales?.total_orders || 0}</td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 800, color: '#10b981'}}>₹{shift.sales?.total_revenue?.toFixed(2)}</td>
                        <td style={{...tdStyle, textAlign: 'right'}}>
                          <div style={{ fontSize: '12px' }}>Open: ₹{shift.start_cash}</div>
                          {shift.end_cash !== null && <div style={{ fontSize: '12px', fontWeight: 600 }}>Close: ₹{shift.end_cash}</div>}
                        </td>
                      </tr>
                    )) : <tr><td colSpan="7" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>No shift records found for this date.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {reportType !== 'shift' && viewMode === 'dashboard' && (
                <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', padding: '24px', borderRadius: '20px', color: 'white', boxShadow: '0 10px 20px -5px rgba(99, 102, 241, 0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, opacity: 0.9 }}>Total Sales</span>
                      <DollarSign size={20} />
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800 }}>₹{(sales.total_revenue || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', padding: '24px', borderRadius: '20px', color: 'white', boxShadow: '0 10px 20px -5px rgba(239, 68, 68, 0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, opacity: 0.9 }}>Total Expenses</span>
                      <TrendingDown size={20} />
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800 }}>₹{(sales.total_expenses || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '24px', borderRadius: '20px', color: 'white', boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, opacity: 0.9 }}>Net Revenue</span>
                      <TrendingUp size={20} />
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800 }}>₹{(sales.net_revenue || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', padding: '24px', borderRadius: '20px', color: 'white', boxShadow: '0 10px 20px -5px rgba(245, 158, 11, 0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, opacity: 0.9 }}>Total Orders</span>
                      <ShoppingCart size={20} />
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800 }}>{(sales.total_orders || 0)}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px', marginBottom: '24px' }}>
                  {(reportType === 'weekly' || reportType === 'monthly') && (
                    <div style={{ gridColumn: 'span 12', background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: '400px' }}>
                      <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 800 }}>Revenue Trend</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyTrend}>
                          <defs><linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" tickFormatter={(str) => format(new Date(str), 'MMM d')} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                          <Area type="monotone" dataKey="total_revenue" stroke="#6366f1" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div style={{ gridColumn: 'span 5', background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: '420px' }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 800 }}>Sales by Category</h3>
                    {categorySales.length > 0 ? (
                      <ResponsiveContainer width="100%" height="95%">
                        <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                          <Pie data={categorySales} cx="50%" cy="45%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="total_revenue" nameKey="category_name" label={renderCustomizedLabel}>
                            {categorySales.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v) => `₹${v.toFixed(2)}`} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No data available</div>}
                  </div>

                  <div style={{ gridColumn: 'span 7', background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: '420px' }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 800 }}>Top Selling Items</h3>
                    {topItems.length > 0 ? (
                      <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={topItems} layout="vertical" margin={{ left: 10, right: 40 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="item_name" type="category" width={140} tick={{ fontSize: 13, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
                          <Tooltip formatter={(v) => [v, 'Quantity Sold']} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                          <Bar dataKey="total_quantity" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={24} label={{ position: 'right', fill: '#64748b', fontSize: 12, fontWeight: 700 }} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No data available</div>}
                  </div>

                  <div style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      {['Cash', 'Card', 'UPI'].map(m => {
                          const val = sales[m.toLowerCase() + '_amount'] || 0;
                          const total = (sales.cash_amount || 0) + (sales.card_amount || 0) + (sales.upi_amount || 0);
                          const pct = total > 0 ? (val / total * 100).toFixed(0) : 0;
                          return (
                              <div key={m} style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontWeight: 600 }}>
                                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: PAYMENT_COLORS[m] }}></div>
                                          {m}
                                      </div>
                                      <span style={{ fontSize: '12px', fontWeight: 800, color: PAYMENT_COLORS[m], background: `${PAYMENT_COLORS[m]}15`, padding: '2px 8px', borderRadius: '10px' }}>{pct}%</span>
                                  </div>
                                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b' }}>₹{val.toLocaleString()}</div>
                                  <div style={{ marginTop: '10px', height: '6px', borderRadius: '3px', background: '#f1f5f9', overflow: 'hidden' }}>
                                      <div style={{ width: `${pct}%`, height: '100%', background: PAYMENT_COLORS[m], borderRadius: '3px' }}></div>
                                  </div>
                              </div>
                          )
                      })}
                  </div>
                </div>

                <div style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', marginBottom: '40px' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{reportType === 'daily' ? '📋 Recent Orders' : '📅 Breakdown'}</h3>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8fafc' }}>
                            {reportType === 'daily' ? (
                                <tr>
                                    <th style={thStyle}>Order #</th>
                                    <th style={thStyle}>Time</th>
                                    <th style={thStyle}>Type</th>
                                    <th style={thStyle}>Status</th>
                                    <th style={thStyle}>Payment</th>
                                    <th style={{...thStyle, textAlign: 'right'}}>Amount</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th style={thStyle}>Date</th>
                                    <th style={thStyle}>Orders</th>
                                    <th style={{...thStyle, textAlign: 'right'}}>Tax</th>
                                    <th style={{...thStyle, textAlign: 'right'}}>Revenue</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {reportType === 'daily' ? (
                                orders.length > 0 ? orders.slice(0, 10).map(order => (
                                    <tr key={order.id} onClick={() => setSelectedOrder(order)} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                                        <td style={{...tdStyle, fontWeight: 700, color: '#6366f1'}}>#{order.order_number}</td>
                                        <td style={tdStyle}>{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                        <td style={{...tdStyle, textTransform: 'capitalize'}}>{order.order_type.replace('_', ' ')}</td>
                                        <td style={tdStyle}><span style={{ padding: '4px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: order.status === 'completed' ? '#f0fdf4' : '#fef2f2', color: order.status === 'completed' ? '#10b981' : '#ef4444' }}>{order.status}</span></td>
                                        <td style={tdStyle}><span style={{ fontWeight: 600 }}>{order.payment_method?.toUpperCase()}</span></td>
                                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 800}}>₹{order.total_amount.toFixed(2)}</td>
                                    </tr>
                                )) : <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No orders found</td></tr>
                            ) : (
                                dailyTrend.map((day, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{...tdStyle, fontWeight: 600}}>{format(new Date(day.date), 'MMM d, yyyy')}</td>
                                        <td style={tdStyle}>{day.total_orders}</td>
                                        <td style={{...tdStyle, textAlign: 'right'}}>₹{day.total_tax.toFixed(2)}</td>
                                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 800, color: '#10b981'}}>₹{day.total_revenue.toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                </>
            )}

            {reportType !== 'shift' && viewMode === 'detailed' && (
                <div style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0 12px', flex: 1, maxWidth: '400px' }}>
                            <Search size={18} style={{ color: '#94a3b8' }} />
                            <input type="text" placeholder="Search orders, items, customers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', padding: '12px 10px', width: '100%', outline: 'none', fontSize: '14px' }} />
                        </div>
                        <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', fontWeight: 600 }}>
                            <option value="all">All Payments</option><option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option>
                        </select>
                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', fontWeight: 600 }}>
                            <option value="all">All Types</option><option value="dine_in">Dine In</option><option value="takeaway">Takeaway</option><option value="delivery">Delivery</option>
                        </select>
                        <div style={{ marginLeft: 'auto', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>{filteredData.length} Records</div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th style={thStyle}>Order #</th>
                                    <th style={thStyle}>Time</th>
                                    <th style={thStyle}>Item</th>
                                    <th style={{...thStyle, textAlign: 'center'}}>Qty</th>
                                    <th style={{...thStyle, textAlign: 'right'}}>Amount</th>
                                    <th style={thStyle}>Customer</th>
                                    <th style={thStyle}>Type</th>
                                    <th style={thStyle}>Payment</th>
                                    <th style={thStyle}>Cashier</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{...tdStyle, fontWeight: 700, color: '#6366f1'}}>#{row.order_number}</td>
                                        <td style={tdStyle}>{row.order_time}</td>
                                        <td style={{...tdStyle, fontWeight: 500}}>{row.item_name}</td>
                                        <td style={{...tdStyle, textAlign: 'center', fontWeight: 600}}>{row.quantity}</td>
                                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 800}}>₹{row.item_total?.toFixed(2)}</td>
                                        <td style={tdStyle}>{row.customer_name || '-'}</td>
                                        <td style={{...tdStyle, textTransform: 'capitalize'}}>{row.order_type?.replace('_', ' ')}</td>
                                        <td style={tdStyle}><span style={{ fontWeight: 600 }}>{row.payment_method?.toUpperCase()}</span></td>
                                        <td style={tdStyle}>{row.cashier_name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div style={{ padding: '20px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '15px', alignItems: 'center' }}>
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}><ChevronLeft size={18} /></button>
                            <span style={{ fontWeight: 700, fontSize: '14px' }}>Page {currentPage} of {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}><ChevronRight size={18} /></button>
                        </div>
                    )}
                </div>
            )}
          </>
        )}
      </div>
      {selectedOrder && <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  );
};

export default ReportsPage;
