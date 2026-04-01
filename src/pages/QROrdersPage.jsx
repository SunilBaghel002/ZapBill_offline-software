import React, { useState, useEffect, useCallback } from 'react';
import { useQROrderStore } from '../stores/qrOrderStore';
import { useAuthStore } from '../stores/authStore';
import { useAlertStore } from '../stores/alertStore';
import {
  QrCode, Wifi, WifiOff, RefreshCw, Check, X, Clock,
  Printer, Download, ChevronDown, ChevronUp, Hash, MapPin,
  ShoppingBag, AlertCircle, Monitor
} from 'lucide-react';

const QROrdersPage = () => {
  const { user } = useAuthStore();
  const { showAlert } = useAlertStore();
  const {
    pendingOrders, pendingCount, serverStatus,
    fetchPendingOrders, fetchServerStatus, confirmOrder, rejectOrder
  } = useQROrderStore();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'qr'
  const [allOrders, setAllOrders] = useState([]);
  const [tableNumber, setTableNumber] = useState('1');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [bulkRange, setBulkRange] = useState({ from: 1, to: 10 });
  const [bulkQRs, setBulkQRs] = useState([]);
  const [showBulk, setShowBulk] = useState(false);

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
          await window.electronAPI.invoke('print:kotRouted', { 
            order: orderData, 
            items: orderData.items, 
            printBill: true 
          });
          showAlert('Order confirmed. Bill & KOT printed!', 'success');
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

  const generateQR = async (table) => {
    try {
      const result = await window.electronAPI.invoke('qr:generateQR', { tableNumber: table || tableNumber });
      if (result.success) {
        setQrDataUrl(result.dataUrl);
        setQrUrl(result.url);
      }
    } catch (e) {
      console.error('Failed to generate QR:', e);
    }
  };

  const generateBulkQR = async () => {
    const qrs = [];
    for (let t = bulkRange.from; t <= bulkRange.to; t++) {
      try {
        const result = await window.electronAPI.invoke('qr:generateQR', { tableNumber: t.toString() });
        if (result.success) {
          qrs.push({ table: t, dataUrl: result.dataUrl, url: result.url });
        }
      } catch (e) {
        console.error(`Failed to generate QR for table ${t}:`, e);
      }
    }
    setBulkQRs(qrs);
  };

  const printQR = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    if (!printWindow) return;
    
    let content = '';
    if (bulkQRs.length > 0) {
      content = bulkQRs.map(q => `
        <div style="text-align:center; page-break-after:always; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; padding:40px; box-sizing:border-box;">
          <h1 style="font-size:3rem; margin-bottom:30px; color:#111827;">Table ${q.table}</h1>
          <img src="${q.dataUrl}" style="width:60vmin; height:60vmin; max-width:500px; max-height:500px; margin-bottom:30px;" />
          <p style="font-size:1.5rem; color:#4b5563; font-weight:600;">Scan to view menu & order</p>
        </div>
      `).join('');
    } else if (qrDataUrl) {
      content = `
        <div style="text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; padding:40px; box-sizing:border-box;">
          <h1 style="font-size:3rem; margin-bottom:30px; color:#111827;">Table ${tableNumber}</h1>
          <img src="${qrDataUrl}" style="width:60vmin; height:60vmin; max-width:500px; max-height:500px; margin-bottom:30px;" />
          <p style="font-size:1.5rem; color:#4b5563; font-weight:600;">Scan to view menu & order</p>
        </div>
      `;
    }
    
    printWindow.document.write(`
      <html><head><title>Print QR Codes</title>
      <style>body{font-family:Arial,sans-serif;margin:0}@media print{.no-print{display:none}}</style>
      </head><body>${content}
      <script>setTimeout(()=>window.print(),300)<\/script>
      </body></html>
    `);
    printWindow.document.close();
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
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Table {order.table_number || '?'}</span>
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
              <span style={{ fontWeight: 700, fontSize: '16px', color: '#111827' }}>Generate QR Code</span>
            </div>

            {/* Single Table QR */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 600 }}>Table Number:</span>
              <input
                type="number"
                min="1"
                max="999"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                style={S.input}
              />
              <button onClick={() => generateQR()} style={S.btn('#0096FF', false)}>
                <QrCode size={15} /> Generate
              </button>
              {qrDataUrl && (
                <button onClick={printQR} style={S.btn('#34d399', false)}>
                  <Printer size={15} /> Print
                </button>
              )}
            </div>

            {/* QR Display */}
            {qrDataUrl && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                background: 'white', borderRadius: '16px', padding: '30px',
                maxWidth: '300px', margin: '0 auto 24px',
              }}>
                <img src={qrDataUrl} alt="QR Code" style={{ width: '220px', height: '220px' }} />
                <div style={{ marginTop: '12px', fontWeight: 800, fontSize: '22px', color: 'white' }}>
                  Table {tableNumber}
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                  Scan to view menu & order
                </div>
                <div style={{ fontSize: '9px', color: '#999', marginTop: '8px', wordBreak: 'break-all', textAlign: 'center' }}>
                  {qrUrl}
                </div>
              </div>
            )}

            {/* Bulk Generation */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
              <button onClick={() => setShowBulk(!showBulk)} style={{ ...S.btn('#e5e7eb', false), marginBottom: '16px' }}>
                {showBulk ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                Bulk Generate QR Codes
              </button>

              {showBulk && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>Tables</span>
                    <input
                      type="number"
                      min="1"
                      value={bulkRange.from}
                      onChange={(e) => setBulkRange({ ...bulkRange, from: parseInt(e.target.value) || 1 })}
                      style={S.input}
                    />
                    <span style={{ color: '#6b7280' }}>to</span>
                    <input
                      type="number"
                      min="1"
                      value={bulkRange.to}
                      onChange={(e) => setBulkRange({ ...bulkRange, to: parseInt(e.target.value) || 10 })}
                      style={S.input}
                    />
                    <button onClick={generateBulkQR} style={S.btn('#0096FF', false)}>
                      <QrCode size={15} /> Generate All
                    </button>
                    {bulkQRs.length > 0 && (
                      <button onClick={printQR} style={S.btn('#34d399', false)}>
                        <Printer size={15} /> Print All
                      </button>
                    )}
                  </div>

                  {bulkQRs.length > 0 && (
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                      gap: '24px',
                    }}>
                      {bulkQRs.map(q => (
                        <div key={q.table} style={{
                          background: 'white', borderRadius: '12px', padding: '16px',
                          textAlign: 'center', border: '1px solid #e5e7eb',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                        }}>
                          <img src={q.dataUrl} alt={`Table ${q.table}`} style={{ width: '100%', height: 'auto', aspectRatio: '1/1', objectFit: 'contain' }} />
                          <div style={{ fontWeight: 700, color: '#111827', marginTop: '12px', fontSize: '16px' }}>
                            Table {q.table}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
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
            <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <MapPin size={12} /> Table {order.table_number || '?'}
              {order.customer_name && <span>· {order.customer_name}</span>}
              <span>· {timeAgo(order.created_at)}</span>
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
