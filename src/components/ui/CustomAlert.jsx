import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

const CustomAlert = ({ isOpen, message, type = 'info', onClose, onConfirm }) => {
  useEffect(() => {
    if (isOpen && type !== 'confirm') {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, type, onClose]);

  if (!isOpen) return null;

  // Config based on type
  const config = {
    success: {
      icon: <CheckCircle size={48} color="#2E7D32" />,
      bg: '#E8F5E9',
      borderColor: '#A5D6A7',
      title: 'Success',
      titleColor: '#2E7D32'
    },
    error: {
      icon: <XCircle size={48} color="#C62828" />,
      bg: '#FFEBEE',
      borderColor: '#EF9A9A',
      title: 'Error',
      titleColor: '#C62828'
    },
    warning: {
      icon: <AlertTriangle size={48} color="#EF6C00" />,
      bg: '#FFF3E0',
      borderColor: '#FFCC80',
      title: 'Warning',
      titleColor: '#EF6C00'
    },
    info: {
      icon: <Info size={48} color="#1565C0" />,
      bg: '#E3F2FD',
      borderColor: '#90CAF9',
      title: 'Information',
      titleColor: '#1565C0'
    },
    confirm: {
      icon: <Info size={48} color="#1565C0" />,
      bg: '#E3F2FD',
      borderColor: '#90CAF9',
      title: 'Confirm',
      titleColor: '#1565C0'
    }
  };

  const currentConfig = config[type] || config.info;

  return (
    <div className="modal-overlay" style={{ zIndex: 3000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}>
      <div 
        className="custom-alert-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          width: '400px',
          maxWidth: '90%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          animation: 'scaleIn 0.2s ease-out',
          borderTop: `4px solid ${currentConfig.titleColor}`
        }}
      >
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ 
            background: currentConfig.bg, 
            padding: '16px', 
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {currentConfig.icon}
          </div>
        </div>

        <h3 style={{ margin: '0 0 8px 0', color: '#37474F', fontSize: '20px' }}>
          {currentConfig.title}
        </h3>
        
        <p style={{ margin: '0 0 24px 0', color: '#546E7A', fontSize: '15px', lineHeight: '1.5' }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {type === 'confirm' ? (
            <>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '10px 20px', borderRadius: '8px', border: '1px solid #CFD8DC',
                  background: 'white', color: '#546E7A', fontWeight: '600', cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => { onConfirm && onConfirm(); onClose(); }}
                style={{
                  flex: 1, padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: currentConfig.titleColor, color: 'white', fontWeight: '600', cursor: 'pointer'
                }}
              >
                Confirm
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '10px 20px', borderRadius: '8px', border: 'none',
                background: currentConfig.titleColor, color: 'white', fontWeight: '600', cursor: 'pointer'
              }}
            >
              OK
            </button>
          )}
        </div>
      </div>
      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default CustomAlert;
