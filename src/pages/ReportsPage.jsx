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
  FileSpreadsheet,
  XCircle,
  PieChart as PieChartIcon,
  Search,
  Filter,
  Clock,
  User,
  List,
  CreditCard,
  LayoutDashboard,
  Table as TableIcon
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
             <div style={{ fontWeight: '500' }}>{new Date(order.created_at || (order.order_date ? order.order_date + ' ' + order.order_time : new Date())).toLocaleString()}</div>
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
             <div style={{ fontWeight: '500', textTransform: 'capitalize' }}>{order.status || 'Completed'}</div>
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
                   <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{(item.price || item.unit_price || (item.item_total/item.quantity)) * item.quantity}</td>
                 </tr>
               ))}
               {!order.items && order.item_name && (
                   // Fallback for flat detailed data structure if needed
                   <tr>
                       <td style={{ padding: '8px 12px' }}>{order.item_name}</td>
                       <td style={{ padding: '8px 12px', textAlign: 'center' }}>{order.quantity}</td>
                       <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{order.item_total}</td>
                   </tr>
               )}
             </tbody>
           </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '18px', fontWeight: 'bold', borderTop: '1px solid #eee', paddingTop: '16px' }}>
           <span>Total Amount</span>
           <span style={{ color: '#27ae60' }}>₹{(order.total_amount || order.item_total || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

const ReportsPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reportType, setReportType] = useState('daily'); // 'daily', 'weekly', 'monthly'
  const [data, setData] = useState(null);
  const [detailedData, setDetailedData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // View Control
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' | 'detailed'

  // Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterType, setFilterType] = useState('all');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Custom Range State
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  useEffect(() => {
    loadReport();
  }, [selectedDate, reportType, startDate, endDate]);

  // Reset pagination when filters change
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
        
        // Always fetch detailed data for daily view to support the toggle
        const details = await window.electronAPI.invoke('reports:dailyDetailed', { date: dateStr });
        setDetailedData(details || []);

      } else if (reportType === 'weekly') {
        const weekStart = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        result = await window.electronAPI.invoke('reports:weekly', { startDate: weekStart });
        setDetailedData([]); // Reset detailed data for now as it's not supported for weekly yet
      } else if (reportType === 'monthly') {
        const monthStr = format(selectedDate, 'yyyy-MM');
        result = await window.electronAPI.invoke('reports:monthly', { month: monthStr });
        setDetailedData([]); // Reset detailed data
      } else if (reportType === 'shift') {
        dateStr = format(selectedDate, 'yyyy-MM-dd');
        const shiftResult = await window.electronAPI.invoke('shifts:getByDate', { date: dateStr });
        result = { shifts: shiftResult.shifts || [] };
        setDetailedData([]);
      } else if (reportType === 'custom') {
        const startStr = format(startDate, 'yyyy-MM-dd');
        const endStr = format(endDate, 'yyyy-MM-dd');
        result = await window.electronAPI.invoke('reports:custom', { startDate: startStr, endDate: endStr });
        setDetailedData([]); // Detailed data not yet implemented for custom range list view
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
        'Report Period': FormatDateRange(),
        'Total Revenue (₹)': (data.sales?.total_revenue || 0).toFixed(2),
        'Total Expenses (₹)': (data.sales?.total_expenses || 0).toFixed(2),
        'Net Revenue (₹)': (data.sales?.net_revenue || 0).toFixed(2),
        'Total Orders': data.sales?.total_orders || 0,
        'Avg Order Value (₹)': data.sales?.total_orders ? (data.sales.total_revenue / data.sales.total_orders).toFixed(2) : '0.00',
        'Total Tax (₹)': (data.sales?.total_tax || 0).toFixed(2),
        'Total Discount (₹)': (data.sales?.total_discount || 0).toFixed(2),
        'Cash Sales (₹)': (data.sales?.cash_amount || 0).toFixed(2),
        'Card Sales (₹)': (data.sales?.card_amount || 0).toFixed(2),
        'UPI Sales (₹)': (data.sales?.upi_amount || 0).toFixed(2),
      }];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      summarySheet['!cols'] = Array(9).fill({ wch: 20 });
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

      // 2. Orders Sheet — one row per unique order with full details
      if (detailedData && detailedData.length > 0) {
        const orderMap = new Map();
        detailedData.forEach(d => {
          if (!orderMap.has(d.order_number)) {
            orderMap.set(d.order_number, {
              'Order #': d.order_number,
              'Date': d.order_date,
              'Time': d.order_time,
              'Status': d.status || 'completed',
              'Order Type': (d.order_type || '').replace('_', ' '),
              'Table No': d.table_number || '-',
              'Customer Name': d.customer_name || 'Walk-in',
              'Customer Phone': d.customer_phone || '-',
              'Payment Method': (d.payment_method || '').toUpperCase(),
              'Tax (₹)': d.tax_amount ? Number(d.tax_amount).toFixed(2) : '-',
              'Discount (₹)': d.discount_amount ? Number(d.discount_amount).toFixed(2) : '-',
              'Order Total (₹)': d.order_total ? Number(d.order_total).toFixed(2) : '-',
              'Cashier': d.cashier_name,
            });
          }
        });
        const ordersSheet = XLSX.utils.json_to_sheet(Array.from(orderMap.values()));
        ordersSheet['!cols'] = Array(14).fill({ wch: 18 });
        XLSX.utils.book_append_sheet(wb, ordersSheet, 'Orders');
      }

      // 3. Itemized Details — every item row with unit price, addons, totals
      if (detailedData && detailedData.length > 0) {
        const itemRows = detailedData.map(d => {
          let addonStr = '-';
          try {
            if (d.addons) {
              const parsed = typeof d.addons === 'string' ? JSON.parse(d.addons) : d.addons;
              if (Array.isArray(parsed) && parsed.length > 0) {
                addonStr = parsed.map(a => `${a.name || a.addon_name} (₹${a.price || a.addon_price || 0})`).join(', ');
              }
            }
          } catch(e) { /* ignore */ }
          return {
            'Order #': d.order_number,
            'Date': d.order_date,
            'Time': d.order_time,
            'Item Name': d.item_name,
            'Qty': d.quantity,
            'Unit Price (₹)': d.unit_price ? Number(d.unit_price).toFixed(2) : '-',
            'Item Total (₹)': Number(d.item_total).toFixed(2),
            'Add-ons': addonStr,
            'Customer Name': d.customer_name || 'Walk-in',
            'Customer Phone': d.customer_phone || '-',
            'Order Type': (d.order_type || '').replace('_', ' '),
            'Payment': (d.payment_method || '').toUpperCase(),
            'Cashier': d.cashier_name,
          };
        });
        const itemSheet = XLSX.utils.json_to_sheet(itemRows);
        itemSheet['!cols'] = Array(13).fill({ wch: 18 });
        XLSX.utils.book_append_sheet(wb, itemSheet, 'Itemized Details');
      }

      // 4. Customer Directory — unique customers who ordered that day
      if (detailedData && detailedData.length > 0) {
        const custMap = new Map();
        detailedData.forEach(d => {
          const key = d.customer_phone || d.customer_name || 'walk-in';
          if (!custMap.has(key)) {
            custMap.set(key, { name: d.customer_name || 'Walk-in', phone: d.customer_phone || '-', orders: new Set(), totalSpent: 0 });
          }
          custMap.get(key).orders.add(d.order_number);
          // Only add order_total once per order
        });
        // Calculate total spent per customer from unique orders
        const orderTotals = new Map();
        detailedData.forEach(d => {
          if (!orderTotals.has(d.order_number)) orderTotals.set(d.order_number, { total: d.order_total || 0, custKey: d.customer_phone || d.customer_name || 'walk-in' });
        });
        orderTotals.forEach(v => {
          if (custMap.has(v.custKey)) custMap.get(v.custKey).totalSpent += Number(v.total) || 0;
        });
        const custRows = Array.from(custMap.values()).map(c => ({
          'Customer Name': c.name,
          'Phone': c.phone,
          'No. of Orders': c.orders.size,
          'Total Spent (₹)': c.totalSpent.toFixed(2),
        }));
        const custSheet = XLSX.utils.json_to_sheet(custRows);
        custSheet['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(wb, custSheet, 'Customers');
      }

      // 5. Category & Top Items
      if (data.categorySales?.length > 0) {
        const catData = data.categorySales.map(c => ({ 'Category': c.category_name, 'Qty Sold': c.total_quantity, 'Revenue (₹)': Number(c.total_revenue).toFixed(2) }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(catData), 'Category Sales');
      }
      if (data.topItems?.length > 0) {
        const topItemsData = data.topItems.map(item => ({ 'Item': item.item_name, 'Qty Sold': item.total_quantity, 'Revenue (₹)': Number(item.total_revenue).toFixed(2) }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topItemsData), 'Top Items');
      }
      if (data.dailyTrend?.length > 0) {
        const trendData = data.dailyTrend.map(d => ({ 'Date': d.date, 'Revenue (₹)': Number(d.total_revenue).toFixed(2), 'Orders': d.total_orders }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trendData), 'Daily Trend');
      }
      
      const fileName = `${reportType}_Report_${format(selectedDate, 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      alert('Report exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export: ' + error.message);
    }
  };

  // --- Filtering Logic for Detailed View ---
  const filteredData = useMemo(() => {
    if (!detailedData) return [];
    
    return detailedData.filter(item => {
      // 1. Search Filter
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = 
        !searchTerm || 
        item.order_number?.toLowerCase().includes(searchLower) ||
        item.customer_name?.toLowerCase().includes(searchLower) ||
        item.item_name?.toLowerCase().includes(searchLower) ||
        item.cashier_name?.toLowerCase().includes(searchLower);

      // 2. Payment Filter
      const matchPayment = filterPayment === 'all' || item.payment_method === filterPayment;

      // 3. Type Filter
      const matchType = filterType === 'all' || item.order_type === filterType;

      return matchSearch && matchPayment && matchType;
    });
  }, [detailedData, searchTerm, filterPayment, filterType]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

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
  
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#0ea5e9', '#14b8a6', '#f43f5e', '#a855f7'];
  const PAYMENT_COLORS = { Cash: '#10b981', Card: '#6366f1', UPI: '#f59e0b' };

  // --- Sub-report Routing ---
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');

  const SubReportWrapper = ({ children }) => (
    <div style={{ padding: '20px', height: 'calc(100vh - 64px)', marginTop: '64px', overflowY: 'auto', background: '#f8fafc' }}>
      {children}
    </div>
  );

  if (category === 'sales') return <SubReportWrapper><SalesReports /></SubReportWrapper>;
  if (category === 'inventory') return <SubReportWrapper><InventoryReports /></SubReportWrapper>;
  if (category === 'crm') return <SubReportWrapper><CRMReports /></SubReportWrapper>;
  if (category === 'staff') return <SubReportWrapper><StaffReports /></SubReportWrapper>;
  if (category === 'payment') return <SubReportWrapper><PaymentReports /></SubReportWrapper>;

  return (
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
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 className="text-xl font-bold text-gray-800">Reports</h1>
          
          {/* View Selector (Daily/Weekly/Monthly/Shift/Custom) */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
            {['daily', 'weekly', 'monthly', 'shift', 'custom'].map(type => (
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

          {/* Mode Switcher (Dashboard/Detailed) - Only visible in Daily mode for now */}
          {reportType === 'daily' && (
             <div style={{ display: 'flex', background: '#e0e7ff', borderRadius: '8px', padding: '4px', marginLeft: '12px' }}>
                <button
                    onClick={() => setViewMode('dashboard')}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: viewMode === 'dashboard' ? '#6366f1' : 'transparent',
                        color: viewMode === 'dashboard' ? 'white' : '#4f46e5',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <LayoutDashboard size={16} />
                    <span>Dashboard</span>
                </button>
                <button
                    onClick={() => setViewMode('detailed')}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: viewMode === 'detailed' ? '#6366f1' : 'transparent',
                        color: viewMode === 'detailed' ? 'white' : '#4f46e5',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <TableIcon size={16} />
                    <span>Detailed</span>
                </button>
             </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {reportType === 'custom' ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'white', padding: '4px 8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  value={format(startDate, 'yyyy-MM-dd')}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                  style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}
                />
              </div>
              <span style={{ color: '#64748b' }}>to</span>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  value={format(endDate, 'yyyy-MM-dd')}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                  style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}
                />
              </div>
            </div>
          ) : (
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
                  value={format(selectedDate, 'yyyy-MM-dd')} 
                  onChange={handleDateChange} 
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} 
                />
              </div>
              <button onClick={() => navigateDate('next')} className="icon-btn" style={{ padding: '8px' }}>
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          <button className="btn btn-secondary" onClick={exportToExcel} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Download size={18} />
            Download Excel
          </button>
        </div>
      </div>

      <div style={{ padding: '0 0 var(--spacing-6) 0', overflowY: 'auto', flex: 1 }}>
        {isLoading && !data ? (
          <div className="text-center p-8 text-gray-500">Loading...</div>
        ) : (
          <>
            {/* --- SHIFT REPORT VIEW --- */}
            {reportType === 'shift' && (
              <div className="card" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-4)' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={20} className="text-primary" />
                    Shift Reports
                  </h3>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--gray-200)' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Biller</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Start Time</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>End Time</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Status</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Orders</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Revenue</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Cash</th>
                         {/* <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Opened With</th> */}
                      </tr>
                    </thead>
                    <tbody>
                      {data?.shifts?.length > 0 ? (
                        data.shifts.map((shift) => (
                          <tr key={shift.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 500, color: '#1e293b' }}>{shift.user_name}</div>
                              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>{shift.user_role}</div>
                            </td>
                            <td style={{ padding: '12px 16px', color: '#475569', fontSize: '13px' }}>
                              {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#475569', fontSize: '13px' }}>
                              {shift.end_time ? new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: shift.status === 'active' ? '#dcfce7' : '#f1f5f9',
                                color: shift.status === 'active' ? '#166534' : '#64748b',
                                textTransform: 'uppercase'
                              }}>
                                {shift.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>{shift.sales?.total_orders || 0}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                              ₹{shift.sales?.total_revenue?.toLocaleString() || '0'}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>
                              <div style={{ fontSize: '11px' }}>Open: ₹{shift.opening_cash || 0}</div>
                              {shift.closing_cash !== null && <div style={{ fontSize: '11px' }}>Close: ₹{shift.closing_cash}</div>}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                            No shifts found for this date.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --- DASHBOARD VIEW --- */}
            {reportType !== 'shift' && viewMode === 'dashboard' && (
                <>
                {/* Stats Grid */}
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', color: 'white', boxShadow: '0 10px 40px rgba(99, 102, 241, 0.3)' }}>
                    <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.2)' }}><DollarSign size={24} /></div>
                    <div>
                    <div className="stat-value">₹{(sales.total_revenue || 0).toLocaleString()}</div>
                    <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Total Sales</div>
                    </div>
                </div>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)', color: 'white', boxShadow: '0 10px 40px rgba(239, 68, 68, 0.3)' }}>
                    <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.2)' }}><TrendingDown size={24} /></div>
                    <div>
                    <div className="stat-value">₹{(sales.total_expenses || 0).toLocaleString()}</div>
                    <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Total Expenses</div>
                    </div>
                </div>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', color: 'white', boxShadow: '0 10px 40px rgba(16, 185, 129, 0.3)' }}>
                    <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.2)' }}><TrendingUp size={24} /></div>
                    <div>
                    <div className="stat-value">₹{(sales.net_revenue !== undefined ? sales.net_revenue : (sales.total_revenue - (sales.total_expenses || 0))).toLocaleString()}</div>
                    <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Net Revenue</div>
                    </div>
                </div>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', color: 'white', boxShadow: '0 10px 40px rgba(245, 158, 11, 0.3)' }}>
                    <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.2)' }}><ShoppingCart size={24} /></div>
                    <div>
                    <div className="stat-value">{(sales.total_orders || 0)}</div>
                    <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Total Orders</div>
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
                            cy="45%"
                            innerRadius={70}
                            outerRadius={105}
                            paddingAngle={4}
                            dataKey="total_revenue"
                            nameKey="category_name"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                            >
                            {categorySales.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={2} />
                            ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value, name) => [`₹${Number(value).toFixed(2)}`, name]}
                              contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '10px 14px' }}
                            />
                        </PieChart>
                        </ResponsiveContainer>
                    ) : <div className="empty-state"><p className="text-muted">No category data</p></div>}
                    </div>
                </div>

                {/* Top Items (Bar Chart) */}
                <div className="card" style={{ gridColumn: 'span 8', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                    <div className="card-header" style={{ background: '#f8fafc', borderBottom: '1px solid var(--gray-200)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart3 size={20} style={{ color: '#6366f1' }} />
                        Top Selling Items
                    </h3>
                    </div>
                    <div className="card-body" style={{ padding: 'var(--spacing-4)', height: '350px' }}>
                    {topItems.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topItems} layout="vertical" margin={{ left: 10, right: 40, top: 10, bottom: 10 }}>
                            <defs>
                              <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity={1}/>
                                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.85}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="item_name" 
                                type="category" 
                                width={120} 
                                tick={{ fontSize: 12, fill: '#334155', fontWeight: 500 }} 
                                interval={0}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip 
                                cursor={{fill: 'rgba(99,102,241,0.05)'}}
                                formatter={(value, name) => [name === 'total_quantity' ? `${value} sold` : `₹${Number(value).toFixed(2)}`, name === 'total_quantity' ? 'Quantity' : 'Revenue']}
                                contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '10px 14px' }}
                            />
                            <Bar 
                                dataKey="total_quantity" 
                                fill="url(#barGrad)" 
                                radius={[0, 8, 8, 0]} 
                                barSize={22}
                                background={{ fill: '#f1f5f9', radius: [0, 8, 8, 0] }}
                                label={{ position: 'right', fill: '#475569', fontSize: 12, fontWeight: 600, formatter: (v) => v }}
                            />
                        </BarChart>
                        </ResponsiveContainer>
                    ) : <div className="empty-state"><p className="text-muted">No sales data</p></div>}
                    </div>
                </div>

                {/* Payment Methods — Card Grid */}
                <div style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {paymentData.length > 0 ? paymentData.map((pm) => {
                    const total = paymentData.reduce((s, p) => s + p.value, 0);
                    const pct = total > 0 ? ((pm.value / total) * 100).toFixed(0) : 0;
                    const color = PAYMENT_COLORS[pm.name] || '#6366f1';
                    return (
                      <div key={pm.name} className="card" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '10px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <CreditCard size={20} style={{ color }} />
                            </div>
                            <span style={{ fontWeight: 600, fontSize: '15px', color: '#334155' }}>{pm.name}</span>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 600, color, background: `${color}15`, padding: '4px 10px', borderRadius: '20px' }}>{pct}%</span>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>₹{pm.value.toFixed(2)}</div>
                        <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: '#f1f5f9', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', borderRadius: '4px', background: `linear-gradient(90deg, ${color}, ${color}cc)`, transition: 'width 0.8s ease' }} />
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="card" style={{ gridColumn: 'span 3', padding: '40px', textAlign: 'center' }}>
                      <p className="text-muted">No payment data</p>
                    </div>
                  )}
                </div>
                </div>

                {/* Orders Table (Summary/Recent Orders style for dashboard) */}
                <div className="card" style={{ marginTop: 'var(--spacing-6)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                    <div className="card-header" style={{ background: '#f8fafc', borderBottom: '1px solid var(--gray-200)' }}>
                    <h3>
                        {reportType === 'daily' ? '📋 Recent Orders' : '📅 Breakdown'}
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
                                orders.slice(0, 10).map(order => ( // Show only top 10 on dashboard
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


                {/* Add-on Statistics (Only for Custom Reports) */}
                {(reportType === 'custom' && data?.topAddons?.length > 0) && (
                    <div className="card" style={{ marginTop: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-4)' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <List size={20} className="text-secondary" />
                        Add-on Statistics
                        </h3>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#10b981' }}>
                            Total Revenue: ₹{data.sales?.total_addon_revenue?.toLocaleString() || '0'}
                        </div>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--gray-200)' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Add-on Name</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Quantity</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.topAddons.map((addon, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1e293b' }}>{addon.name}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#475569' }}>{addon.quantity}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                                ₹{addon.revenue?.toLocaleString()}
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                    </div>
                )}
                </>
            )}

            {/* --- DETAILED REPORT VIEW --- */}
            {reportType !== 'shift' && viewMode === 'detailed' && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                    {/* Filter Bar */}
                    <div className="card-header" style={{ background: '#f8fafc', borderBottom: '1px solid var(--gray-200)', padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                             {/* Search */}
                            <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0 12px', flex: 1, maxWidth: '300px' }}>
                                <Search size={18} className="text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search order, item, customer..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ border: 'none', padding: '10px 0', marginLeft: '8px', width: '100%', outline: 'none' }}
                                />
                            </div>

                            {/* Payment Filter */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Filter size={16} className="text-gray-500" />
                                <select 
                                    value={filterPayment} 
                                    onChange={(e) => setFilterPayment(e.target.value)}
                                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                                >
                                    <option value="all">All Payments</option>
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="upi">UPI</option>
                                </select>
                            </div>

                            {/* Type Filter */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <List size={16} className="text-gray-500" />
                                <select 
                                    value={filterType} 
                                    onChange={(e) => setFilterType(e.target.value)}
                                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                                >
                                    <option value="all">All Types</option>
                                    <option value="dine_in">Dine In</option>
                                    <option value="takeaway">Takeaway</option>
                                    <option value="delivery">Delivery</option>
                                </select>
                            </div>
                            
                            <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#64748b' }}>
                                Showing {filteredData.length} records
                            </div>
                        </div>
                    </div>

                    {/* Detailed Data Table */}
                    <div className="table-container" style={{ flex: 1, overflow: 'auto' }}>
                        <table className="table" style={{ fontSize: '14px' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th>Order #</th>
                                    <th>Time</th>
                                    <th>Item</th>
                                    <th className="text-center">Qty</th>
                                    <th className="text-right">Price</th>
                                    <th>Customer</th>
                                    <th>Type</th>
                                    <th>Pay Mode</th>
                                    <th>Cashier</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.length > 0 ? (
                                    paginatedData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td style={{ fontWeight: 600, color: '#4f46e5' }}>#{row.order_number}</td>
                                            <td>{row.order_time}</td>
                                            <td>{row.item_name}</td>
                                            <td className="text-center">{row.quantity}</td>
                                            <td className="text-right">₹{row.item_total}</td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span>{row.customer_name || '-'}</span>
                                                    {row.customer_phone && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{row.customer_phone}</span>}
                                                </div>
                                            </td>
                                            <td style={{ textTransform: 'capitalize' }}>{row.order_type}</td>
                                            <td style={{ textTransform: 'capitalize' }}>
                                                <span className={`badge badge-gray`}>{row.payment_method}</span>
                                            </td>
                                            <td>{row.cashier_name}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={9} className="text-center p-8 text-gray-500">
                                            No data matches your filters
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="card-footer" style={{ padding: '16px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="icon-btn"
                                style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 500 }}>
                                Page {currentPage} of {totalPages}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="icon-btn"
                                style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            )}
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
