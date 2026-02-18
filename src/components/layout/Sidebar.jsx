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
  // ChefHat,
  RefreshCw,
  Wallet
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useShift } from '../../context/ShiftContext';
import ShiftModal from '../common/ShiftModal';

// ... imports

// ... imports

const Sidebar = () => {
  const { user, logout } = useAuthStore();
  const { endShift } = useShift();
  const navigate = useNavigate();
  const [showEndShiftModal, setShowEndShiftModal] = React.useState(false);
  // Changed from hover to toggle
  const [expandedMenu, setExpandedMenu] = React.useState(null);

  const isAdmin = user?.role === 'admin';

  const [activeOrdersCount, setActiveOrdersCount] = React.useState(0);

  // ... useEffect for order count

  const allNavItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', adminOnly: false },
    { path: '/pos', icon: ShoppingCart, label: 'POS / Billing', adminOnly: false },
    { path: '/orders', icon: ClipboardList, label: 'Orders', badge: activeOrdersCount > 0 ? activeOrdersCount : null, adminOnly: false },
    { path: '/menu', icon: UtensilsCrossed, label: 'Menu', adminOnly: true },
    { path: '/kot', icon: ChefHat, label: 'Kitchen (KOT)', adminOnly: false },
    { path: '/inventory', icon: Package, label: 'Inventory', adminOnly: true },
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

  const toggleMenu = (path, e) => {
    e.preventDefault();
    setExpandedMenu(expandedMenu === path ? null : path);
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
        {navItems.map((item) => {
           if (item.children) {
             const isExpanded = expandedMenu === item.path;
             const isActive = location.pathname.startsWith(item.path);
             
             return (
               <div key={item.path}>
                 <div 
                   className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                   onClick={(e) => toggleMenu(item.path, e)}
                   style={{ cursor: 'pointer', justifyContent: 'space-between' }}
                 >
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     <item.icon size={22} className="sidebar-nav-icon" />
                     <span className="sidebar-nav-label">{item.label}</span>
                   </div>
                   <span style={{ fontSize: '10px', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                 </div>
                 
                 {isExpanded && (
                   <div style={{ background: 'rgba(0,0,0,0.03)', paddingBottom: '4px' }}>
                     {item.children.map((child) => (
                       <NavLink
                         key={child.path}
                         to={child.path}
                         className={({ isActive }) => 
                           `sidebar-nav-item ${isActive ? 'active' : ''}`
                         }
                         style={{ 
                           paddingLeft: '48px', 
                           fontSize: '13px',
                           height: '40px'
                         }}
                       >
                         <span className="sidebar-nav-label">{child.label}</span>
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
          );
        })}

        {/* End Shift Button for Billers */}
        <button
          onClick={() => setShowEndShiftModal(true)}
          className="sidebar-nav-item"
          style={{ 
            width: '100%', 
            border: 'none', 
            background: 'none', 
            cursor: 'pointer',
            marginTop: 'auto',
            color: 'var(--gray-400)'
          }}
        >
          <LogOut size={22} className="sidebar-nav-icon" />
          <span className="sidebar-nav-label">End Day</span>
        </button>
      </nav>

      <ShiftModal 
        isOpen={showEndShiftModal} 
        type="end" 
        onClose={() => setShowEndShiftModal(false)} 
      />

      {/* User Section */}
      <div className="sidebar-user">
        <div className="sidebar-user-avatar">
          {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{user?.fullName || user?.username || 'User'}</span>
          <span className="sidebar-user-role">{user?.role || 'Staff'} ({user?.role})</span>
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