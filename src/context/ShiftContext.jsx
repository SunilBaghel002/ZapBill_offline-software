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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showStartModal, setShowStartModal] = useState(false);

  // Check for active shift when user logs in or mounts
  useEffect(() => {
    if (isAuthenticated && user) {
      checkActiveShift();
    } else {
      setActiveShift(null);
      setShowStartModal(false);
    }
  }, [isAuthenticated, user]);

  const checkActiveShift = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await window.electronAPI.invoke('shifts:getStatus', { userId: user.id });
      if (result.success) {
        setActiveShift(result.shift);
        if (!result.shift && (user.role === 'biller' || user.role === 'cashier')) {
          // If no active shift and user is biller/cashier, prompt to start
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

  const startShift = async (startCash) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.invoke('shifts:start', { 
        userId: user.id, 
        startCash: parseFloat(startCash) 
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
        endCash: parseFloat(endCash) 
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
    loading,
    error,
    showStartModal,
    setShowStartModal,
    checkActiveShift,
    startShift,
    endShift
  };

  return (
    <ShiftContext.Provider value={value}>
      {children}
    </ShiftContext.Provider>
  );
};
