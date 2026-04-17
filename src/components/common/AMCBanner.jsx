import React from 'react';
import { useLicenseStore } from '../../stores/licenseStore';

const AMCBanner = () => {
  const { license, amcExpiredFlag } = useLicenseStore();
  
  if (!license) return null;

  const endDate = new Date(license.amc_end_date);
  const now = new Date();
  const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

  const baseStyle = {
    padding: '10px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '14px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    zIndex: 50,
    fontFamily: 'inherit'
  };

  if (amcExpiredFlag || daysRemaining < 0) {
    return (
      <div style={{ ...baseStyle, backgroundColor: '#dc2626', color: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🔴</span>
          <span style={{ fontWeight: 600 }}>AMC Expired</span>
          <span style={{ display: 'none' }} className="md-inline"> - Cloud features like reporting, sync, and QR orders may be paused. Local billing still works.</span>
        </div>
        <button style={{
          backgroundColor: '#ffffff',
          color: '#dc2626',
          padding: '6px 12px',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}>
          Renew AMC
        </button>
      </div>
    );
  }

  if (daysRemaining <= 30) {
    return (
      <div style={{ ...baseStyle, backgroundColor: '#eab308', color: '#111827' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <span style={{ fontWeight: 600 }}>AMC Warning</span>
          <span style={{ display: 'none' }} className="md-inline"> - Your AMC expires in {daysRemaining} days. Renew soon to avoid disruption of cloud features.</span>
        </div>
        <button style={{
          backgroundColor: '#111827',
          color: '#ffffff',
          padding: '6px 12px',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}>
          Renew Now
        </button>
      </div>
    );
  }

  return null;
};

export default AMCBanner;
