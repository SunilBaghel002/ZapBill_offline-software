import React, { useState } from 'react';
import { useShift } from '../../context/ShiftContext'; // Adjust path if needed
import { useAuthStore } from '../../stores/authStore';
import { DollarSign, Clock, AlertCircle } from 'lucide-react';

const ShiftModal = ({ isOpen, type, onClose }) => {
  const { startShift, endShift, error } = useShift();
  const { user } = useAuthStore();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2 className="modal-title">
            {type === 'start' ? 'Start Shift' : 'End Shift'}
          </h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-4)' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: type === 'start' ? 'var(--success-50)' : 'var(--warning-50)',
              color: type === 'start' ? 'var(--success-600)' : 'var(--warning-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--spacing-4)',
            }}>
              {type === 'start' ? <Clock size={32} /> : <DollarSign size={32} />}
            </div>
            <p style={{ color: 'var(--gray-600)' }}>
              {type === 'start' 
                ? `Hello, ${user?.full_name || 'User'}! Please enter the opening cash amount to start your shift.`
                : 'Please enter the closing cash amount to end your shift.'}
            </p>
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-2)',
              padding: 'var(--spacing-3)',
              background: 'var(--error-50)',
              color: 'var(--error-700)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--spacing-4)',
              fontSize: 'var(--font-size-sm)',
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="input-group">
            <label className="input-label">
              {type === 'start' ? 'Opening Cash Amount' : 'Closing Cash Amount'}
            </label>
            <div style={{ position: 'relative' }}>
              <DollarSign 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: 'var(--gray-400)'
                }} 
              />
              <input
                type="number"
                className="input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                style={{ paddingLeft: '40px' }}
                min="0"
                step="0.01"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="modal-footer" style={{ padding: 0, marginTop: 'var(--spacing-6)' }}>
            <button 
              type="button" 
              className="btn btn-ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={`btn ${type === 'start' ? 'btn-success' : 'btn-warning'}`}
              disabled={loading}
            >
              {loading ? 'Processing...' : (type === 'start' ? 'Start Shift' : 'End Shift')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftModal;
