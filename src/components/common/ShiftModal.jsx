import React, { useState, useEffect } from 'react';
import { useShift } from '../../context/ShiftContext'; // Adjust path if needed
import { useAuthStore } from '../../stores/authStore';
import { DollarSign, Clock, AlertCircle, ArrowRight, Wallet } from 'lucide-react';

const ShiftModal = ({ isOpen, type, onClose }) => {
  const { startShift, endShift, error } = useShift();
  const { user } = useAuthStore();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [expectedCash, setExpectedCash] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setAnimate(true), 50);
      
      const fetchExpectedCash = async () => {
        try {
          const today = new Date().toLocaleDateString('en-CA');
          const todayReport = await window.electronAPI.invoke('reports:daily', { date: today });
          if (todayReport && todayReport.sales) {
            const cashSales = todayReport.sales.cash_amount !== undefined ? todayReport.sales.cash_amount : 
                             (todayReport.sales.cash_sales !== undefined ? todayReport.sales.cash_sales : 0);
            const cash = (todayReport.sales.opening_balance || 0) + cashSales - (todayReport.sales.total_expenses || 0);
            setExpectedCash(cash);
          }
        } catch (err) {
          console.error('Failed to fetch expected cash:', err);
        }
      };
      
      fetchExpectedCash();
    } else {
      setAnimate(false);
      setExpectedCash(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    let result;
    if (type === 'start') {
      result = await startShift(amount || 0);
    } else {
      result = await endShift(amount || 0);
    }

    setLoading(false);
    if (result.success) {
      setAmount('');
      onClose();
    }
  };

  const isStart = type === 'start';
  const themeColor = isStart ? '#10b981' : '#f59e0b';
  const themeGradient = isStart ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
  const shadowColor = isStart ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)';

  const today = new Date();
  const timeStr = today.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="modal-overlay" style={{ 
      backdropFilter: 'blur(8px)',
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      transition: 'opacity 0.3s ease',
      opacity: animate ? 1 : 0
    }}>
      <div className="modal-content" style={{ 
        maxWidth: '460px', 
        padding: 0, 
        overflow: 'hidden',
        border: 'none',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        transform: animate ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* Premium Header with Gradient */}
        <div style={{
          background: themeGradient,
          padding: 'var(--spacing-8) var(--spacing-6)',
          textAlign: 'center',
          position: 'relative',
          color: 'white'
        }}>
          {/* Decorative Elements */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '120px',
            height: '120px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
          }} />
          
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '24px',
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--spacing-6)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            animation: 'pulse 2s infinite ease-in-out'
          }}>
            {isStart ? <Clock size={40} strokeWidth={1.5} /> : <DollarSign size={40} strokeWidth={1.5} />}
          </div>

          <h2 style={{ 
            fontSize: '1.75rem', 
            fontWeight: '800', 
            marginBottom: 'var(--spacing-2)',
            letterSpacing: '-0.025em'
          }}>
            {isStart ? 'Start Shift' : 'End Shift'}
          </h2>
          
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '6px 16px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '100px',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}>
            <Clock size={14} />
            <span>{timeStr}</span>
          </div>
        </div>
        
        <div style={{ padding: 'var(--spacing-8) var(--spacing-6)' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 'var(--spacing-8)' }}>
              <h3 style={{ 
                fontSize: '1.125rem', 
                fontWeight: '700', 
                color: 'var(--gray-900)',
                marginBottom: 'var(--spacing-2)'
              }}>
                Hello, {user?.full_name || user?.username || 'User'}!
              </h3>
              <p style={{ color: 'var(--gray-500)', fontSize: '0.925rem', lineHeight: '1.5' }}>
                {isStart 
                  ? 'Please enter the starting cash amount in your drawer to begin your shift.'
                  : 'Please enter the final cash amount in your drawer to close your shift.'}
              </p>

              {expectedCash !== null && (
                <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                     <Wallet size={16} /> Expected Cash in Drawer:
                  </span>
                  <span style={{ fontWeight: '800', fontSize: '16px' }}>₹{expectedCash.toLocaleString()}</span>
                </div>
              )}
            </div>

            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-3)',
                padding: 'var(--spacing-4)',
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                color: '#b91c1c',
                borderRadius: '16px',
                marginBottom: 'var(--spacing-6)',
                fontSize: '0.875rem',
              }}>
                <AlertCircle size={18} />
                <span style={{ fontWeight: '500' }}>{error}</span>
              </div>
            )}

            <div style={{
              background: 'var(--gray-50)',
              padding: 'var(--spacing-5)',
              borderRadius: '20px',
              border: '1px solid var(--gray-200)',
              marginBottom: 'var(--spacing-8)'
            }}>
              <label style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '700',
                fontSize: '0.875rem',
                color: 'var(--gray-700)',
                marginBottom: 'var(--spacing-3)'
              }}>
                <Wallet size={16} />
                {isStart ? 'Starting Cash Amount' : 'Closing Cash Amount'}
              </label>
              
              <div style={{ position: 'relative' }}>
                <div style={{ 
                  position: 'absolute', 
                  left: '16px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: 'var(--gray-900)',
                  fontWeight: '700',
                  fontSize: '1.25rem'
                }}>₹</div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ 
                    width: '100%',
                    height: '60px', 
                    padding: '0 16px 0 44px',
                    fontSize: '1.5rem',
                    fontWeight: '800',
                    background: 'white',
                    border: '2px solid var(--gray-200)',
                    borderRadius: '16px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    color: 'var(--gray-900)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = themeColor;
                    e.target.style.boxShadow = `0 0 0 4px ${shadowColor.replace('0.4', '0.1')}`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--gray-200)';
                    e.target.style.boxShadow = 'none';
                  }}
                  min="0"
                  step="0.01"
                  autoFocus
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button"
                className="btn btn-ghost"
                onClick={onClose}
                style={{ 
                  flex: 1, 
                  height: '60px', 
                  borderRadius: '18px',
                  fontSize: '1.125rem',
                  fontWeight: '700'
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                style={{ 
                  flex: 2, 
                  height: '60px', 
                  fontSize: '1.125rem', 
                  fontWeight: '700',
                  borderRadius: '18px',
                  background: themeGradient,
                  color: 'white',
                  border: 'none',
                  boxShadow: `0 10px 20px -5px ${shadowColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  transition: 'all 0.3s ease',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.8 : 1
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 15px 25px -5px ${shadowColor.replace('0.4', '0.5')}`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = `0 10px 20px -5px ${shadowColor}`;
                  }
                }}
                disabled={loading}
              >
                {loading ? (
                  <>Processing...</>
                ) : (
                  <>
                    {isStart ? 'Start Shift' : 'End Shift'}
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ShiftModal;

