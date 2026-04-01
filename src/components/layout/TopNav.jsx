import React, { useState, useEffect } from 'react';
import {
  Plus,
  Clock,
  Wifi,
  WifiOff,
  Search,
  QrCode
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useQROrderStore } from '../../stores/qrOrderStore';
import { useNavigate } from 'react-router-dom';

const TopNav = ({ onNewOrder }) => {
  const { user } = useAuthStore();
  const { pendingCount } = useQROrderStore();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate('/orders', { state: { search: searchTerm } });
      setSearchTerm(''); // clear after search
    }
  };

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <header className="top-nav">
      {/* Search Section */}
      <form className="top-nav-search" onSubmit={handleSearch}>
        <Search size={18} className="top-nav-search-icon" />
        <input
          type="text"
          placeholder="Search orders, items, customers..."
          className="top-nav-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </form>

      {/* Right Section */}
      <div className="top-nav-right">
        {/* Quick Action */}
        <button className="top-nav-btn primary" onClick={onNewOrder}>
          <Plus size={18} />
          <span>New Order</span>
        </button>

        {/* QR Orders Badge */}
        <button
          onClick={() => navigate('/qr-orders')}
          style={{
            position: 'relative',
            background: pendingCount > 0 ? 'rgba(0, 150, 255, 0.15)' : 'transparent',
            border: '1px solid ' + (pendingCount > 0 ? 'rgba(0, 150, 255, 0.3)' : '#2d3840'),
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: pendingCount > 0 ? '#0096FF' : '#9aa0a6',
            transition: 'all 0.2s',
          }}
          title="QR Orders"
        >
          <QrCode size={18} />
          {pendingCount > 0 && (
            <span style={{
              position: 'absolute', top: '-6px', right: '-6px',
              background: '#f87171', color: 'white', fontSize: '10px',
              fontWeight: 700, borderRadius: '10px', padding: '1px 5px',
              minWidth: '16px', textAlign: 'center', lineHeight: '14px',
            }}>
              {pendingCount}
            </span>
          )}
        </button>

        {/* Date/Time */}
        <div className="top-nav-datetime">
          <Clock size={14} />
          <span>{formatDate(currentTime)}</span>
          <span className="top-nav-time">{formatTime(currentTime)}</span>
        </div>

        {/* Status Indicator */}
        <div className={`top-nav-status ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* User Avatar */}
        <button className="top-nav-avatar">
          <span>{user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}</span>
        </button>
      </div>
    </header>
  );
};

export default TopNav;
