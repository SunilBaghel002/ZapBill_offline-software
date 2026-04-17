import React, { useState } from 'react';
import { useLicenseStore } from '../../stores/licenseStore';

const FeatureGate = ({ featureKey, children, fallback, fallbackType = 'hide' }) => {
  const { hasFeature, getTrialInfo } = useLicenseStore();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isEnabled = hasFeature(featureKey);
  
  if (isEnabled) {
    const trialInfo = getTrialInfo(featureKey);
    let trialBadge = null;
    if (trialInfo && trialInfo.is_trial) {
      const daysLeft = Math.ceil((new Date(trialInfo.ends_at) - new Date()) / (1000 * 60 * 60 * 24));
      trialBadge = (
        <div style={{
          position: 'absolute', top: 0, right: 0, transform: 'translate(25%, -50%)',
          backgroundColor: '#facc15', color: '#713f12', fontSize: '11px', fontWeight: 'bold',
          padding: '2px 8px', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', zIndex: 10
        }}>
          Trial: {daysLeft} days
        </div>
      );
    }

    return (
      <div style={{ position: 'relative', display: 'inline-block', width: '100%', height: '100%' }}>
        {trialBadge}
        {children}
      </div>
    );
  }

  if (fallback) {
    return fallback;
  }

  if (fallbackType === 'hide') {
    return null;
  }

  return (
    <>
      <div 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowUpgradeModal(true);
        }}
        style={{ opacity: 0.5, cursor: 'pointer', position: 'relative' }}
      >
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(249,250,251,0.1)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
        {children}
      </div>

      {showUpgradeModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '24px', maxWidth: '400px', width: '100%', position: 'relative' }}>
            <button 
              onClick={() => setShowUpgradeModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
            >
              ✕
            </button>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ margin: '0 auto 16px', display: 'flex', height: '48px', width: '48px', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', backgroundColor: '#dbeafe' }}>
                <svg style={{ height: '24px', width: '24px', color: '#2563eb' }} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px' }}>Feature Not Available</h3>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                This feature requires the Premium Plan. Upgrade your licensing or start a trial to unlock it.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                style={{ width: '100%', borderRadius: '6px', backgroundColor: '#2563eb', padding: '8px 12px', fontSize: '14px', fontWeight: '600', color: 'white', border: 'none', cursor: 'pointer' }}
                onClick={() => alert("Redirecting to Admin Panel for Trial Activation...")}
              >
                Start Free Trial - 7 Days
              </button>
              <button 
                style={{ width: '100%', borderRadius: '6px', backgroundColor: 'white', padding: '8px 12px', fontSize: '14px', fontWeight: '600', color: '#111827', border: '1px solid #d1d5db', cursor: 'pointer' }}
                onClick={() => setShowUpgradeModal(false)}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FeatureGate;
