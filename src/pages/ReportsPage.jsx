import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  ShoppingCart,
  DollarSign,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, subDays, startOfWeek, addDays } from 'date-fns';

const ReportsPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reportType, setReportType] = useState('daily');
  const [dailyData, setDailyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [selectedDate, reportType]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      if (reportType === 'daily') {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const result = await window.electronAPI.invoke('reports:daily', { date: dateStr });
        setDailyData(result);
      } else {
        const weekStart = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const result = await window.electronAPI.invoke('reports:weekly', { startDate: weekStart });
        setWeeklyData(result);
      }
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateDate = (direction) => {
    const days = reportType === 'daily' ? 1 : 7;
    setSelectedDate(prev => 
      direction === 'prev' ? subDays(prev, days) : addDays(prev, days)
    );
  };

  const COLORS = ['var(--success-500)', 'var(--primary-500)', 'var(--secondary-500)'];

  const paymentData = dailyData?.sales ? [
    { name: 'Cash', value: dailyData.sales.cash_amount || 0 },
    { name: 'Card', value: dailyData.sales.card_amount || 0 },
    { name: 'UPI', value: dailyData.sales.upi_amount || 0 },
  ].filter(d => d.value > 0) : [];

  return (
    <div>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 'var(--spacing-6)'
      }}>
        <div>
          <h1>Sales Reports</h1>
          <p className="text-muted">View your sales analytics and insights</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
          <button 
            className={`btn ${reportType === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setReportType('daily')}
          >
            Daily
          </button>
          <button 
            className={`btn ${reportType === 'weekly' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setReportType('weekly')}
          >
            Weekly
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 'var(--spacing-4)',
        marginBottom: 'var(--spacing-6)'
      }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigateDate('prev')}>
          <ChevronLeft size={24} />
        </button>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--spacing-2)',
          padding: 'var(--spacing-2) var(--spacing-4)',
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          fontWeight: 600
        }}>
          <Calendar size={20} />
          {reportType === 'daily' 
            ? format(selectedDate, 'EEEE, MMMM d, yyyy')
            : `Week of ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d')} - ${format(addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}`
          }
        </div>
        <button 
          className="btn btn-ghost btn-icon" 
          onClick={() => navigateDate('next')}
          disabled={format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {isLoading ? (
        <div className="empty-state">
          <div className="loading-spinner" />
          <p className="mt-4">Loading report...</p>
        </div>
      ) : reportType === 'daily' ? (
        <DailyReport data={dailyData} paymentData={paymentData} />
      ) : (
        <WeeklyReport data={weeklyData} startDate={startOfWeek(selectedDate, { weekStartsOn: 1 })} />
      )}
    </div>
  );
};

// Daily Report Component
const DailyReport = ({ data, paymentData }) => {
  const sales = data?.sales || {};
  const orders = data?.orders || [];
  const topItems = data?.topItems || [];

  const COLORS = ['#22c55e', '#3b82f6', '#f97316'];

  return (
    <div>
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="stat-value">₹{(sales.total_revenue || 0).toFixed(2)}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <ShoppingCart size={24} />
          </div>
          <div>
            <div className="stat-value">{sales.total_orders || 0}</div>
            <div className="stat-label">Total Orders</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="stat-value">
              ₹{sales.total_orders ? (sales.total_revenue / sales.total_orders).toFixed(2) : '0.00'}
            </div>
            <div className="stat-label">Avg. Order Value</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '2fr 1fr', 
        gap: 'var(--spacing-6)',
        marginTop: 'var(--spacing-6)'
      }}>
        {/* Top Items */}
        <div className="card">
          <div className="card-header">
            <h3>Top Selling Items</h3>
          </div>
          <div className="card-body">
            {topItems.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topItems} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="item_name" type="category" width={120} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'total_quantity' ? value : `₹${value.toFixed(2)}`,
                      name === 'total_quantity' ? 'Quantity' : 'Revenue'
                    ]}
                  />
                  <Bar dataKey="total_quantity" fill="var(--primary-500)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: 'var(--spacing-6)' }}>
                <p className="text-muted">No sales data for this day</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="card">
          <div className="card-header">
            <h3>Payment Methods</h3>
          </div>
          <div className="card-body">
            {paymentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: 'var(--spacing-6)' }}>
                <p className="text-muted">No payment data</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card" style={{ marginTop: 'var(--spacing-6)' }}>
        <div className="card-header">
          <h3>Orders Today</h3>
        </div>
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Time</th>
                <th>Type</th>
                <th>Payment</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.length > 0 ? (
                orders.map(order => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 600 }}>#{order.order_number}</td>
                    <td>{new Date(order.created_at).toLocaleTimeString()}</td>
                    <td>{order.order_type.replace('_', ' ')}</td>
                    <td>
                      <span className="badge badge-gray">
                        {order.payment_method?.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-right" style={{ fontWeight: 600 }}>
                      ₹{order.total_amount.toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center text-muted" style={{ padding: 'var(--spacing-6)' }}>
                    No orders for this day
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Weekly Report Component
const WeeklyReport = ({ data, startDate }) => {
  // Create full week data with zeros for missing days
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = format(addDays(startDate, i), 'yyyy-MM-dd');
    const dayData = data.find(d => d.date === date);
    return {
      day: format(addDays(startDate, i), 'EEE'),
      date,
      revenue: dayData?.total_revenue || 0,
      orders: dayData?.total_orders || 0,
    };
  });

  const totals = {
    revenue: data.reduce((sum, d) => sum + (d.total_revenue || 0), 0),
    orders: data.reduce((sum, d) => sum + (d.total_orders || 0), 0),
    tax: data.reduce((sum, d) => sum + (d.total_tax || 0), 0),
    discount: data.reduce((sum, d) => sum + (d.total_discount || 0), 0),
  };

  return (
    <div>
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="stat-value">₹{totals.revenue.toFixed(2)}</div>
            <div className="stat-label">Weekly Revenue</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <ShoppingCart size={24} />
          </div>
          <div>
            <div className="stat-value">{totals.orders}</div>
            <div className="stat-label">Total Orders</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="stat-value">
              ₹{totals.orders ? (totals.revenue / totals.orders).toFixed(2) : '0.00'}
            </div>
            <div className="stat-label">Avg. Order Value</div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="card" style={{ marginTop: 'var(--spacing-6)' }}>
        <div className="card-header">
          <h3>Daily Revenue</h3>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'revenue' ? `₹${value.toFixed(2)}` : value,
                  name === 'revenue' ? 'Revenue' : 'Orders'
                ]}
              />
              <Bar dataKey="revenue" fill="var(--primary-500)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Orders Chart */}
      <div className="card" style={{ marginTop: 'var(--spacing-6)' }}>
        <div className="card-header">
          <h3>Daily Orders</h3>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="orders" 
                stroke="var(--success-500)" 
                strokeWidth={2}
                dot={{ fill: 'var(--success-500)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Table */}
      <div className="card" style={{ marginTop: 'var(--spacing-6)' }}>
        <div className="card-header">
          <h3>Daily Breakdown</h3>
        </div>
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Day</th>
                <th className="text-right">Orders</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Tax</th>
                <th className="text-right">Discount</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map(day => {
                const dayData = data.find(d => d.date === day.date);
                return (
                  <tr key={day.date}>
                    <td style={{ fontWeight: 500 }}>{day.day} ({format(new Date(day.date), 'MMM d')})</td>
                    <td className="text-right">{dayData?.total_orders || 0}</td>
                    <td className="text-right" style={{ fontWeight: 600 }}>
                      ₹{(dayData?.total_revenue || 0).toFixed(2)}
                    </td>
                    <td className="text-right">₹{(dayData?.total_tax || 0).toFixed(2)}</td>
                    <td className="text-right">₹{(dayData?.total_discount || 0).toFixed(2)}</td>
                  </tr>
                );
              })}
              <tr style={{ background: 'var(--gray-50)', fontWeight: 600 }}>
                <td>Total</td>
                <td className="text-right">{totals.orders}</td>
                <td className="text-right">₹{totals.revenue.toFixed(2)}</td>
                <td className="text-right">₹{totals.tax.toFixed(2)}</td>
                <td className="text-right">₹{totals.discount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
