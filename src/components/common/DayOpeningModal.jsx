import React, { useState, useEffect } from 'react';
import { useShift } from '../../context/ShiftContext';
import { useAuthStore } from '../../stores/authStore';
import { Sun, AlertCircle, Calendar, ArrowRight, Wallet } from 'lucide-react';

const DayOpeningModal = ({ isOpen, onClose }) => {
  const { openDay, error } = useShift();
  const { user } = useAuthStore();
  const [openingBalance, setOpeningBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setAnimate(true), 50);
    } else {
      setAnimate(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await openDay(openingBalance || 0);

    setLoading(false);
    if (result.success) {
      setOpeningBalance('');
      onClose();
    }
  };

  const today = new Date();
  const dayName = today.toLocaleDateString('en-IN', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="modal-overlay" style={{ 
      backdropFilter: 'blur(8px)',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
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
          background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
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
            <Sun size={40} strokeWidth={1.5} />
          </div>

          <h2 style={{ 
            fontSize: '1.75rem', 
            fontWeight: '800', 
            marginBottom: 'var(--spacing-2)',
            letterSpacing: '-0.025em'
          }}>
            Welcome Back!
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
            <Calendar size={14} />
            <span>{dayName}, {dateStr}</span>
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
                Start New Business Day
              </h3>
              <p style={{ color: 'var(--gray-500)', fontSize: '0.925rem', lineHeight: '1.5' }}>
                Initializing the system for a fresh day of operations. Please confirm the opening outlet balance.
              </p>
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
                Outlet Opening Balance
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
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
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
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.1)';
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
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '8px', paddingLeft: '4px' }}>
                * Leaves blank or enter 0 if no starting cash is present.
              </p>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ 
                width: '100%', 
                height: '60px', 
                fontSize: '1.125rem', 
                fontWeight: '700',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                border: 'none',
                boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.4)',
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
                  e.currentTarget.style.boxShadow = '0 15px 25px -5px rgba(37, 99, 235, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(37, 99, 235, 0.4)';
                }
              }}
              disabled={loading}
            >
              {loading ? (
                <>Opening...</>
              ) : (
                <>
                  Start Business Day
                  <ArrowRight size={20} />
                </>
              )}
            </button>
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

export default DayOpeningModal;

