import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  ClipboardList,
  Package,
  BarChart3,
  Users,
  Settings,
  ChefHat,
  X,
  LogOut,
  RefreshCw,
  Wallet,
  Printer
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useShift } from '../../context/ShiftContext';
import ShiftModal from '../common/ShiftModal';

const MainSidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuthStore();
  const { endShift } = useShift();
  const navigate = useNavigate();
  const location = useLocation();
  const [showEndShiftModal, setShowEndShiftModal] = React.useState(false);
  const [expandedMenu, setExpandedMenu] = React.useState(null);

  const [activeOrdersCount, setActiveOrdersCount] = React.useState(0);

  React.useEffect(() => {
    const fetchCount = async () => {
      try {
        const count = await window.electronAPI.invoke('order:getActiveCount');
        setActiveOrdersCount(count);
      } catch (err) {
        console.error('Failed to fetch active order count', err);
      }
    };

    if (isOpen) {
      fetchCount();
      // Poll only when open
      const interval = setInterval(fetchCount, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const isAdmin = user?.role === 'admin';

  // All nav items with role restrictions
  const allNavItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', adminOnly: false },
    { path: '/pos', icon: ShoppingCart, label: 'POS / Billing', adminOnly: false },
    { path: '/orders', icon: ClipboardList, label: 'Orders', badge: activeOrdersCount > 0 ? activeOrdersCount : null, adminOnly: false },
    { path: '/menu', icon: UtensilsCrossed, label: 'Menu', adminOnly: true },
    { path: '/kot', icon: ChefHat, label: 'Kitchen (KOT)', adminOnly: false },
    { path: '/inventory', icon: Package, label: 'Inventory', adminOnly: false },
    { 
      path: '/reports', 
      icon: BarChart3, 
      label: 'Reports', 
      adminOnly: true,
      children: [
        { path: '/reports?category=sales', label: 'Sales Reports' },
        { path: '/reports?category=inventory', label: 'Inventory Reports' },
        { path: '/reports?category=crm', label: 'CRM Reports' },
        { path: '/reports?category=staff', label: 'Staff Reports' },
        { path: '/reports?category=payment', label: 'Payment Reports' },
      ]
    },
    { path: '/expenses', icon: Wallet, label: 'Expenses', adminOnly: false },
    { path: '/users', icon: Users, label: 'Users', adminOnly: true },
    { path: '/printers', icon: Printer, label: 'Printers', adminOnly: false },
    { path: '/settings', icon: Settings, label: 'Settings', adminOnly: true },
  ];

  // Filter based on role
  const navItems = isAdmin 
    ? allNavItems 
    : allNavItems.filter(item => !item.adminOnly);

  const handleSwitchUser = async () => {
    await logout();
    onClose();
    navigate('/login');
  };

  const handleLogout = async () => {
    await logout();
    onClose();
    navigate('/login');
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`pos-drawer-overlay ${isOpen ? 'active' : ''}`} 
        onClick={onClose}
        style={{ zIndex: 1000 }}
      ></div>

      {/* Sidebar Drawer */}
      <aside 
        className={`pos-main-sidebar ${isOpen ? 'active' : ''}`}
        style={{
            position: 'fixed',
            top: 0,
            left: isOpen ? 0 : '-280px',
            width: '280px',
            height: '100vh',
            background: '#1A2327',
            color: 'white',
            zIndex: 1001,
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '2px 0 10px rgba(0,0,0,0.3)'
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #37474F', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/logo.png" alt="ZapBill Logo" style={{ maxWidth: '100px', height: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            <button onClick={onClose} style={{ position: 'absolute', right: '12px', top: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', padding: '6px', border: 'none', color: '#90A4AE', cursor: 'pointer', display: 'flex', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}>
                <X size={20} />
            </button>
        </div>

        {/* Nav Items */}
        <nav className="sidebar-nav" style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
            {navItems.map((item) => {
              if (item.children) {
                const isExpanded = expandedMenu === item.path;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <div key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => setExpandedMenu(isExpanded ? null : item.path)}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 24px',
                      color: (isActive || isExpanded) ? 'white' : '#B0BEC5',
                      background: (isActive || isExpanded) ? 'rgba(0, 150, 255, 0.1)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      borderLeft: isActive ? '4px solid #0096FF' : '4px solid transparent',
                      textDecoration: 'none'
                    })}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <item.icon size={24} />
                      <span style={{ fontSize: '15px', fontWeight: 600 }}>{item.label}</span>
                    </div>
                    <span style={{ fontSize: '10px', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', opacity: 0.5 }}>▼</span>
                  </NavLink>
                    {isExpanded && (
                      <div style={{ background: 'rgba(0,0,0,0.2)', paddingBottom: '4px' }}>
                        {item.children.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            onClick={onClose}
                            style={({ isActive }) => ({
                              display: 'flex',
                              alignItems: 'center',
                              padding: '12px 24px 12px 64px',
                              color: isActive ? 'white' : '#B0BEC5',
                              textDecoration: 'none',
                              fontSize: '14px',
                              background: isActive ? 'rgba(0, 150, 255, 0.15)' : 'transparent',
                              transition: 'all 0.2s'
                            })}
                          >
                            <span>{child.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '14px 24px',
                        color: isActive ? 'white' : '#B0BEC5',
                        textDecoration: 'none',
                        background: isActive ? 'rgba(0, 150, 255, 0.15)' : 'transparent',
                        borderLeft: isActive ? '4px solid #0096FF' : '4px solid transparent',
                        transition: 'all 0.2s'
                    })}
                >
                    <item.icon size={24} />
                    <span style={{ fontSize: '15px', fontWeight: 600 }}>{item.label}</span>
                    {item.badge && (
                    <span style={{ marginLeft: 'auto', background: '#0096FF', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                        {item.badge}
                    </span>
                    )}
                </NavLink>
              );
            })}

            {/* End Day Button */}
            <button
              onClick={() => {
                setShowEndShiftModal(true);
              }}
              style={{ 
                width: '100%', 
                border: 'none', 
                background: 'none', 
                cursor: 'pointer',
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '14px 24px',
                color: '#B0BEC5',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.color = 'white'}
              onMouseOut={e => e.currentTarget.style.color = '#B0BEC5'}
            >
              <LogOut size={24} />
              <span style={{ fontSize: '15px', fontWeight: 600 }}>End Day</span>
            </button>
        </nav>

        <ShiftModal 
          isOpen={showEndShiftModal} 
          type="end" 
          onClose={() => setShowEndShiftModal(false)} 
        />

        {/* User Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid #37474F', background: '#263238' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#455A64', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600' }}>{user?.fullName || user?.username || 'User'}</div>
                    <div style={{ fontSize: '12px', color: '#B0BEC5', textTransform: 'capitalize' }}>{user?.role || 'Staff'}</div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                    onClick={handleSwitchUser}
                    style={{ flex: 1, padding: '10px', background: '#37474F', border: 'none', borderRadius: '4px', color: '#CFD8DC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', transition: 'background 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = '#455A64'}
                    onMouseOut={e => e.currentTarget.style.background = '#37474F'}
                    title="Switch to another biller"
                >
                    <RefreshCw size={14} /> Switch User
                </button>
                <button 
                    onClick={handleLogout}
                    style={{ padding: '10px 14px', background: '#0096FF', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', transition: 'background 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = '#0284c7'}
                    onMouseOut={e => e.currentTarget.style.background = '#0096FF'}
                    title="Logout"
                >
                    <LogOut size={14} />
                </button>
            </div>
        </div>
      </aside>
    </>
  );
};

export default MainSidebar;
