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
import EmailReportsPage from './pages/EmailReportsPage';
import SettingsPage from './pages/SettingsPage';
import PrintersPage from './pages/PrintersPage';
import ExpensesPage from './pages/ExpensesPage';
import DiscountsPage from './pages/DiscountsPage';
import QROrdersPage from './pages/QROrdersPage';
import WebsiteOrdersPage from './pages/WebsiteOrdersPage';

// Components
import Layout from './components/common/Layout';
import CustomAlert from './components/ui/CustomAlert';
import NetworkStatusBar from './components/layout/NetworkStatusBar';
import { useAlertStore } from './stores/alertStore';
import { useLicenseStore } from './stores/licenseStore';
import ActivationPage from './pages/ActivationPage';
import AMCBanner from './components/common/AMCBanner';

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

// License Check wrapper
const LicenseWrapper = ({ children }) => {
  const { isInitialized, license, init } = useLicenseStore();
  
  React.useEffect(() => {
    if (!isInitialized) {
      init();
    }
  }, [isInitialized, init]);

  React.useEffect(() => {
    if (window.electronAPI) {
      const unsubscribe = window.electronAPI.on('license:revoked', () => {
        useLicenseStore.setState({ license: null });
        if (useAuthStore.getState().logout) {
           useAuthStore.getState().logout();
        }
      });
      return () => unsubscribe();
    }
  }, []);

  if (!isInitialized) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  if (!license) {
    return <Navigate to="/activate" replace />;
  }

  return children;
};

export const RouteFallback = ({ featureName }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', height: '100%', padding: '32px', boxSizing: 'border-box', backgroundColor: 'transparent' }}>
    <div style={{ maxWidth: '440px', width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0,0,0,0.05)', padding: '40px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.4)' }}>
       <div style={{ margin: '0 auto 24px', display: 'flex', height: '80px', width: '80px', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'linear-gradient(135deg, #ff6b6b, #ef4444)', boxShadow: '0 10px 20px rgba(239, 68, 68, 0.3)' }}>
         <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="16" r="2" fill="white"/>
         </svg>
       </div>
       <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '12px', color: '#111827', marginTop: 0, fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.5px' }}>Access Denied</h2>
       <p style={{ color: '#4b5563', marginBottom: '16px', fontWeight: '500', fontSize: '15px', lineHeight: '1.6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>You currently do not have access to the <strong style={{color: '#111827'}}>{featureName}</strong> plugin.</p>
       
       <div style={{ margin: '24px 0', padding: '20px', backgroundColor: '#fef2f2', borderRadius: '16px', border: '1px solid #fee2e2' }}>
         <p style={{ color: '#991b1b', margin: 0, fontSize: '14.5px', lineHeight: '1.6', fontWeight: '500' }}>
           You can't use these features right now. Please connect to your provider and then contact below:
           <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '12px', fontSize: '22px', fontWeight: '900', letterSpacing: '1px', color: '#7f1d1d' }}>
             <span style={{ marginRight: '8px' }}>📞</span> 9310065542
           </span>
         </p>
       </div>

       <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
         <button onClick={() => window.history.back()} style={{ backgroundColor: '#111827', color: 'white', borderRadius: '12px', padding: '14px 20px', width: '100%', fontWeight: '600', fontSize: '15px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(17, 24, 39, 0.2)' }} onMouseOver={(e) => e.target.style.transform='translateY(-1px)'} onMouseOut={(e) => e.target.style.transform='translateY(0)'}>Go Back</button>
       </div>
    </div>
  </div>
);

import { ShiftProvider, useShift } from './context/ShiftContext';
import ShiftModal from './components/common/ShiftModal';
import DayOpeningModal from './components/common/DayOpeningModal';
import FeatureGate from './components/common/FeatureGate';

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

  const { isOpen, message, type, onConfirm, hideAlert, showAlert } = useAlertStore();

  // Expose showAlert globally to replace window.alert
  React.useEffect(() => {
    window.showAlert = showAlert;
  }, [showAlert]);

  React.useEffect(() => {
    if (!window.electronAPI || !window.electronAPI.on) return;
    
    const unsubs = [];
    
    const onForceLogout = window.electronAPI.on('admin:forceLogout', (data) => {
      showAlert(data.message || 'Your account has been suspended by admin.', 'error');
      useAuthStore.getState().logout();
      useLicenseStore.getState().sync();
    });
    if (onForceLogout) unsubs.push(onForceLogout);

    const onAmcUpdated = window.electronAPI.on('admin:amcUpdated', () => {
      showAlert('Your AMC status has been updated by admin.', 'info');
      useLicenseStore.getState().sync();
    });
    if (onAmcUpdated) unsubs.push(onAmcUpdated);

    const onActivated = window.electronAPI.on('admin:activated', (data) => {
      showAlert(data.message || 'Your account has been re-activated.', 'success');
      useLicenseStore.getState().sync();
    });
    if (onActivated) unsubs.push(onActivated);

    return () => {
      unsubs.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') unsubscribe();
      });
    };
  }, [showAlert]);

  return (
    <>
      <CustomAlert 
        isOpen={isOpen}
        message={message}
        type={type}
        onClose={hideAlert}
        onConfirm={onConfirm}
      />
      <ShiftProvider>
      <Router>
        <ShiftManager>
          <Routes>
            {/* Public routes */}
            <Route path="/activate" element={<ActivationPage />} />
            <Route path="/login" element={
              <LicenseWrapper>
                <LoginPage />
              </LicenseWrapper>
            } />
            
            {/* Protected routes */}
            <Route path="/" element={
              <LicenseWrapper>
                <ProtectedRoute>
                  <div className="flex flex-col h-screen w-full">
                    <AMCBanner />
                    <div className="flex-1 overflow-hidden">
                      <Layout />
                    </div>
                    <NetworkStatusBar />
                  </div>
                </ProtectedRoute>
              </LicenseWrapper>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="pos" element={<POSPage />} />
              <Route path="menu" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <FeatureGate featureKey="menu_management" fallback={<RouteFallback featureName="Menu Management" />}>
                    <MenuPage />
                  </FeatureGate>
                </ProtectedRoute>
              } />
              <Route path="inventory" element={
                <ProtectedRoute allowedRoles={['admin', 'biller', 'cashier']}>
                  <FeatureGate featureKey="inventory" fallback={<RouteFallback featureName="Inventory Management" />}>
                    <InventoryPage />
                  </FeatureGate>
                </ProtectedRoute>
              } />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="qr-orders" element={
                <FeatureGate featureKey="qr_order" fallback={<RouteFallback featureName="QR Order System" />}>
                  <QROrdersPage />
                </FeatureGate>
              } />
              <Route path="website-orders" element={
                <FeatureGate featureKey="website_orders" fallback={<RouteFallback featureName="Website Orders" />}>
                  <WebsiteOrdersPage />
                </FeatureGate>
              } />
              <Route path="kot" element={
                <FeatureGate featureKey="kitchen_display" fallback={<RouteFallback featureName="Kitchen Display System (KOT)" />}>
                  <KOTPage />
                </FeatureGate>
              } />
              <Route path="reports" element={
                <ProtectedRoute allowedRoles={['admin', 'biller', 'cashier']}>
                  <FeatureGate featureKey="email_reports" fallback={<RouteFallback featureName="Advanced Reports" />}>
                    <ReportsPage />
                  </FeatureGate>
                </ProtectedRoute>
              } />
              <Route path="email-reports" element={
                  <FeatureGate featureKey="email_reports" fallback={<RouteFallback featureName="Automated Email Reports" />}>
                    <EmailReportsPage />
                  </FeatureGate>
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
                  <FeatureGate featureKey="expense_management" fallback={<RouteFallback featureName="Expense Management" />}>
                    <ExpensesPage />
                  </FeatureGate>
                </ProtectedRoute>
              } />
            </Route>
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ShiftManager>
      </Router>
    </ShiftProvider>
    </>
  );
}

export default App;
