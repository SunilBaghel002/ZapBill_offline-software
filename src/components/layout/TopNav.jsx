import React, { useState } from 'react';
import {
  Search,
  Bell,
  Plus,
  ChevronDown,
  Clock,
  MapPin,
  Wifi,
  WifiOff
} from 'lucide-react';

const TopNav = ({ onNewOrder }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  React.useEffect(() => {
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
      <div className="top-nav-search">
        <Search size={18} className="top-nav-search-icon" />
        <input
          type="text"
          placeholder="Search orders, items, customers..."
          className="top-nav-search-input"
        />
      </div>

      {/* Center Section - Outlet Selector */}
      <div className="top-nav-center">
        <button className="top-nav-outlet">
          <MapPin size={16} />
          <span>Main Branch</span>
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Right Section */}
      <div className="top-nav-right">
        {/* Quick Action */}
        <button className="top-nav-btn primary" onClick={onNewOrder}>
          <Plus size={18} />
          <span>New Order</span>
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

        {/* Notifications */}
        <button className="top-nav-icon-btn">
          <Bell size={20} />
          <span className="top-nav-notification-badge">5</span>
        </button>

        {/* User Avatar */}
        <button className="top-nav-avatar">
          <span>JD</span>
        </button>
      </div>
    </header>
  );
};

export default TopNav;
