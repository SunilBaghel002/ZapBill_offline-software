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
  Wallet
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useAuthStore } from '../stores/authStore';

// StatCard Component
const StatCard = ({ title, value, trend, trendValue, icon: Icon, color }) => {
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';
  const isNeutral = trend === 'neutral';
  
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <div className={`stat-card-icon ${color}`}>
          <Icon size={20} />
        </div>
        <button className="stat-card-menu">
          <MoreHorizontal size={16} />
        </button>
      </div>
      <div className="stat-card-content">
        <span className="stat-card-title">{title}</span>
        <span className="stat-card-value">{value}</span>
      </div>
      <div className={`stat-card-trend ${isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}`} style={{ color: isNeutral ? 'var(--gray-500)' : undefined }}>
        {isPositive && <TrendingUp size={14} />}
        {isNegative && <TrendingDown size={14} />}
        {isNeutral && <Minus size={14} />}
        <span>{trendValue}% from yesterday</span>
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
    active: 'info',
    pending: 'warning',
    preparing: 'info',
    ready: 'success',
    completed: 'success',
    cancelled: 'danger',
    held: 'warning'
  };

  const statusIcons = {
    active: Clock,
    pending: AlertCircle,
    preparing: Clock,
    ready: CheckCircle,
    completed: CheckCircle,
    cancelled: XCircle,
    held: AlertCircle
  };

  const StatusIcon = statusIcons[order.status] || AlertCircle;
  
  // Parse date
  const orderDate = new Date(order.created_at);
  const today = new Date();
  const isToday = orderDate.toDateString() === today.toDateString();
  const dateDisplay = isToday ? 'Today' : orderDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <div className="order-card" onClick={() => onClick(order)} 
        style={{ 
            cursor: 'pointer', 
            transition: 'all 0.2s ease', 
            border: '1px solid #eef2f6',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'; }}
    >
      <div className="order-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px dashed #f0f0f0' }}>
        <div className="order-card-info" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="order-card-number" style={{ fontWeight: '700', color: '#1a1a1a', fontSize: '15px' }}>#{order.order_number}</span>
          <span style={{ fontSize: '11px', color: '#888', background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px' }}>{dateDisplay}</span>
        </div>
        <span className={`order-card-status ${statusColors[order.status]}`} 
            style={{ 
                fontSize: '11px', 
                padding: '4px 8px', 
                borderRadius: '20px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
            }}>
          <StatusIcon size={12} />
          {order.status}
        </span>
      </div>
      <div className="order-card-body" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#555', marginBottom: '12px' }}>
            <div style={{ fontWeight: '600', color: '#333' }}>{order.customer_name || 'Walk-in'}</div>
            <div style={{ color: '#888' }}>{order.order_type.replace('_', ' ')}</div>
        </div>
        <div className="order-card-items" style={{ minHeight: '40px' }}>
          {order.items?.slice(0, 2).map((item, idx) => (
            <div key={idx} className="order-card-item" style={{ fontSize: '13px', color: '#666', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ fontWeight: '600', color: '#333', marginRight: '6px' }}>{item.quantity}x</span> 
              {item.item_name || item.name}
            </div>
          ))}
          {order.items?.length > 2 && (
            <div className="order-card-more" style={{ fontSize: '12px', color: '#3498db', marginTop: '4px' }}>+{order.items.length - 2} more items</div>
          )}
        </div>
      </div>
      <div className="order-card-footer" style={{ padding: '12px 16px', background: '#fafafa', borderTop: '1px solid #f0f0f0', borderRadius: '0 0 12px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="order-card-time" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#888' }}>
          <Clock size={14} />
          {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="order-card-total" style={{ fontWeight: '700', fontSize: '16px', color: '#27ae60' }}>₹{order.total_amount?.toFixed(0) || 0}</span>
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
            todaySales = reportResult.report.sales;
          }
        } else {
             // Try to get daily report for this biller specifically
             const billerReport = await window.electronAPI.invoke('reports:billerDaily', { date: today, userId: user.id });
             todaySales = billerReport || {};
        }

      } else {
        // --- ADMIN VIEW ---
        // Fetch global today's and yesterday's reports for comparison
        const [todayReport, yesterdayReport] = await Promise.all([
          window.electronAPI.invoke('reports:daily', { date: today }),
          window.electronAPI.invoke('reports:daily', { date: yesterday })
        ]);

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
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here's what's happening today.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
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
          icon={ShoppingCart}
          color="primary"
        />
        <StatCard
          title="Today's Expenses"
          value={`₹${stats.todayExpenses.toLocaleString()}`}
          trend="neutral"
          trendValue={0}
          icon={TrendingDown}
          color="danger"
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          trend={stats.ordersTrend.direction}
          trendValue={stats.ordersTrend.value}
          icon={Users}
          color="info"
        />
        <StatCard
          title="Net Profit"
          value={`₹${stats.netProfit.toLocaleString()}`}
          trend={stats.revenueTrend.direction} 
          trendValue={stats.revenueTrend.value}
          icon={DollarSign}
          color="success"
        />
      </div>

      {/* Recent Orders Section */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Recent Orders</h2>
          <a href="/orders" className="section-link">
            View all <ArrowRight size={16} />
          </a>
        </div>
        <div className="orders-grid">
          {recentOrders.length > 0 ? (
            recentOrders.map(order => (
              <OrderCard key={order.id} order={order} onClick={setSelectedOrder} />
            ))
          ) : (
            <div className="empty-state">
              <ShoppingCart size={48} />
              <p>No orders today</p>
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
