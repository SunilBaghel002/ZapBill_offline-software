import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Clock,
  ArrowRight,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  XCircle,
  Minus,
  Wallet,
  BarChart3,
  ShoppingBag,
  ArrowUpRight,
  Plus
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format, subDays } from 'date-fns';
import { useAuthStore } from '../stores/authStore';

// StatCard Component
// StatCard Component
const StatCard = ({ title, value, trend, trendValue, icon: Icon, color }) => {
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';
  const isNeutral = trend === 'neutral';
  
  const colors = {
    primary: { bg: '#e0f2fe', icon: '#0096FF', text: '#0369a1', glow: 'rgba(0, 150, 255, 0.15)' },
    success: { bg: '#dcfce7', icon: '#10b981', text: '#15803d', glow: 'rgba(16, 185, 129, 0.15)' },
    warning: { bg: '#fef3c7', icon: '#f59e0b', text: '#92400e', glow: 'rgba(245, 158, 11, 0.15)' },
    danger: { bg: '#fee2e2', icon: '#ef4444', text: '#991b1b', glow: 'rgba(239, 68, 68, 0.15)' },
    info: { bg: '#e0e7ff', icon: '#6366f1', text: '#3730a3', glow: 'rgba(99, 102, 241, 0.15)' }
  };

  const theme = colors[color] || colors.primary;

  return (
    <div className="card hover-shadow" style={{ 
      padding: '20px', 
      borderRadius: '24px', 
      background: 'white',
      border: '1px solid #f1f5f9',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'default',
      minHeight: '120px'
    }}>
      {/* Icon Box */}
      <div style={{ 
        width: '64px', 
        height: '64px', 
        borderRadius: '20px', 
        background: theme.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.icon,
        boxShadow: `0 12px 24px -6px ${theme.glow}`,
        flexShrink: 0,
        zIndex: 2
      }}>
        <Icon size={32} strokeWidth={2} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, zIndex: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {title}
          </span>
          <div style={{ 
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '800',
            background: isPositive ? '#dcfce7' : isNegative ? '#fee2e2' : '#f1f5f9',
            color: isPositive ? '#15803d' : isNegative ? '#b91c1c' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            border: isPositive ? '1px solid #bbf7d0' : isNegative ? '1px solid #fecaca' : '1px solid #e2e8f0'
          }}>
            {isPositive ? <TrendingUp size={14} /> : isNegative ? <TrendingDown size={14} /> : <Minus size={14} />}
            {trendValue}%
          </div>
        </div>
        <div style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b', lineHeight: '1' }}>
          {value}
        </div>
      </div>

      {/* Background Decorator */}
      <div style={{ 
        position: 'absolute', 
        right: '-10px', 
        bottom: '-10px', 
        opacity: 0.05, 
        transform: 'rotate(-15deg)',
        color: theme.icon,
        zIndex: 1
      }}>
        <Icon size={110} />
      </div>
    </div>
  );
};



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

// Order Card Component
const OrderCard = ({ order, onClick }) => {
  const statusColors = {
    active: { bg: '#e0f2fe', text: '#0369a1', icon: Clock },
    pending: { bg: '#fef3c7', text: '#d97706', icon: AlertCircle },
    preparing: { bg: '#e0f2fe', text: '#0369a1', icon: Clock },
    ready: { bg: '#dcfce7', text: '#15803d', icon: CheckCircle },
    completed: { bg: '#dcfce7', text: '#15803d', icon: CheckCircle },
    cancelled: { bg: '#fee2e2', text: '#b91c1c', icon: XCircle },
    held: { bg: '#fef3c7', text: '#d97706', icon: AlertCircle }
  };

  const status = statusColors[order.status] || statusColors.active;
  const StatusIcon = status.icon;
  
  const orderDate = new Date(order.created_at);
  const today = new Date();
  const isToday = orderDate.toDateString() === today.toDateString();
  const dateDisplay = isToday ? 'Today' : orderDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <div 
      className="card hover-shadow" 
      onClick={() => onClick(order)}
      style={{
        padding: '0',
        borderRadius: '16px',
        border: '1px solid #f1f5f9',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>#{order.order_number}</h4>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {order.order_type?.replace('_', ' ')} • {dateDisplay}
            </span>
          </div>
          <span style={{ 
            padding: '4px 10px', 
            borderRadius: '20px', 
            background: status.bg, 
            color: status.text, 
            fontSize: '11px', 
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            textTransform: 'uppercase'
          }}>
            <StatusIcon size={12} />
            {order.status}
          </span>
        </div>
        
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>{order.customer_name || 'Walk-in Customer'}</div>
          <div style={{ color: '#64748b', fontSize: '13px' }}>
            {order.items?.slice(0, 2).map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{item.quantity}x {item.item_name || item.name}</span>
              </div>
            ))}
            {order.items?.length > 2 && (
              <div style={{ color: '#0096FF', fontWeight: '600', marginTop: '4px', fontSize: '12px' }}>
                +{order.items.length - 2} more items
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div style={{ 
        padding: '12px 16px', 
        background: '#f8fafc', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b' }}>
          <Clock size={14} />
          {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div style={{ fontSize: '18px', fontWeight: '900', color: '#0096FF' }}>
          ₹{order.total_amount?.toFixed(0)}
        </div>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayExpenses: 0,
    openingBalance: 0,
    netProfit: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    revenueTrend: { direction: 'neutral', value: 0 },
    ordersTrend: { direction: 'neutral', value: 0 },
    avgOrderTrend: { direction: 'neutral', value: 0 },
    activeOrdersTrend: { direction: 'neutral', value: 0 }
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [topItems, setTopItems] = useState([]);

  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);



  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      
      let todayReport = null;
      let yesterdayReport = null;
      let todaySales = {};
      let yesterdaySales = {};
      let revenueTrend = { direction: 'neutral', value: 0 };
      let ordersTrend = { direction: 'neutral', value: 0 };

      // Helper to calculate trend
      const calculateTrend = (current, previous) => {
        const currVal = parseFloat(current) || 0;
        const prevVal = parseFloat(previous) || 0;

        if (prevVal === 0) {
          return { direction: currVal > 0 ? 'up' : 'neutral', value: currVal > 0 ? 100 : 0 };
        }
        
        const change = ((currVal - prevVal) / prevVal) * 100;
        return {
          direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
          value: Math.abs(change).toFixed(1)
        };
      };

      if (user?.role === 'biller' || user?.role === 'cashier') {
        // --- BILLER VIEW ---
        // Fetch active shift or last closed shift for today
        const shiftStatus = await window.electronAPI.invoke('shifts:getStatus', { userId: user.id });
        
        if (shiftStatus.success && shiftStatus.shift) {
          const reportResult = await window.electronAPI.invoke('shifts:getReport', { shiftId: shiftStatus.shift.id });
          if (reportResult.success && reportResult.report) {
            todayReport = reportResult.report;
            todaySales = todayReport.sales || {};
          }
        } else {
             // Try to get daily report for this biller specifically
             todayReport = await window.electronAPI.invoke('reports:billerDaily', { date: today, userId: user.id });
             todaySales = todayReport?.sales || todayReport || {};
        }

      } else {
        // --- ADMIN VIEW ---
        // Fetch global today's and yesterday's reports for comparison
        const [todayRes, yesterdayRes] = await Promise.all([
          window.electronAPI.invoke('reports:daily', { date: today }),
          window.electronAPI.invoke('reports:daily', { date: yesterday })
        ]);

        todayReport = todayRes;
        yesterdayReport = yesterdayRes;

        todaySales = todayReport?.sales || {};
        yesterdaySales = yesterdayReport?.sales || {};

        // Calculate Trends (Only for Admin)
        revenueTrend = calculateTrend(todaySales.total_revenue, yesterdaySales.total_revenue);
        ordersTrend = calculateTrend(todaySales.total_orders, yesterdaySales.total_orders);
      }

      // Common Data: Recent Orders
      const recentOrdersData = await window.electronAPI.invoke('order:getRecent', { limit: 8 });

      // Active Orders count from recent list (approximate)
      let activeCount = 0;
      if (Array.isArray(recentOrdersData)) {
        setRecentOrders(recentOrdersData);
        activeCount = recentOrdersData.filter(o => 
          ['active', 'pending', 'preparing', 'ready', 'held'].includes(o.status)
        ).length;
      }

      setStats({
        todayRevenue: todaySales.total_revenue || 0,
        todayExpenses: todaySales.total_expenses || 0,
        openingBalance: todaySales.opening_balance || 0,
        netProfit: todaySales.net_revenue || 0,
        totalOrders: todaySales.total_orders || 0,
        activeOrders: activeCount,
        revenueTrend,
        ordersTrend,
        activeOrdersTrend: { direction: 'neutral', value: 0 } 
      });

      // Fetch weekly trend for chart
      const weekStart = format(subDays(new Date(), 6), 'yyyy-MM-dd');
      const weeklyReport = await window.electronAPI.invoke('reports:weekly', { startDate: weekStart });
      if (weeklyReport && weeklyReport.dailyTrend) {
        setChartData(weeklyReport.dailyTrend);
      }
      
      if (todayReport && todayReport.topItems) {
        setTopItems(todayReport.topItems.slice(0, 5));
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="page-header">
           <div className="skeleton" style={{ height: '32px', width: '200px', marginBottom: '8px' }}></div>
           <div className="skeleton" style={{ height: '20px', width: '300px' }}></div>
        </div>
        
        <div className="stats-grid">
           {[1, 2, 3, 4].map(i => (
             <div key={i} className="stat-card" style={{ height: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                   <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '8px' }}></div>
                   <div className="skeleton" style={{ width: '20px', height: '20px', borderRadius: '50%' }}></div>
                </div>
                <div>
                   <div className="skeleton" style={{ width: '80px', height: '16px', marginBottom: '8px' }}></div>
                   <div className="skeleton" style={{ width: '120px', height: '28px' }}></div>
                </div>
             </div>
           ))}
        </div>

        <div className="dashboard-section">
           <div className="section-header">
              <div className="skeleton" style={{ width: '150px', height: '24px' }}></div>
           </div>
           <div className="orders-grid">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton" style={{ height: '180px', borderRadius: '12px' }}></div>
              ))}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ background: '#f8fafc' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b' }}>Dashboard</h1>
          <p className="page-subtitle" style={{ color: '#64748b', fontSize: '15px' }}>Welcome back, <span style={{ color: '#0096FF', fontWeight: '700' }}>{user?.full_name || user?.username}</span>! Here's your restaurant's overview.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={loadDashboardData} style={{ borderRadius: '12px', padding: '10px 16px' }}>
            <Clock size={18} /> Refresh
          </button>
          <a href="/pos" className="btn btn-primary" style={{ borderRadius: '12px', padding: '10px 20px', fontWeight: '700' }}>
            <Plus size={18} /> New Order
          </a>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
        gap: '24px',
        marginBottom: '32px'
      }}>
        <StatCard
          title="Opening Balance"
          value={`₹${(stats.openingBalance || 0).toLocaleString()}`}
          trend="neutral"
          trendValue={0}
          icon={Wallet}
          color="warning"
        />
        <StatCard
          title="Today's Sales"
          value={`₹${stats.todayRevenue.toLocaleString()}`}
          trend={stats.revenueTrend.direction}
          trendValue={stats.revenueTrend.value}
          icon={ShoppingBag}
          color="primary"
        />
        <StatCard
          title="Net Profit"
          value={`₹${stats.netProfit.toLocaleString()}`}
          trend={stats.revenueTrend.direction} 
          trendValue={stats.revenueTrend.value}
          icon={DollarSign}
          color="success"
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          trend={stats.ordersTrend.direction}
          trendValue={stats.ordersTrend.value}
          icon={BarChart3}
          color="info"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px', marginBottom: '32px' }}>
        {/* Sales Trend Chart */}
        <div className="card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>Sales Trend (Last 7 Days)</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: '700', fontSize: '14px' }}>
              <TrendingUp size={16} /> 12% increase
            </div>
          </div>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.length > 0 ? chartData : [
                {date: 'Mon', total_revenue: 0}, {date: 'Tue', total_revenue: 0}, 
                {date: 'Wed', total_revenue: 0}, {date: 'Thu', total_revenue: 0}, 
                {date: 'Fri', total_revenue: 0}, {date: 'Sat', total_revenue: 0}, 
                {date: 'Sun', total_revenue: 0}
              ]}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0096FF" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0096FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(str) => {
                    try { return format(new Date(str), 'MMM d'); } 
                    catch(e) { return str; }
                  }} 
                  tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: '500' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: '500' }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(v) => `₹${v}`} 
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                    padding: '12px' 
                  }} 
                  itemStyle={{ fontWeight: '800', color: '#0096FF' }}
                  labelStyle={{ fontWeight: '700', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="total_revenue" 
                  stroke="#0096FF" 
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                  strokeWidth={4}
                  dot={{ r: 4, fill: '#0096FF', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Items Section */}
        <div className="card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>Top Selling Items</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {topItems.length > 0 ? topItems.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px', 
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '800',
                  color: '#64748b'
                }}>
                  #{idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{item.item_name}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.total_quantity} units sold</div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#10b981' }}>
                  ₹{item.total_revenue?.toFixed(0)}
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                <BarChart3 size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p>No data yet</p>
              </div>
            )}
          </div>
          <a href="/reports?category=sales" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            marginTop: '24px',
            padding: '12px',
            borderRadius: '12px',
            background: '#0096FF10',
            color: '#0096FF',
            fontSize: '13px',
            fontWeight: '700',
            textDecoration: 'none'
          }}>
            Detailed Sales Report <ArrowUpRight size={16} />
          </a>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="dashboard-section">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className="section-title" style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b', margin: 0 }}>Recent Orders</h2>
          <a href="/orders" className="section-link" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            color: '#0096FF', 
            fontWeight: '700', 
            fontSize: '14px',
            textDecoration: 'none'
          }}>
            View All Orders <ArrowRight size={16} />
          </a>
        </div>
        <div className="orders-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '24px' 
        }}>
          {recentOrders.length > 0 ? (
            recentOrders.map(order => (
              <OrderCard key={order.id} order={order} onClick={setSelectedOrder} />
            ))
          ) : (
            <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '60px' }}>
              <ShoppingCart size={48} color="#cbd5e1" />
              <p style={{ marginTop: '16px', color: '#94a3b8', fontWeight: '600' }}>No orders placed today yet.</p>
            </div>
          )}
        </div>
      </div>
      {/* Order Details Modal */}
      <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  );
};

export default DashboardPage;
