import React, { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Clock, 
  Check,
  RefreshCw,
  Printer,
  Eye,
  X,
  AlertTriangle,
  Users,
  Utensils,
  MapPin,
  Phone,
  User,
  FileText
} from 'lucide-react';

// KOT Preview Modal — Receipt-style view for printing
const KOTPreviewModal = ({ order, onClose, onPrint, getTimeSinceOrder }) => {
  if (!order) return null;

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1001, alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ 
        maxWidth: '400px', 
        width: '90%',
        maxHeight: '85vh', 
        height: 'auto',
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div className="modal-header" style={{ background: '#263238', color: 'white', padding: '12px 16px', borderBottom: '1px solid #37474F' }}>
          <h3 className="modal-title" style={{ color: 'white', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            <ChefHat size={18} style={{ marginRight: '8px', color: '#FFB74D' }} />
            Kitchen Order Ticket
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ color: 'white', opacity: 0.8 }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '0', overflowY: 'auto', background: '#F5F5F5' }}>
          <div style={{
            background: '#FFFDE7',
            padding: '20px',
            margin: '16px',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            fontFamily: "'Courier New', monospace",
            position: 'relative'
          }}>
            {/* Dashed Border Top Effect */}
            <div style={{ position: 'absolute', top: '-6px', left: '0', right: '0', height: '12px', background: 'radial-gradient(circle, #F5F5F5 4px, transparent 5px) repeat-x', backgroundSize: '12px 12px', transform: 'rotate(180deg)' }}></div>

            {/* KOT Header */}
            <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px dashed #BDBDBD', paddingBottom: '12px' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '2px', color: '#263238' }}>KOT</div>
              <div style={{ fontSize: '11px', color: '#78909C', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>Kitchen Order Ticket</div>
              
              {/* Urgency Badge in Receipt */}
              {order.urgency && order.urgency !== 'normal' && (
                <div style={{ 
                  marginTop: '8px', 
                  display: 'inline-block',
                  padding: '4px 12px', 
                  background: order.urgency === 'critical' ? '#FFEBEE' : '#FFF3E0',
                  color: order.urgency === 'critical' ? '#C62828' : '#E65100',
                  border: order.urgency === 'critical' ? '2px solid #EF9A9A' : '2px solid #FFB74D',
                  borderRadius: '4px',
                  fontWeight: 800,
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {order.urgency} ORDER
                </div>
              )}
            </div>

            {/* Order Info */}
            <div style={{ marginBottom: '16px', fontSize: '13px', lineHeight: '1.6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '18px', color: '#263238' }}>#{order.order_number}</span>
                <span style={{ 
                  background: '#ECEFF1', 
                  padding: '2px 8px', 
                  borderRadius: '4px', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: '#455A64' 
                }}>
                  {getTimeSinceOrder(order.order_time)}
                </span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', color: '#37474F' }}>
                <span style={{ color: '#78909C' }}>Type:</span>
                <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{order.order_type?.replace('_', ' ')}</span>
                
                {order.table_number && (
                  <>
                    <span style={{ color: '#78909C' }}>Table:</span>
                    <span style={{ fontWeight: 800, color: '#D32F2F' }}>{order.table_number}</span>
                  </>
                )}
                
                {order.customer_name && (
                  <>
                    <span style={{ color: '#78909C' }}>Customer:</span>
                    <span style={{ fontWeight: 600 }}>{order.customer_name}</span>
                  </>
                )}
                
                <span style={{ color: '#78909C' }}>Time:</span>
                <span>{formatDate(order.order_time)}</span>
              </div>
            </div>

            {/* Items */}
            <div style={{ borderTop: '2px dashed #BDBDBD', borderBottom: '2px dashed #BDBDBD', padding: '12px 0', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '11px', marginBottom: '10px', color: '#78909C', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <span>Qty</span>
                <span style={{ flex: 1, marginLeft: '12px' }}>Item Details</span>
              </div>
              
              {order.items.map((item, idx) => {
                let variantInfo = null;
                let addonsInfo = [];
                try {
                  if (item.variant) {
                    const v = typeof item.variant === 'string' ? JSON.parse(item.variant) : item.variant;
                    if (v && v.name) variantInfo = v.name;
                  }
                } catch (e) {}
                try {
                  if (item.addons) {
                    const a = typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons;
                    if (Array.isArray(a)) addonsInfo = a;
                  }
                } catch (e) {}

                return (
                  <div key={idx} style={{ marginBottom: '12px', borderBottom: idx === order.items.length - 1 ? 'none' : '1px dotted #E0E0E0', paddingBottom: idx === order.items.length - 1 ? 0 : '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                      <span style={{ minWidth: '32px', fontWeight: 800, fontSize: '15px', color: '#263238', paddingTop: '1px' }}>{item.quantity}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#263238' }}>{item.item_name}</div>
                        
                        {variantInfo && (
                          <div style={{ fontSize: '12px', color: '#0277BD', marginTop: '2px' }}>
                            Size: {variantInfo}
                          </div>
                        )}
                        
                        {addonsInfo.length > 0 && (
                          <div style={{ fontSize: '12px', color: '#546E7A', marginTop: '1px' }}>
                            + {addonsInfo.map(a => a.name).join(', ')}
                          </div>
                        )}
                        
                        {item.special_instructions && (
                          <div style={{ 
                            marginTop: '4px',
                            background: '#FFF3E0',
                            border: '1px solid #FFE0B2',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px', 
                            color: '#E65100', 
                            fontWeight: 600,
                            display: 'inline-block'
                          }}>
                            Note: {item.special_instructions}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Chef Instructions (Order Level) */}
            {order.chef_instructions && (
              <div style={{ 
                background: '#FCE4EC', 
                border: '2px solid #F48FB1', 
                borderRadius: '6px', 
                padding: '10px', 
                marginTop: '16px',
                textAlign: 'left'
              }}>
                <div style={{ 
                  textTransform: 'uppercase', 
                  fontSize: '11px', 
                  fontWeight: 800, 
                  color: '#C62828', 
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <ChefHat size={14} /> Chef Instructions
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#880E4F', lineHeight: '1.4' }}>
                  {order.chef_instructions}
                </div>
              </div>
            )}
            
            <div style={{ textAlign: 'center', marginTop: '20px', color: '#90A4AE', fontSize: '11px', fontStyle: 'italic' }}>
              --- Kitchen Copy ---
            </div>
            
            {/* Dashed Border Bottom Effect */}
            <div style={{ position: 'absolute', bottom: '-6px', left: '0', right: '0', height: '12px', background: 'radial-gradient(circle, #F5F5F5 4px, transparent 5px) repeat-x', backgroundSize: '12px 12px' }}></div>
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '12px 16px', borderTop: '1px solid #E0E0E0', background: 'white', display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" style={{ flex: 1, padding: '10px', background: '#D32F2F', borderColor: '#D32F2F' }} onClick={() => onPrint(order)}>
            <Printer size={18} style={{ marginRight: '6px' }} /> Print KOT
          </button>
        </div>
      </div>
    </div>
  );
};


const KOTPage = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [previewOrder, setPreviewOrder] = useState(null);

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
            customer_name: item.customer_name || null,
            customer_phone: item.customer_phone || null,
            notes: item.notes || null,
            items: []
          };
        }
        // Capture urgency and chef_instructions from first item row (same for all items in an order)
        if (item.urgency) acc[item.order_id].urgency = item.urgency;
        if (item.chef_instructions) acc[item.order_id].chef_instructions = item.chef_instructions;
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
      alert('KOT sent to printer!');
    } catch (error) {
      console.error('Print failed:', error);
      alert('Print failed: ' + error.message);
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
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
  };

  const getTimeUrgency = (orderTime) => {
    const diff = Math.floor((Date.now() - new Date(orderTime).getTime()) / 60000);
    if (diff < 10) return { color: '#2E7D32', bg: '#E8F5E9', label: 'Fresh' };
    if (diff < 20) return { color: '#E65100', bg: '#FFF3E0', label: 'Waiting' };
    return { color: '#C62828', bg: '#FFEBEE', label: 'Urgent!' };
  };

  // Stats
  const pendingCount = orders.filter(o => getOrderStatus(o.items) === 'pending').length;
  const preparingCount = orders.filter(o => getOrderStatus(o.items) === 'preparing').length;
  const readyCount = orders.filter(o => getOrderStatus(o.items) === 'ready').length;
  const totalItems = orders.reduce((s, o) => s + o.items.length, 0);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
        <div className="loading-spinner" style={{ width: '48px', height: '48px', borderWidth: '4px' }} />
        <p style={{ marginTop: '16px', fontWeight: 600, fontSize: '18px', color: '#546E7A' }}>Loading kitchen orders...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px', background: '#f8fafc', minHeight: 'calc(100vh - 60px)', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#263238', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <ChefHat size={28} color="#D32F2F" /> Kitchen Display (KOT)
          </h1>
          <p style={{ color: '#78909C', fontSize: '13px', margin: '4px 0 0 0' }}>
            Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 30s
          </p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={loadOrders}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontWeight: 600 }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {[
          { label: 'Pending', count: pendingCount, gradient: 'linear-gradient(135deg, #FF9800, #F57C00)', icon: Clock },
          { label: 'Preparing', count: preparingCount, gradient: 'linear-gradient(135deg, #2196F3, #1976D2)', icon: Utensils },
          { label: 'Ready', count: readyCount, gradient: 'linear-gradient(135deg, #4CAF50, #388E3C)', icon: Check },
          { label: 'Total Items', count: totalItems, gradient: 'linear-gradient(135deg, #78909C, #546E7A)', icon: FileText },
        ].map((stat, idx) => (
          <div key={idx} style={{ background: 'white', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: stat.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
              <stat.icon size={22} />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#263238' }}>{stat.count}</div>
              <div style={{ fontSize: '12px', color: '#78909C', fontWeight: 500 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'white', padding: '10px 16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {[
          { value: 'all', label: 'All Orders', bg: '#37474F' },
          { value: 'pending', label: 'Pending', bg: '#FF9800' },
          { value: 'preparing', label: 'Preparing', bg: '#2196F3' },
          { value: 'ready', label: 'Ready', bg: '#4CAF50' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: filter === f.value ? f.bg : '#F5F5F5',
              color: filter === f.value ? 'white' : '#546E7A'
            }}
          >
            {f.label}
            {f.value !== 'all' && (
              <span style={{ marginLeft: '6px', background: filter === f.value ? 'rgba(255,255,255,0.3)' : '#E0E0E0', padding: '1px 7px', borderRadius: '10px', fontSize: '11px' }}>
                {f.value === 'pending' ? pendingCount : f.value === 'preparing' ? preparingCount : readyCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* KOT Grid */}
      {filteredOrders.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
          {filteredOrders.map(order => {
            const status = getOrderStatus(order.items);
            const urgency = getTimeUrgency(order.order_time);
            const statusColors = {
              pending: { border: '#FF9800', headerBg: '#FFF8E1' },
              preparing: { border: '#2196F3', headerBg: '#E3F2FD' },
              ready: { border: '#4CAF50', headerBg: '#E8F5E9' }
            };
            const sc = statusColors[status];
            const hasInstructions = order.items.some(i => i.special_instructions);

            return (
              <div key={order.order_id} style={{
                background: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                borderTop: `4px solid ${sc.border}`,
                transition: 'box-shadow 0.2s',
              }}>
                {/* Card Header */}
                <div style={{ padding: '14px 16px', background: sc.headerBg, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: '#263238' }}>#{order.order_number}</span>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        background: sc.border,
                        color: 'white'
                      }}>
                        {status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                      {order.table_number ? (
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#D32F2F', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <MapPin size={13} /> {order.table_number}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#546E7A', fontWeight: 600, textTransform: 'uppercase' }}>
                          {order.order_type?.replace('_', ' ')}
                        </span>
                      )}
                      {order.customer_name && (
                        <span style={{ fontSize: '12px', color: '#37474F', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <User size={12} /> {order.customer_name}
                        </span>
                      )}
                    </div>
                    {/* Urgency Badge */}
                    {order.urgency && order.urgency !== 'normal' && (
                      <div style={
                        order.urgency === 'critical'
                          ? { marginTop: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: '#FFEBEE', color: '#C62828', border: '1px solid #EF9A9A', display: 'flex', alignItems: 'center', gap: '3px' }
                          : { marginTop: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: '#FFF3E0', color: '#E65100', border: '1px solid #FFB74D', display: 'flex', alignItems: 'center', gap: '3px' }
                      }>
                        <AlertTriangle size={11} /> {order.urgency.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: urgency.bg,
                      color: urgency.color,
                    }}>
                      <Clock size={13} />
                      {getTimeSinceOrder(order.order_time)}
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div style={{ padding: '12px 16px' }}>
                  {order.items.map((item, idx) => {
                    let variantInfo = null;
                    let addonsInfo = [];
                    try {
                      if (item.variant) {
                        const v = typeof item.variant === 'string' ? JSON.parse(item.variant) : item.variant;
                        if (v && v.name) variantInfo = v.name;
                      }
                    } catch (e) {}
                    try {
                      if (item.addons) {
                        const a = typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons;
                        if (Array.isArray(a)) addonsInfo = a;
                      }
                    } catch (e) {}

                    return (
                      <div key={item.id} style={{
                        padding: '10px 0',
                        borderBottom: idx < order.items.length - 1 ? '1px dashed #E0E0E0' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ 
                              fontWeight: 800, 
                              fontSize: '16px', 
                              color: '#D32F2F', 
                              background: '#FFEBEE', 
                              width: '32px', 
                              height: '32px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              borderRadius: '6px', 
                              flexShrink: 0 
                            }}>
                              {item.quantity}x
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '14px', color: '#263238' }}>{item.item_name}</span>
                          </div>
                          {variantInfo && (
                            <div style={{ fontSize: '12px', color: '#1565C0', marginLeft: '40px', marginTop: '2px', fontWeight: 500 }}>
                              Size: {variantInfo}
                            </div>
                          )}
                          {addonsInfo.length > 0 && (
                            <div style={{ fontSize: '12px', color: '#546E7A', marginLeft: '40px', marginTop: '2px' }}>
                              {addonsInfo.map(a => `+ ${a.name}`).join(', ')}
                            </div>
                          )}
                          {item.special_instructions && (
                            <div style={{
                              marginLeft: '40px',
                              marginTop: '4px',
                              padding: '5px 10px',
                              background: '#FFF3E0',
                              border: '1px solid #FFE0B2',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: 700,
                              color: '#BF360C',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <AlertTriangle size={14} color="#E65100" />
                              {item.special_instructions}
                            </div>
                          )}
                        </div>
                        <div style={{ flexShrink: 0, marginLeft: '8px' }}>
                          {item.kot_status !== 'ready' ? (
                            <button
                              onClick={() => handleStatusUpdate(
                                item.id, 
                                item.kot_status === 'pending' ? 'preparing' : 'ready'
                              )}
                              style={{
                                padding: '5px 12px',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 600,
                                fontSize: '12px',
                                cursor: 'pointer',
                                color: 'white',
                                background: item.kot_status === 'pending' ? '#2196F3' : '#4CAF50',
                                transition: 'all 0.2s'
                              }}
                            >
                              {item.kot_status === 'pending' ? 'Start' : 'Done'}
                            </button>
                          ) : (
                            <div style={{ 
                              width: '28px', 
                              height: '28px', 
                              borderRadius: '50%', 
                              background: '#E8F5E9', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center' 
                            }}>
                              <Check size={16} color="#2E7D32" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Chef Notes Block */}
                  {hasInstructions && (
                    <div style={{
                      marginTop: '10px',
                      padding: '10px 12px',
                      background: '#FFF8E1',
                      borderRadius: '8px',
                      border: '2px solid #FFE082',
                    }}>
                      <div style={{ fontWeight: 800, fontSize: '11px', color: '#E65100', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={13} /> Chef Notes
                      </div>
                      {order.items.filter(i => i.special_instructions).map((i, idx) => (
                        <div key={idx} style={{ fontSize: '13px', color: '#BF360C', fontWeight: 600, marginBottom: '2px' }}>
                          <strong>{i.item_name}:</strong> {i.special_instructions}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Order-level Chef Instructions */}
                  {order.chef_instructions && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      background: '#FCE4EC',
                      borderRadius: '8px',
                      border: '2px solid #F48FB1',
                    }}>
                      <div style={{ fontWeight: 800, fontSize: '11px', color: '#C62828', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ChefHat size={13} /> Chef Instructions
                      </div>
                      <div style={{ fontSize: '13px', color: '#880E4F', fontWeight: 600 }}>
                        {order.chef_instructions}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div style={{ padding: '10px 16px', background: '#FAFAFA', display: 'flex', gap: '8px', borderTop: '1px solid #EEEEEE' }}>
                  <button
                    onClick={() => setPreviewOrder(order)}
                    style={{
                      padding: '7px 14px',
                      border: '1px solid #CFD8DC',
                      borderRadius: '6px',
                      background: 'white',
                      color: '#37474F',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Eye size={14} /> View
                  </button>
                  <button
                    onClick={() => handlePrintKOT(order)}
                    style={{
                      padding: '7px 14px',
                      border: '1px solid #CFD8DC',
                      borderRadius: '6px',
                      background: 'white',
                      color: '#37474F',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Printer size={14} /> Print
                  </button>
                  {status !== 'ready' && (
                    <button
                      onClick={() => {
                        order.items.forEach(item => {
                          if (item.kot_status !== 'ready') {
                            handleStatusUpdate(item.id, 'ready');
                          }
                        });
                      }}
                      style={{
                        flex: 1,
                        padding: '7px 14px',
                        border: 'none',
                        borderRadius: '6px',
                        background: '#4CAF50',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Check size={14} /> Mark All Ready
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center', color: '#90A4AE' }}>
          <ChefHat size={72} style={{ opacity: 0.4, marginBottom: '16px' }} />
          <p style={{ fontSize: '20px', fontWeight: 700, color: '#546E7A', margin: '0 0 8px 0' }}>No pending orders</p>
          <p style={{ fontSize: '14px', color: '#90A4AE', margin: 0 }}>
            {filter !== 'all' 
              ? `No orders with status "${filter}"` 
              : 'Kitchen is all caught up! 🎉'}
          </p>
        </div>
      )}

      {/* KOT Preview Modal */}
      {previewOrder && (
        <KOTPreviewModal
          order={previewOrder}
          onClose={() => setPreviewOrder(null)}
          onPrint={handlePrintKOT}
          getTimeSinceOrder={getTimeSinceOrder}
        />
      )}
    </div>
  );
};

export default KOTPage;
