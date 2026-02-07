import React, { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Clock, 
  Check,
  RefreshCw,
  Printer,
  Filter
} from 'lucide-react';

const KOTPage = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    loadOrders();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      const result = await window.electronAPI.invoke('kot:getPending');
      // Group by order
      const grouped = result.reduce((acc, item) => {
        if (!acc[item.order_id]) {
          acc[item.order_id] = {
            order_id: item.order_id,
            order_number: item.order_number,
            table_number: item.table_number,
            order_type: item.order_type,
            order_time: item.order_time,
            items: []
          };
        }
        acc[item.order_id].items.push(item);
        return acc;
      }, {});
      setOrders(Object.values(grouped));
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load KOTs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (orderItemId, status) => {
    try {
      await window.electronAPI.invoke('kot:updateStatus', { orderItemId, status });
      loadOrders();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handlePrintKOT = async (order) => {
    try {
      await window.electronAPI.invoke('print:kot', { 
        order, 
        items: order.items 
      });
    } catch (error) {
      console.error('Print failed:', error);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.items.some(item => item.kot_status === filter);
  });

  const getOrderStatus = (items) => {
    const statuses = items.map(i => i.kot_status);
    if (statuses.every(s => s === 'ready')) return 'ready';
    if (statuses.some(s => s === 'preparing')) return 'preparing';
    return 'pending';
  };

  const getTimeSinceOrder = (orderTime) => {
    const diff = Math.floor((Date.now() - new Date(orderTime).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} min ago`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
  };

  if (isLoading) {
    return (
      <div className="empty-state">
        <div className="loading-spinner" />
        <p className="mt-4">Loading kitchen orders...</p>
      </div>
    );
  }

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
          <h1>Kitchen Display</h1>
          <p className="text-muted">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={loadOrders}>
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ 
        display: 'flex', 
        gap: 'var(--spacing-2)', 
        marginBottom: 'var(--spacing-6)' 
      }}>
        {[
          { value: 'all', label: 'All Orders' },
          { value: 'pending', label: 'Pending', color: 'var(--warning-500)' },
          { value: 'preparing', label: 'Preparing', color: 'var(--primary-500)' },
          { value: 'ready', label: 'Ready', color: 'var(--success-500)' },
        ].map(f => (
          <button
            key={f.value}
            className={`btn ${filter === f.value ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f.value)}
            style={f.color && filter === f.value ? { background: f.color } : {}}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* KOT Grid */}
      {filteredOrders.length > 0 ? (
        <div className="kot-grid">
          {filteredOrders.map(order => {
            const status = getOrderStatus(order.items);
            return (
              <div key={order.order_id} className={`kot-card status-${status}`}>
                <div className="kot-header">
                  <div>
                    <div className="kot-order-number">#{order.order_number}</div>
                    <div className="kot-table">
                      {order.table_number 
                        ? `Table ${order.table_number}` 
                        : order.order_type.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      color: 'var(--gray-500)',
                      fontSize: 'var(--font-size-sm)'
                    }}>
                      <Clock size={14} />
                      {getTimeSinceOrder(order.order_time)}
                    </div>
                    <span className={`badge badge-${status === 'ready' ? 'success' : status === 'preparing' ? 'primary' : 'warning'}`}>
                      {status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="kot-items">
                  {order.items.map(item => {
                    // Parse variant and addons
                    let variantInfo = null;
                    let addonsInfo = [];
                    
                    if (item.variant) {
                      try {
                        const v = typeof item.variant === 'string' ? JSON.parse(item.variant) : item.variant;
                        if (v && v.name) variantInfo = v.name;
                      } catch (e) {}
                    }
                    
                    if (item.addons) {
                      try {
                        const a = typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons;
                        if (Array.isArray(a)) addonsInfo = a;
                      } catch (e) {}
                    }
                    
                    return (
                    <div key={item.id} className="kot-item">
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                          <span className="kot-item-quantity">{item.quantity}x</span>
                          <span style={{ fontWeight: 600 }}>{item.item_name}</span>
                        </div>
                        {variantInfo && (
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--primary-600)', marginLeft: '28px' }}>
                            Size: {variantInfo}
                          </div>
                        )}
                        {addonsInfo.length > 0 && (
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-600)', marginLeft: '28px' }}>
                            {addonsInfo.map((a, i) => <span key={i} style={{ marginRight: '8px' }}>+ {a.name}</span>)}
                          </div>
                        )}
                        {item.special_instructions && (
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--warning-600)', marginLeft: '28px', fontStyle: 'italic' }}>
                            Note: {item.special_instructions}
                          </div>
                        )}
                      </div>
                      <div>
                        {item.kot_status !== 'ready' && (
                          <button
                            className={`btn btn-sm ${item.kot_status === 'pending' ? 'btn-primary' : 'btn-success'}`}
                            onClick={() => handleStatusUpdate(
                              item.id, 
                              item.kot_status === 'pending' ? 'preparing' : 'ready'
                            )}
                          >
                            {item.kot_status === 'pending' ? 'Start' : 'Ready'}
                          </button>
                        )}
                        {item.kot_status === 'ready' && (
                          <Check size={18} style={{ color: 'var(--success-500)' }} />
                        )}
                      </div>
                    </div>
                  );})}
                  {order.items.some(i => i.special_instructions) && (
                    <div style={{ 
                      marginTop: 'var(--spacing-2)', 
                      padding: 'var(--spacing-2)',
                      background: 'var(--warning-50)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-xs)'
                    }}>
                      {order.items.filter(i => i.special_instructions).map(i => (
                        <div key={i.id}>
                          <strong>{i.item_name}:</strong> {i.special_instructions}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="kot-actions">
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handlePrintKOT(order)}
                  >
                    <Printer size={14} />
                    Print
                  </button>
                  {status !== 'ready' && (
                    <button 
                      className="btn btn-success btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => {
                        order.items.forEach(item => {
                          if (item.kot_status !== 'ready') {
                            handleStatusUpdate(item.id, 'ready');
                          }
                        });
                      }}
                    >
                      <Check size={14} />
                      Mark All Ready
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <ChefHat size={64} />
          <p className="empty-state-title">No pending orders</p>
          <p className="text-muted">
            {filter !== 'all' 
              ? `No orders with status "${filter}"` 
              : 'Kitchen is all caught up!'}
          </p>
        </div>
      )}
    </div>
  );
};

export default KOTPage;
