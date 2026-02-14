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
  LogOut,
  ChefHat,
  RefreshCw
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const Sidebar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';

  const allNavItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', adminOnly: true },
    { path: '/pos', icon: ShoppingCart, label: 'POS / Billing', adminOnly: false },
    { path: '/orders', icon: ClipboardList, label: 'Orders', badge: 3, adminOnly: false },
    { path: '/menu', icon: UtensilsCrossed, label: 'Menu', adminOnly: true },
    { path: '/kot', icon: ChefHat, label: 'Kitchen (KOT)', adminOnly: false },
    { path: '/inventory', icon: Package, label: 'Inventory', adminOnly: true },
    { path: '/reports', icon: BarChart3, label: 'Reports', adminOnly: true },
    { path: '/users', icon: Users, label: 'Users', adminOnly: true },
    { path: '/settings', icon: Settings, label: 'Settings', adminOnly: true },
  ];

  const navItems = isAdmin
    ? allNavItems
    : allNavItems.filter(item => !item.adminOnly);

  const handleSwitchUser = async () => {
    await logout();
    navigate('/login');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo Section */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <UtensilsCrossed size={28} />
        </div>
        <div className="sidebar-logo-text">
          <span className="sidebar-brand">ZapBill</span>
          <span className="sidebar-tagline">POS System</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={22} className="sidebar-nav-icon" />
            <span className="sidebar-nav-label">{item.label}</span>
            {item.badge && (
              <span className="sidebar-badge">{item.badge}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Section */}
      <div className="sidebar-user">
        <div className="sidebar-user-avatar">
          {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{user?.fullName || user?.username || 'User'}</span>
          <span className="sidebar-user-role">{user?.role || 'Staff'}</span>
        </div>
        <button 
          className="sidebar-logout" 
          onClick={handleSwitchUser} 
          title="Switch User"
          style={{ marginRight: '2px' }}
        >
          <RefreshCw size={16} />
        </button>
        <button className="sidebar-logout" onClick={handleLogout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
