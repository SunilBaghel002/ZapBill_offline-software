import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQROrderStore } from '../../stores/qrOrderStore';
import { QrCode, X } from 'lucide-react';

const QROrderNotification = () => {
  const { newOrderAlert, clearNewOrderAlert, handleNewOrder, fetchPendingOrders } = useQROrderStore();
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Listen for real-time QR order notifications from main process
  useEffect(() => {
    fetchPendingOrders();

    const unsubscribe = window.electronAPI.on('qr:newOrder', (order) => {
      handleNewOrder(order);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Play notification sound using Web Audio API
  const playNotificationSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      
      // Create a pleasant two-tone chime
      const playTone = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      const now = ctx.currentTime;
      playTone(880, now, 0.15);
      playTone(1174.66, now + 0.15, 0.15);
      playTone(1318.51, now + 0.3, 0.2);
    } catch (e) {
      console.log('Audio notification not available');
    }
  };

  // Auto-dismiss and play sound on new alert
  useEffect(() => {
    if (newOrderAlert) {
      playNotificationSound();
      
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        clearNewOrderAlert();
      }, 10000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [newOrderAlert]);

  if (!newOrderAlert) return null;

  const handleClick = () => {
    clearNewOrderAlert();
    navigate('/qr-orders');
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 10000,
        background: 'linear-gradient(135deg, #0096FF 0%, #0073CC 100%)',
        color: 'white',
        padding: '16px 20px',
        borderRadius: '14px',
        boxShadow: '0 8px 32px rgba(0, 150, 255, 0.4), 0 2px 8px rgba(0,0,0,0.3)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        maxWidth: '380px',
        animation: 'qrSlideIn 0.4s ease forwards',
        border: '1px solid rgba(255,255,255,0.2)',
      }}
    >
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <QrCode size={24} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>
          New QR Order!
        </div>
        <div style={{ fontSize: '12px', opacity: 0.9 }}>
          Table {newOrderAlert.table_number || '?'} — ₹{(newOrderAlert.total_amount || 0).toFixed(2)}
          {newOrderAlert.items && ` · ${newOrderAlert.items.length} item${newOrderAlert.items.length !== 1 ? 's' : ''}`}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); clearNewOrderAlert(); }}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>

      <style>{`
        @keyframes qrSlideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default QROrderNotification;
