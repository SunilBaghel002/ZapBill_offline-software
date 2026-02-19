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

// Component to handle shift logic and modal
const ShiftManager = ({ children }) => {
  const { showStartModal, setShowStartModal } = useShift();
  
  return (
    <>
      {children}
      <ShiftModal 
        isOpen={showStartModal} 
        type="start" 
        onClose={() => setShowStartModal(false)} // Optional: force start?
      />
    </>
  );
};

function App() {
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
                <ProtectedRoute allowedRoles={['admin']}>
                  <InventoryPage />
                </ProtectedRoute>
              } />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="kot" element={<KOTPage />} />
              <Route path="reports" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ReportsPage />
                </ProtectedRoute>
              } />
              <Route path="users" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UsersPage />
                </ProtectedRoute>
              } />
              <Route path="printers" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <PrintersPage />
                </ProtectedRoute>
              } />
              <Route path="settings" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <SettingsPage />
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
