import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import POSPage from './pages/POSPage';
import MenuPage from './pages/MenuPage';
import OrdersPage from './pages/OrdersPage';
import InventoryPage from './pages/InventoryPage';
import KOTPage from './pages/KOTPage';
import ReportsPage from './pages/ReportsPage';
// import UsersPage from './pages/UsersPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import PrintersPage from './pages/PrintersPage';
import ExpensesPage from './pages/ExpensesPage';
import DiscountsPage from './pages/DiscountsPage';

// Components
import Layout from './components/common/Layout';

// Protected Route wrapper
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Debug role check - Case insensitive
  const normalizeRole = (r) => r?.toLowerCase() || '';
  const userRole = normalizeRole(user?.role);
  const normalizedAllowed = allowedRoles.map(normalizeRole);

  if (allowedRoles.length > 0 && !normalizedAllowed.includes(userRole)) {
    // console.log('Access denied. User role:', user?.role, 'Allowed:', allowedRoles);
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

import { ShiftProvider, useShift } from './context/ShiftContext';
import ShiftModal from './components/common/ShiftModal';
import DayOpeningModal from './components/common/DayOpeningModal';

// Component to handle shift logic and modal
const ShiftManager = ({ children }) => {
  const { showStartModal, setShowStartModal, showDayModal, setShowDayModal } = useShift();
  
  return (
    <>
      {children}
      <DayOpeningModal 
        isOpen={showDayModal} 
        onClose={() => setShowDayModal(false)}
      />
      <ShiftModal 
        isOpen={showStartModal} 
        type="start" 
        onClose={() => setShowStartModal(false)} // Optional: force start?
      />
    </>
  );
};

function App() {
  // Apply system zoom on mount
  React.useEffect(() => {
    const applyZoom = async () => {
      try {
        const settings = await window.electronAPI.invoke('settings:getAll');
        if (Array.isArray(settings)) {
          const zoom = settings.find(s => s.key === 'system_zoom')?.value;
          if (zoom && window.electronAPI?.setZoomFactor) {
            window.electronAPI.setZoomFactor(parseFloat(zoom) / 100);
          }
        }
      } catch (err) {
        console.error('Failed to apply zoom:', err);
      }
    };
    applyZoom();
  }, []);

  return (
    <ShiftProvider>
      <Router>
        <ShiftManager>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="pos" element={<POSPage />} />
              <Route path="menu" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <MenuPage />
                </ProtectedRoute>
              } />
              <Route path="inventory" element={
                <ProtectedRoute allowedRoles={['admin', 'biller', 'cashier']}>
                  <InventoryPage />
                </ProtectedRoute>
              } />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="kot" element={<KOTPage />} />
              <Route path="reports" element={
                <ProtectedRoute allowedRoles={['admin', 'biller', 'cashier']}>
                  <ReportsPage />
                </ProtectedRoute>
              } />
              <Route path="users" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UsersPage />
                </ProtectedRoute>
              } />
              <Route path="printers" element={
                <ProtectedRoute allowedRoles={['admin', 'biller', 'cashier']}>
                  <PrintersPage />
                </ProtectedRoute>
              } />
              <Route path="settings" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <SettingsPage />
                </ProtectedRoute>
              } />
              <Route path="discounts" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DiscountsPage />
                </ProtectedRoute>
              } />
              <Route path="expenses" element={
                <ProtectedRoute allowedRoles={['admin', 'biller', 'cashier']}>
                  <ExpensesPage />
                </ProtectedRoute>
              } />
            </Route>
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ShiftManager>
      </Router>
    </ShiftProvider>
  );
}

export default App;
