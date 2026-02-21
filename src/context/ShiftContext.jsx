import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

const ShiftContext = createContext(null);

export const useShift = () => {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error('useShift must be used within a ShiftProvider');
  }
  return context;
};

export const ShiftProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuthStore();
  const [activeShift, setActiveShift] = useState(null);
  const [dayStatus, setDayStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);

  // Check for active shift when user logs in or mounts
  useEffect(() => {
    if (isAuthenticated && user) {
      checkActiveShift();
    } else {
      setActiveShift(null);
      setDayStatus(null);
      setShowStartModal(false);
      setShowDayModal(false);
    }
  }, [isAuthenticated, user]);

  // Periodic check for day change (midnight transition)
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const interval = setInterval(() => {
      const today = new Date().toISOString().split('T')[0];
      if (dayStatus && dayStatus.business_date !== today) {
        checkActiveShift();
      }
    }, 60000); // Check every minute

    // Also check when window regains focus
    const handleFocus = () => checkActiveShift();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, user, dayStatus]);

  const checkActiveShift = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Check Day Status FIRST
      const dayResult = await window.electronAPI.invoke('day:getStatus', {});
      if (dayResult.success) {
        setDayStatus(dayResult.status);
        if (!dayResult.status) {
          // If day not opened for today, show Day Modal and wait
          setShowDayModal(true);
          setShowStartModal(false);
          setLoading(false);
          return;
        }
      }

      // 2. Check individual shift status
      const result = await window.electronAPI.invoke('shifts:getStatus', { userId: user.id });
      if (result.success) {
        setActiveShift(result.shift);
        if (!result.shift && (user.role === 'biller' || user.role === 'cashier' || user.role === 'admin')) {
          // If no active shift and user can bill, prompt to start
          setShowStartModal(true);
        }
      }
    } catch (err) {
      console.error('Error checking shift status:', err);
      setError('Failed to check shift status');
    } finally {
      setLoading(false);
    }
  };

  const openDay = async (openingBalance) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.invoke('day:open', { 
        userId: user.id, 
        openingBalance: parseFloat(openingBalance || 0) 
      });
      
      if (result.success) {
        setDayStatus(result.status);
        setShowDayModal(false);
        // After day is opened, re-check shift status to show shift modal if needed
        await checkActiveShift();
        return { success: true };
      } else {
        throw new Error(result.error || 'Failed to open day');
      }
    } catch (err) {
      console.error('Error opening day:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const startShift = async (startCash) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.invoke('shifts:start', { 
        userId: user.id, 
        startCash: parseFloat(startCash || 0) 
      });
      
      if (result.id) { // Assuming successful creation returns the shift object
        setActiveShift(result);
        setShowStartModal(false);
        return { success: true };
      } else {
        throw new Error(result.error || 'Failed to start shift');
      }
    } catch (err) {
      console.error('Error starting shift:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const endShift = async (endCash) => {
    if (!user || !activeShift) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.invoke('shifts:end', { 
        userId: user.id, 
        endCash: parseFloat(endCash || 0) 
      });
      
      if (result.status === 'closed') {
        setActiveShift(null);
        return { success: true };
      } else {
        throw new Error(result.error || 'Failed to end shift');
      }
    } catch (err) {
      console.error('Error ending shift:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    activeShift,
    dayStatus,
    loading,
    error,
    showStartModal,
    showDayModal,
    setShowStartModal,
    setShowDayModal,
    checkActiveShift,
    openDay,
    startShift,
    endShift
  };

  return (
    <ShiftContext.Provider value={value}>
      {children}
    </ShiftContext.Provider>
  );
};
