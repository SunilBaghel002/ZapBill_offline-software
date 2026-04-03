import React, { useState, useEffect, useCallback } from 'react';
import { useQROrderStore } from '../stores/qrOrderStore';
import { useAuthStore } from '../stores/authStore';
import { useAlertStore } from '../stores/alertStore';
import {
  QrCode, Wifi, WifiOff, RefreshCw, Check, X, Clock,
  Printer, Download, ChevronDown, ChevronUp, Hash,
  ShoppingBag, AlertCircle, Monitor
} from 'lucide-react';

const QROrdersPage = () => {
  const { user } = useAuthStore();
  const { showAlert } = useAlertStore();
  const {
    pendingOrders, pendingCount, serverStatus,
    fetchPendingOrders, fetchServerStatus, confirmOrder, rejectOrder
  } = useQROrderStore();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'history' | 'qr'
  const [allOrders, setAllOrders] = useState([]);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  
  // Print Modal States
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printCopies, setPrintCopies] = useState(1);

  // Initial fetch
  useEffect(() => {
    fetchServerStatus();
    fetchPendingOrders();
    loadAllOrders();
    const interval = setInterval(() => {
      fetchPendingOrders();
      fetchServerStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadAllOrders = async () => {
    try {
      const orders = await window.electronAPI.invoke('qr:getAllOrders', { limit: 50 });
      setAllOrders(Array.isArray(orders) ? orders : []);
    } catch (e) {
      console.error('Failed to load all QR orders:', e);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPendingOrders();
    await fetchServerStatus();
    await loadAllOrders();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleConfirm = async (id) => {
    setConfirmingId(id);
    const result = await confirmOrder(id, user?.id);
    if (result.success) {
      await loadAllOrders();
      
      try {
        if (result.real_order_id) {
          const orderData = await window.electronAPI.invoke('order:getById', { id: result.real_order_id });
          
          let itemsToPrint = orderData.items;
          // Sub-filter KOT print items if merged
          if (result.is_merged && result.new_item_ids && Array.isArray(result.new_item_ids)) {
            itemsToPrint = orderData.items.filter(i => result.new_item_ids.includes(i.id));
          }

          // Only print if there are items
          if (itemsToPrint.length > 0) {
            await window.electronAPI.invoke('print:kotRouted', { 
              order: orderData, 
              items: itemsToPrint, 
              printBill: true 
            });
            showAlert('Order confirmed. Bill & KOT printed!', 'success');
          } else {
            showAlert('Order confirmed, but no items to print.', 'success');
          }
        } else {
          showAlert('Order confirmed but couldnt print (Missing ID).', 'warning');
        }
      } catch (printError) {
        console.error('Printing failed:', printError);
        showAlert('Order confirmed but printing failed.', 'warning');
      }
    } else {
      showAlert(result.error || 'Failed to confirm order', 'error');
    }
    setConfirmingId(null);
  };

  const handleReject = async (id) => {
    setRejectingId(id);
    const result = await rejectOrder(id);
    if (result.success) {
      await loadAllOrders();
    }
    setRejectingId(null);
  };

  const generateQR = async () => {
    try {
      const result = await window.electronAPI.invoke('qr:generateQR', { tableNumber: '' });
      if (result.success) {
        setQrDataUrl(result.dataUrl);
        setQrUrl(result.url);
      }
    } catch (e) {
      console.error('Failed to generate QR:', e);
    }
  };

  const printQR = () => {
    if (!qrDataUrl) return;
    setPrintCopies(1);
    setIsPrintModalOpen(true);
  };

  const handlePrintConfirm = async () => {
    if (!qrDataUrl) return;

    try {
      await window.electronAPI.invoke('print:qr', {
        dataUrl: qrDataUrl,
        tableName: '',
        copies: printCopies
      });
      showAlert(`Printed ${printCopies} QR code(s) successfully`, 'success');
    } catch (e) {
      console.error('Print failed:', e);
      showAlert('Print command failed. Check printer settings.', 'error');
    } finally {
      setIsPrintModalOpen(false);
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m ago`;
  };

  const statusColor = (status) => {
    switch(status) {
      case 'pending': return '#fbbf24';
      case 'confirmed': return '#34d399';
      case 'rejected': return '#f87171';
      default: return '#6b7280';
    }
  };

  // ---- Styles ----
  const S = {
    page: { padding: '24px 32px', width: '100%', maxWidth: '1600px', margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
    title: { fontSize: '24px', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: '12px' },
    statusPill: (running) => ({
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
      background: running ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)',
      color: running ? '#34d399' : '#f87171',
      border: `1px solid ${running ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
    }),
    tabs: { display: 'flex', gap: '4px', background: 'white', borderRadius: '12px', padding: '4px', marginBottom: '24px' },
    tab: (active) => ({
      padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
      fontSize: '13px', fontWeight: 600, transition: 'all 0.2s',
      background: active ? '#0096FF' : 'transparent',
      color: active ? 'white' : '#6b7280',
    }),
    card: {
      background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb',
      marginBottom: '12px', overflow: 'hidden', transition: 'all 0.2s',
    },
    cardHeader: {
      padding: '16px 20px', display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', cursor: 'pointer',
    },
    btn: (color, outline) => ({
      padding: '8px 16px', borderRadius: '8px', border: outline ? `1px solid ${color}` : 'none',
      background: outline ? 'transparent' : color, 
      color: outline ? color : (color === '#e5e7eb' ? '#4b5563' : 'white'),
      fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex',
      alignItems: 'center', gap: '6px', transition: 'all 0.2s', whiteSpace: 'nowrap',
    }),
    serverInfo: {
      background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb',
      padding: '24px', marginBottom: '24px',
    },
    qrSection: {
      background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb',
      padding: '24px',
    },
    input: {
      padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
      background: '#f3f4f6', color: '#111827', fontSize: '14px', outline: 'none',
      width: '80px', textAlign: 'center',
    },
    badge: (count) => ({
      background: count > 0 ? '#0096FF' : '#e5e7eb',
      color: 'white', padding: '2px 8px', borderRadius: '10px',
      fontSize: '11px', fontWeight: 700, marginLeft: '8px',
    }),
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.title}>
          <QrCode size={28} color="#0096FF" />
          QR Orders
          {pendingCount > 0 && <span style={S.badge(pendingCount)}>{pendingCount}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={S.statusPill(serverStatus.running)}>
            {serverStatus.running ? <Wifi size={14} /> : <WifiOff size={14} />}
            {serverStatus.running ? `Server: ${serverStatus.ip}:${serverStatus.port}` : 'Server Offline'}
          </div>
          <button onClick={handleRefresh} style={S.btn('#e5e7eb', false)} title="Refresh">
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        <button style={S.tab(activeTab === 'orders')} onClick={() => setActiveTab('orders')}>
          <ShoppingBag size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Pending Orders
          {pendingCount > 0 && <span style={{ ...S.badge(pendingCount), marginLeft: '8px' }}>{pendingCount}</span>}
        </button>
        <button style={S.tab(activeTab === 'history')} onClick={() => { setActiveTab('history'); loadAllOrders(); }}>
          <Clock size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Order History
        </button>
        <button style={S.tab(activeTab === 'qr')} onClick={() => setActiveTab('qr')}>
          <QrCode size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          QR Codes
        </button>
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div>
          {pendingOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
              <QrCode size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No pending QR orders</div>
              <div style={{ fontSize: '13px' }}>Orders from customers scanning QR codes will appear here</div>
            </div>
          ) : (
            pendingOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                expanded={expandedOrder === order.id}
                onToggle={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                onConfirm={() => handleConfirm(order.id)}
                onReject={() => handleReject(order.id)}
                confirming={confirmingId === order.id}
                rejecting={rejectingId === order.id}
                timeAgo={timeAgo}
                S={S}
              />
            ))
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div>
          {allOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
              <Clock size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <div style={{ fontSize: '16px', fontWeight: 600 }}>No QR order history</div>
            </div>
          ) : (
            allOrders.map(order => (
              <div key={order.id} style={S.card}>
                <div style={{ ...S.cardHeader, cursor: 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Hash size={16} color="#0096FF" />
                    <span style={{ fontWeight: 700, color: '#111827' }}>#{order.order_number}</span>
                    <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <QrCode size={12} /> Digital Order
                    </span>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px',
                      background: `${statusColor(order.status)}22`, color: statusColor(order.status),
                      textTransform: 'capitalize',
                    }}>{order.status}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: 700, color: '#111827' }}>₹{(order.total_amount || 0).toFixed(2)}</span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{timeAgo(order.created_at)}</span>
                  </div>
                </div>
                {order.items && order.items.length > 0 && (
                  <div style={{ padding: '0 20px 14px', borderTop: '1px solid #e5e7eb' }}>
                    {order.items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', color: '#6b7280' }}>
                        <span>{item.item_name} × {item.quantity}</span>
                        <span>₹{(item.item_total || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* QR Codes Tab */}
      {activeTab === 'qr' && (
        <div>
          {/* Server Info */}
          <div style={S.serverInfo}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Monitor size={20} color="#0096FF" />
              <span style={{ fontWeight: 700, fontSize: '16px', color: '#111827' }}>Server Status</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div style={{ background: '#f3f4f6', padding: '14px 18px', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Status</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: serverStatus.running ? '#34d399' : '#f87171' }}>
                  {serverStatus.running ? '● Running' : '● Stopped'}
                </div>
              </div>
              <div style={{ background: '#f3f4f6', padding: '14px 18px', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>IP Address</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>{serverStatus.ip || '—'}</div>
              </div>
              <div style={{ background: '#f3f4f6', padding: '14px 18px', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Port</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>{serverStatus.port || '—'}</div>
              </div>
              <div style={{ background: '#f3f4f6', padding: '14px 18px', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Menu URL</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0096FF', wordBreak: 'break-all' }}>
                  {serverStatus.running ? `http://${serverStatus.ip}:${serverStatus.port}/menu` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Generate QR */}
          <div style={S.qrSection}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <QrCode size={20} color="#0096FF" />
              <span style={{ fontWeight: 700, fontSize: '16px', color: '#111827' }}>Restaurant Menu QR Code</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0, flex: 1 }}>
                Generate a QR code for your restaurant menu. Customers scan this to view your menu and place orders. 
                Table assignment is done by the cashier when confirming orders in the POS.
              </p>
              <button 
                onClick={generateQR} 
                style={{ ...S.btn('#0096FF', false), padding: '12px 24px' }}
              >
                <QrCode size={18} /> Generate Menu QR
              </button>
            </div>

            {/* QR Display */}
            {qrDataUrl && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                background: '#f8fafc', borderRadius: '16px', padding: '30px',
                maxWidth: '400px', margin: '0 auto', border: '1px dashed #cbd5e1'
              }}>
                <img src={qrDataUrl} alt="QR Code" style={{ width: '250px', height: '250px', background: 'white', padding: '10px', borderRadius: '8px' }} />
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px', width: '100%' }}>
                   <button onClick={printQR} style={{ ...S.btn('#34d399', false), flex: 1 }}>
                    <Printer size={16} /> Print QR Code
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '16px', wordBreak: 'break-all', textAlign: 'center', opacity: 0.7 }}>
                  {qrUrl}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Print Copies Modal */}
      {isPrintModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '24px',
            width: '100%', maxWidth: '380px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Printer size={20} color="#0096FF" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Print QR Code</h3>
              </div>
              <button onClick={() => setIsPrintModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>
                How many copies do you want?
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button 
                  onClick={() => setPrintCopies(Math.max(1, printCopies - 1))}
                  style={{ 
                    width: '40px', height: '40px', borderRadius: '10px', border: '1px solid #e5e7eb',
                    background: 'white', fontSize: '20px', cursor: 'pointer'
                  }}
                >-</button>
                <input 
                  type="number" 
                  value={printCopies} 
                  onChange={(e) => setPrintCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ ...S.input, width: '100px', fontSize: '18px', fontWeight: 700 }} 
                />
                <button 
                  onClick={() => setPrintCopies(printCopies + 1)}
                  style={{ 
                    width: '40px', height: '40px', borderRadius: '10px', border: '1px solid #e5e7eb',
                    background: 'white', fontSize: '20px', cursor: 'pointer'
                  }}
                >+</button>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '12px' }}>
                Printing Menu QR code...
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setIsPrintModalOpen(false)} style={{ ...S.btn('#e5e7eb', false), flex: 1 }}>
                Cancel
              </button>
              <button onClick={handlePrintConfirm} style={{ ...S.btn('#0096FF', false), flex: 1 }}>
                Print Now
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </div>
  );
};

// Order Card Component
const OrderCard = ({ order, expanded, onToggle, onConfirm, onReject, confirming, rejecting, timeAgo, S }) => {
  return (
    <div style={{
      ...S.card,
      borderColor: '#fbbf2444',
      boxShadow: '0 0 0 1px rgba(251,191,36,0.1)',
    }}>
      <div style={S.cardHeader} onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'rgba(0,150,255,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Hash size={18} color="#0096FF" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px', color: '#111827' }}>
              Order #{order.order_number}
            </div>
            <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontWeight: 600 }}>
              <QrCode size={12} /> Digital Order
              {order.customer_name && <span style={{ color: '#6b7280', fontWeight: 400 }}>· {order.customer_name}</span>}
              <span style={{ color: '#6b7280', fontWeight: 400 }}>· {timeAgo(order.created_at)}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: '18px', color: '#111827' }}>
              ₹{(order.total_amount || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600 }}>
              {order.items?.length || 0} items · PENDING
            </div>
          </div>
          {expanded ? <ChevronUp size={18} color="#6b7280" /> : <ChevronDown size={18} color="#6b7280" />}
        </div>
      </div>

      {/* Expanded items */}
      {expanded && (
        <div style={{ borderTop: '1px solid #e5e7eb' }}>
          <div style={{ padding: '14px 20px' }}>
            {(order.items || []).map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: i < order.items.length - 1 ? '1px solid #e5e7eb' : 'none',
              }}>
                <div>
                  <span style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>
                    {item.item_name}
                  </span>
                  <span style={{ color: '#6b7280', fontSize: '13px' }}> × {item.quantity}</span>
                  {item.special_instructions && (
                    <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '2px' }}>
                      Note: {item.special_instructions}
                    </div>
                  )}
                </div>
                <span style={{ fontWeight: 600, color: '#6b7280', fontSize: '14px' }}>
                  ₹{(item.item_total || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {order.notes && (
            <div style={{
              padding: '10px 20px', background: '#f3f4f6',
              fontSize: '12px', color: '#fbbf24',
            }}>
              <AlertCircle size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              {order.notes}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            padding: '14px 20px', display: 'flex', gap: '10px',
            justifyContent: 'flex-end', background: '#f8fafc',
          }}>
            <button
              onClick={onReject}
              disabled={rejecting}
              style={{ ...S.btn('#f87171', true), opacity: rejecting ? 0.5 : 1 }}
            >
              <X size={15} /> {rejecting ? 'Rejecting...' : 'Reject'}
            </button>
            <button
              onClick={onConfirm}
              disabled={confirming}
              style={{ ...S.btn('#34d399', false), opacity: confirming ? 0.5 : 1 }}
            >
              <Check size={15} /> {confirming ? 'Confirming...' : 'Confirm & Bill'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QROrdersPage;
