import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  RefreshCw
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const MainSidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

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
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', adminOnly: true },
    { path: '/pos', icon: ShoppingCart, label: 'POS / Billing', adminOnly: false },
    { path: '/orders', icon: ClipboardList, label: 'Orders', badge: activeOrdersCount > 0 ? activeOrdersCount : null, adminOnly: false },
    { path: '/menu', icon: UtensilsCrossed, label: 'Menu', adminOnly: true },
    { path: '/kot', icon: ChefHat, label: 'Kitchen (KOT)', adminOnly: false },
    { path: '/inventory', icon: Package, label: 'Inventory', adminOnly: true },
    { path: '/reports', icon: BarChart3, label: 'Reports', adminOnly: true },
    { path: '/users', icon: Users, label: 'Users', adminOnly: true },
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
        <div style={{ padding: '20px', borderBottom: '1px solid #37474F', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#0096FF', padding: '8px', borderRadius: '8px' }}>
                    <UtensilsCrossed size={24} color="white" />
                </div>
                <div>
                    <div style={{ fontWeight: 'bold', fontSize: '18px' }}>ZapBill</div>
                    <div style={{ fontSize: '12px', color: '#90A4AE' }}>POS System</div>
                </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#90A4AE', cursor: 'pointer' }}>
                <X size={24} />
            </button>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
            {navItems.map((item) => (
            <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => 
                 isActive ? 'active-nav-link' : ''
                }
                style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 24px',
                    color: isActive ? 'white' : '#B0BEC5',
                    textDecoration: 'none',
                    background: isActive ? '#0284c7' : 'transparent',
                    borderLeft: isActive ? '4px solid #0096FF' : '4px solid transparent',
                    transition: 'all 0.2s'
                })}
            >
                <item.icon size={20} />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.label}</span>
                {item.badge && (
                <span style={{ marginLeft: 'auto', background: '#0096FF', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }}>
                    {item.badge}
                </span>
                )}
            </NavLink>
            ))}
        </nav>

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
