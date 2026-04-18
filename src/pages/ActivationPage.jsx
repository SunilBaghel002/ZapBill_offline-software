import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLicenseStore } from '../stores/licenseStore';
import { Key, ShieldCheck } from 'lucide-react';

const ActivationPage = () => {
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseSecret, setLicenseSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { activate, hardwareId, isInitialized, init } = useLicenseStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isInitialized) {
      init();
    }
  }, [isInitialized, init]);

  const handleActivate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await activate({ licenseKey, licenseSecret });
      if (result.success) {
        navigate('/login', { replace: true });
      } else {
        setError(result.error || 'Activation failed');
      }
    } catch (err) {
      setError('An error occurred during activation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
        width: '100%',
        maxWidth: '440px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* Header Section */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '64px',
            width: '64px',
            borderRadius: '50%',
            background: '#e0e7ff'
          }}>
            <ShieldCheck size={32} style={{ color: '#4f46e5' }} />
          </div>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '800',
            color: '#102a43',
            margin: '0 0 8px 0',
            letterSpacing: '-0.5px'
          }}>
            ⚡ ZapBill Activation
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#627d98',
            margin: 0,
            lineHeight: '1.5'
          }}>
            Securely register your device to unlock Premium POS functionalities.
          </p>
        </div>

        {/* Error Badge */}
        {error && (
          <div style={{
            padding: '12px 16px',
            background: '#fee2e2',
            borderLeft: '4px solid #ef4444',
            borderRadius: '6px',
            color: '#b91c1c',
            fontSize: '13px',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Form Section */}
        <form onSubmit={handleActivate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label" style={{ fontWeight: '600', color: '#334e68' }}>
              License Key
            </label>
            <input
              required
              type="text"
              className="input"
              style={{ padding: '12px 16px', fontSize: '15px' }}
              placeholder="ZB-XXXX-XXXX-XXXX"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label" style={{ fontWeight: '600', color: '#334e68' }}>
              License Secret
            </label>
            <input
              required
              type="password"
              className="input"
              style={{ padding: '12px 16px', fontSize: '15px', letterSpacing: '2px' }}
              placeholder="••••••••••••••••"
              value={licenseSecret}
              onChange={(e) => setLicenseSecret(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#4f46e5',
              color: 'white',
              fontSize: '16px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: '8px',
              boxShadow: '0 4px 6px rgba(79, 70, 229, 0.25)',
              transition: 'all 0.2s ease-in-out'
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#4338ca')}
            onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = '#4f46e5')}
          >
            {loading ? 'Verifying...' : 'Activate Device'}
          </button>
        </form>

        {/* Footer info */}
        <div style={{
          textAlign: 'center',
          borderTop: '1px solid #f0f4f8',
          paddingTop: '20px',
          marginTop: '8px'
        }}>
          <p style={{ fontSize: '11px', color: '#829ab1', margin: '0 0 8px 0', fontFamily: 'monospace' }}>
            HWID: {hardwareId || 'Fetching...'}
          </p>
          <p style={{ fontSize: '13px', color: '#627d98', margin: 0 }}>
            Need help?{' '}
            <span style={{ color: '#4f46e5', fontWeight: '600', cursor: 'pointer' }}>
              Contact Support
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ActivationPage;
