import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  ClipboardList,
  Package,
  BarChart3,
  Users,
  Settings,
  Plug,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChefHat
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/pos', icon: ShoppingCart, label: 'POS / Billing', badge: null },
    { path: '/orders', icon: ClipboardList, label: 'Orders', badge: 3 },
    { path: '/menu', icon: UtensilsCrossed, label: 'Menu' },
    { path: '/kot', icon: ChefHat, label: 'Kitchen (KOT)' },
    { path: '/inventory', icon: Package, label: 'Inventory' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/users', icon: Users, label: 'Users' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="sidebar">
      {/* Logo Section */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <UtensilsCrossed size={28} />
        </div>
        <div className="sidebar-logo-text">
          <span className="sidebar-brand">PetPooja</span>
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
          {user?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{user?.username || 'User'}</span>
          <span className="sidebar-user-role">{user?.role || 'Staff'}</span>
        </div>
        <button className="sidebar-logout" onClick={logout} title="Logout">
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
