import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Globe, Clock, RefreshCw, Pause, Play, Settings, Search, Filter,
  ChevronDown, Check, X, Phone, MessageCircle, MapPin, Printer,
  Package, Truck, ShoppingBag, UtensilsCrossed, AlertTriangle, User,
  ExternalLink, ChevronRight, Volume2, VolumeX, Bell
} from 'lucide-react';
import { useAlertStore } from '../stores/alertStore';
import { useNavigate } from 'react-router-dom';

const WebsiteOrdersPage = () => {
  const { showAlert } = useAlertStore();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, accepted: 0, rejected: 0, completed: 0 });
  const [pollingStatus, setPollingStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Order detail
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingOrderId, setRejectingOrderId] = useState(null);

  // Notification banner
  const [newOrderBanner, setNewOrderBanner] = useState(null);

  // Countdown timer
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef(null);

  useEffect(() => {
    loadData();

    // Listen for new orders from backend
    if (window.zapbillCloud?.onNewOrder) {
      const unsub = window.zapbillCloud.onNewOrder((order) => {
        setNewOrderBanner(order);
        loadData();
        setTimeout(() => setNewOrderBanner(null), 30000);
      });
      return () => { if (typeof unsub === 'function') unsub(); };
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter, dateFilter, searchQuery]);

  // Countdown timer
  useEffect(() => {
    if (pollingStatus?.active && pollingStatus?.interval) {
      setCountdown(pollingStatus.interval);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            loadData();
            return pollingStatus.interval;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(countdownRef.current);
    }
  }, [pollingStatus?.active, pollingStatus?.interval]);

  const loadData = async () => {
    try {
      const dateRange = getDateRange();
      const filters = {
        status: statusFilter,
        order_type: typeFilter,
        search: searchQuery,
        ...dateRange
      };
      const [orderData, countData, statusData] = await Promise.all([
        window.zapbillCloud.checkOrdersNow(),
        window.electronAPI.invoke('websiteOrders:getCounts'),
        window.electronAPI.invoke('websiteOrders:getPollingStatus')
      ]);

      let sorted = orderData || [];
      if (sortBy === 'newest') sorted.sort((a, b) => new Date(b.order_time) - new Date(a.order_time));
      if (sortBy === 'oldest') sorted.sort((a, b) => new Date(a.order_time) - new Date(b.order_time));
      if (sortBy === 'highest') sorted.sort((a, b) => b.grand_total - a.grand_total);
      if (sortBy === 'lowest') sorted.sort((a, b) => a.grand_total - b.grand_total);

      setOrders(sorted);
      setCounts(countData || { pending: 0, accepted: 0, rejected: 0, completed: 0 });
      setPollingStatus(statusData);
      setIsPaused(!statusData?.active);
    } catch (e) {
      console.error('Failed to load website orders:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now - 86400000).toISOString().split('T')[0];
    const week = new Date(now - 7 * 86400000).toISOString().split('T')[0];
    const month = new Date(now - 30 * 86400000).toISOString().split('T')[0];

    switch (dateFilter) {
      case 'today': return { date_from: today, date_to: today };
      case 'yesterday': return { date_from: yesterday, date_to: yesterday };
      case 'week': return { date_from: week, date_to: today };
      case 'month': return { date_from: month, date_to: today };
      default: return {};
    }
  };

  const handleAccept = async (orderId) => {
    try {
      await window.zapbillCloud.acceptOrder(orderId, 30, 'Order accepted');
      showAlert('Order accepted!', 'success');
      loadData();
      if (selectedOrder?.order_id === orderId) setSelectedOrder(null);
    } catch (e) {
      showAlert('Failed to accept order: ' + e.message, 'error');
    }
  };

  const handleReject = async (orderId) => {
    setRejectingOrderId(orderId);
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    try {
      await window.zapbillCloud.rejectOrder(rejectingOrderId, rejectReason, 'Order rejected');
      showAlert('Order rejected', 'info');
      setShowRejectModal(false);
      setRejectReason('');
      setRejectingOrderId(null);
      loadData();
      if (selectedOrder?.order_id === rejectingOrderId) setSelectedOrder(null);
    } catch (e) {
      showAlert('Failed to reject order: ' + e.message, 'error');
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await window.zapbillCloud.updateOrderStatus(orderId, newStatus, '');
      showAlert(`Order status updated to ${newStatus}`, 'success');
      loadData();
    } catch (e) {
      showAlert('Failed to update status: ' + e.message, 'error');
    }
  };

  const togglePolling = async () => {
    try {
      if (isPaused) {
        await window.zapbillCloud.resumeOrderPolling();
      } else {
        await window.zapbillCloud.pauseOrderPolling();
      }
      setIsPaused(!isPaused);
      loadData();
    } catch (e) {
      showAlert('Failed to toggle polling', 'error');
    }
  };

  const checkNow = async () => {
    try {
      await window.zapbillCloud.checkOrdersNow();
      loadData();
    } catch (e) {
      showAlert('Check failed: ' + e.message, 'error');
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const statusColors = {
    pending: { bg: '#fef9c3', color: '#854d0e', border: '#fde68a', label: 'PENDING' },
    accepted: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe', label: 'ACCEPTED' },
    preparing: { bg: '#fce7f3', color: '#9d174d', border: '#fbcfe8', label: 'PREPARING' },
    ready: { bg: '#d1fae5', color: '#065f46', border: '#a7f3d0', label: 'READY' },
    dispatched: { bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe', label: 'DISPATCHED' },
    completed: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', label: 'COMPLETED' },
    delivered: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', label: 'DELIVERED' },
    rejected: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', label: 'REJECTED' },
    'auto-rejected': { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', label: 'AUTO-REJECTED' }
  };

  const orderTypeIcons = {
    delivery: { icon: Truck, color: '#0ea5e9', label: 'Delivery' },
    pickup: { icon: ShoppingBag, color: '#f59e0b', label: 'Pickup' },
    dinein: { icon: UtensilsCrossed, color: '#8b5cf6', label: 'Dine-in' }
  };

  const rejectReasons = [
    'Restaurant is closed',
    'Item not available',
    'Delivery area too far',
    'Too busy right now',
    'Other'
  ];

  const StatusBadge = ({ status }) => {
    const s = statusColors[status] || statusColors.pending;
    return (
      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: s.bg, color: s.color, border: `1px solid ${s.border}`, letterSpacing: '0.5px' }}>
        {s.label}
      </span>
    );
  };

  // ─── Render Order Card ─────────────────────────
  const OrderCard = ({ order }) => {
    const ot = orderTypeIcons[order.order_type] || orderTypeIcons.delivery;
    const items = Array.isArray(order.items) ? order.items : [];

    return (
      <div onClick={() => setSelectedOrder(order)} style={{
        background: 'white', borderRadius: '12px', border: order.status === 'pending' ? '2px solid #fbbf24' : '1px solid #e2e8f0',
        padding: '18px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: order.status === 'pending' ? '0 0 0 3px rgba(251, 191, 36, 0.1)' : 'none'
      }}
        onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
        onMouseOut={(e) => e.currentTarget.style.boxShadow = order.status === 'pending' ? '0 0 0 3px rgba(251, 191, 36, 0.1)' : 'none'}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <StatusBadge status={order.status} />
            <span style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>#{order.order_id}</span>
          </div>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{timeAgo(order.order_time)}</span>
        </div>

        {/* Customer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={16} style={{ color: '#64748b' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{order.customer_name || 'Unknown'}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>{order.customer_phone}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: `${ot.color}10`, borderRadius: '20px' }}>
            <ot.icon size={14} style={{ color: ot.color }} />
            <span style={{ fontSize: '11px', fontWeight: '600', color: ot.color }}>{ot.label}</span>
          </div>
        </div>

        {/* Items Preview */}
        <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '12px' }}>
          {items.slice(0, 3).map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', fontSize: '13px' }}>
              <span style={{ color: '#334155' }}>
                {item.item_name} <span style={{ color: '#94a3b8' }}>x{item.quantity}</span>
              </span>
              <span style={{ fontWeight: '600', color: '#0f172a' }}>₹{item.line_total?.toFixed(2)}</span>
            </div>
          ))}
          {items.length > 3 && (
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>+{items.length - 3} more items</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>₹{order.grand_total?.toFixed(2)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
            <span style={{ padding: '2px 8px', borderRadius: '4px', background: order.payment_status === 'paid' ? '#dcfce7' : '#fef9c3', color: order.payment_status === 'paid' ? '#166534' : '#854d0e', fontWeight: '600' }}>
              {order.payment_mode === 'online' ? '💳 Paid' : '💵 COD'}
            </span>
          </div>
        </div>

        {/* Action Buttons for Pending */}
        {order.status === 'pending' && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
            <button onClick={(e) => { e.stopPropagation(); handleAccept(order.order_id); }} style={{ flex: 1, padding: '8px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Check size={16} /> Accept
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleReject(order.order_id); }} style={{ flex: 1, padding: '8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <X size={16} /> Reject
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─── Order Detail Panel ─────────────────────────
  const OrderDetail = ({ order }) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const addr = order.delivery_address || {};
    const ot = orderTypeIcons[order.order_type] || orderTypeIcons.delivery;

    return (
      <div style={{ width: '420px', background: 'white', borderLeft: '1px solid #e2e8f0', height: '100%', overflowY: 'auto', padding: '24px', position: 'relative' }}>
        {/* Close */}
        <button onClick={() => setSelectedOrder(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>#{order.order_id}</span>
            <StatusBadge status={order.status} />
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Placed {timeAgo(order.order_time)} • {new Date(order.order_time).toLocaleString()}</div>
        </div>

        {/* Customer */}
        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
          <h5 style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</h5>
          <div style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={14} style={{ color: '#64748b' }}/> <strong>{order.customer_name}</strong></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={14} style={{ color: '#64748b' }}/> {order.customer_phone}
              {order.customer_phone && (
                <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                  <a href={`tel:${order.customer_phone}`} style={{ padding: '3px 8px', background: '#dbeafe', color: '#2563eb', borderRadius: '4px', fontSize: '11px', textDecoration: 'none', fontWeight: '600' }}>📞 Call</a>
                  <a href={`https://wa.me/${order.customer_phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ padding: '3px 8px', background: '#dcfce7', color: '#16a34a', borderRadius: '4px', fontSize: '11px', textDecoration: 'none', fontWeight: '600' }}>💬 WhatsApp</a>
                </div>
              )}
            </div>
            {order.customer_email && <div style={{ color: '#64748b' }}>✉️ {order.customer_email}</div>}
          </div>

          {/* Type & Address */}
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <ot.icon size={14} style={{ color: ot.color }} />
              <span style={{ fontSize: '13px', fontWeight: '600', color: ot.color }}>{ot.label}</span>
            </div>
            {order.order_type === 'delivery' && addr.full_address && (
              <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                <MapPin size={12} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px', color: '#64748b' }} />
                {addr.full_address}
                {addr.landmark && <><br />{addr.landmark}</>}
                {addr.city && <><br />{addr.city}{addr.state ? `, ${addr.state}` : ''} - {addr.pincode}</>}
                {addr.distance_km && <div style={{ marginTop: '4px', fontSize: '12px', color: '#0ea5e9' }}>📍 {addr.distance_km} km away</div>}
                {addr.latitude && addr.longitude && (
                  <a href={`https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '12px', color: '#2563eb', textDecoration: 'none' }}>
                    <ExternalLink size={12} /> Open in Google Maps
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div style={{ marginBottom: '16px' }}>
          <h5 style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ordered Items</h5>
          <div style={{ display: 'grid', gap: '8px' }}>
            {items.map((item, idx) => (
              <div key={idx} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', fontSize: '14px', color: '#0f172a' }}>{item.item_name} <span style={{ color: '#64748b', fontWeight: '400' }}>x{item.quantity}</span></span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>₹{item.line_total?.toFixed(2)}</span>
                </div>
                {item.variant?.name && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>├── Variant: {item.variant.name}</div>
                )}
                {item.addons?.length > 0 && item.addons.map((addon, ai) => (
                  <div key={ai} style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>├── {addon.name} <span style={{ color: '#0ea5e9' }}>+₹{addon.price}</span></div>
                ))}
                {item.special_note && (
                  <div style={{ fontSize: '12px', color: '#f59e0b', fontStyle: 'italic', marginTop: '4px' }}>└── 📝 "{item.special_note}"</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bill Summary */}
        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
          <h5 style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bill Summary</h5>
          <div style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Subtotal</span><span>₹{order.subtotal?.toFixed(2)}</span></div>
            {order.coupon_code && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}><span>Coupon: {order.coupon_code}</span><span>-₹{order.coupon_discount?.toFixed(2)}</span></div>}
            {order.delivery_charge > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Delivery</span><span>₹{order.delivery_charge?.toFixed(2)}</span></div>}
            {order.packaging_charge > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Packaging</span><span>₹{order.packaging_charge?.toFixed(2)}</span></div>}
            {order.tax_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Tax (GST)</span><span>₹{order.tax_amount?.toFixed(2)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '4px', fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>
              <span>Grand Total</span><span>₹{order.grand_total?.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '6px', background: order.payment_status === 'paid' ? '#dcfce7' : '#fef9c3', fontSize: '13px', fontWeight: '600', color: order.payment_status === 'paid' ? '#166534' : '#854d0e' }}>
            {order.payment_mode === 'online' ? `💳 Online Payment (${order.payment_status})` : '💵 Cash on Delivery'}
            {order.payment_transaction_id && <div style={{ fontSize: '11px', fontWeight: '400', marginTop: '2px' }}>Txn: {order.payment_transaction_id}</div>}
          </div>
        </div>

        {/* Customer Note */}
        {order.customer_note && (
          <div style={{ padding: '12px', background: '#fef9c3', borderRadius: '8px', border: '1px solid #fde68a', marginBottom: '16px', fontSize: '13px', color: '#854d0e' }}>
            <strong>Customer Note:</strong> {order.customer_note}
          </div>
        )}

        {/* Status Change Dropdown */}
        {order.status !== 'rejected' && order.status !== 'completed' && order.status !== 'delivered' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Update Status</label>
            <select value={order.status} onChange={(e) => handleStatusChange(order.order_id, e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', cursor: 'pointer' }}>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready for Pickup</option>
              {order.order_type === 'delivery' && <option value="dispatched">Out for Delivery</option>}
              <option value="completed">Completed / Delivered</option>
            </select>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {order.status === 'pending' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleAccept(order.order_id)} style={{ flex: 1, padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Check size={18} /> Accept Order
              </button>
              <button onClick={() => handleReject(order.order_id)} style={{ flex: 1, padding: '10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <X size={18} /> Reject Order
              </button>
            </div>
          )}
          <button style={{ padding: '10px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Printer size={16} /> Print KOT
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: 'calc(100vh - 65px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* New Order Banner */}
      {newOrderBanner && (
        <div style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'pulse 2s infinite' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#78350f' }}>
            <Bell size={20} />
            <span style={{ fontWeight: '700', fontSize: '15px' }}>🔔 NEW ONLINE ORDER!</span>
            <span style={{ fontSize: '14px' }}>#{newOrderBanner.order_id} | {newOrderBanner.customer?.name} | ₹{newOrderBanner.bill_summary?.grand_total?.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setSelectedOrder(null); loadData(); const o = orders.find(x => x.order_id === newOrderBanner.order_id); if (o) setSelectedOrder(o); setNewOrderBanner(null); }} style={{ padding: '6px 14px', background: 'white', color: '#92400e', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>👀 View Order</button>
            <button onClick={() => setNewOrderBanner(null)} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.3)', color: '#78350f', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '20px 24px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={22} style={{ color: 'white' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>Website Orders</h1>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
          {[
            { label: 'Pending', count: counts.pending, color: '#f59e0b', bg: '#fef9c3', pulse: counts.pending > 0 },
            { label: 'Accepted', count: counts.accepted, color: '#3b82f6', bg: '#dbeafe' },
            { label: 'Rejected', count: counts.rejected, color: '#ef4444', bg: '#fee2e2' },
            { label: 'Completed', count: counts.completed, color: '#10b981', bg: '#dcfce7', sub: '(today)' },
          ].map((stat, i) => (
            <div key={i} onClick={() => setStatusFilter(stat.label.toLowerCase())} style={{
              padding: '14px 16px', borderRadius: '12px', background: stat.bg, cursor: 'pointer',
              border: statusFilter === stat.label.toLowerCase() ? `2px solid ${stat.color}` : '2px solid transparent',
              transition: 'all 0.2s'
            }}>
              <div style={{ fontSize: '28px', fontWeight: '800', color: stat.color }}>{stat.count}</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: stat.color }}>{stat.label} {stat.sub && <span style={{ fontWeight: '400', fontSize: '11px' }}>{stat.sub}</span>}</div>
            </div>
          ))}
        </div>

        {/* Polling Status Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#475569' }}>
            <span>Polling: {isPaused ? '🔴 Paused' : '🟢 Active'}</span>
            {pollingStatus?.lastCheckTime && <span>Last check: {timeAgo(pollingStatus.lastCheckTime)}</span>}
            {!isPaused && <span>Next: {countdown}s</span>}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={togglePolling} style={{ padding: '6px 12px', background: isPaused ? '#10b981' : '#f1f5f9', color: isPaused ? 'white' : '#475569', border: isPaused ? 'none' : '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {isPaused ? <><Play size={14} /> Resume</> : <><Pause size={14} /> Pause</>}
            </button>
            <button onClick={checkNow} style={{ padding: '6px 12px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <RefreshCw size={14} /> Check Now
            </button>
            <button onClick={() => navigate('/settings')} style={{ padding: '6px 12px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Settings size={14} /> Settings
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '12px 24px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', cursor: 'pointer' }}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="dispatched">Dispatched</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', cursor: 'pointer' }}>
          <option value="all">All Types</option>
          <option value="delivery">Delivery</option>
          <option value="pickup">Pickup</option>
          <option value="dinein">Dine-in</option>
        </select>
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', cursor: 'pointer' }}>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, phone, order ID..." style={{ width: '100%', padding: '7px 12px 7px 32px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', cursor: 'pointer' }}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Amount</option>
          <option value="lowest">Lowest Amount</option>
        </select>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Order List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: '#f1f5f9' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
              <RefreshCw className="spin" size={32} style={{ color: '#94a3b8' }} />
            </div>
          ) : orders.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#94a3b8' }}>
              <Globe size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <div style={{ fontSize: '16px', fontWeight: '600' }}>No website orders found</div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>Configure your website server in Settings to start receiving orders.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: '12px' }}>
              {orders.map(order => (
                <OrderCard key={order.order_id || order.id} order={order} />
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedOrder && <OrderDetail order={selectedOrder} />}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Reject Order</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Select a reason for rejecting this order:</p>
            <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
              {rejectReasons.map(reason => (
                <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${rejectReason === reason ? '#ef4444' : '#e2e8f0'}`, background: rejectReason === reason ? '#fef2f2' : 'white', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="radio" name="reason" checked={rejectReason === reason} onChange={() => setRejectReason(reason)} style={{ accentColor: '#ef4444' }} />
                  {reason}
                </label>
              ))}
              {rejectReason === 'Other' && (
                <input type="text" placeholder="Enter custom reason..." style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={confirmReject} disabled={!rejectReason} style={{ flex: 1, padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: rejectReason ? 'pointer' : 'not-allowed', opacity: rejectReason ? 1 : 0.5 }}>Reject Order</button>
              <button onClick={() => { setShowRejectModal(false); setRejectReason(''); }} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsiteOrdersPage;
