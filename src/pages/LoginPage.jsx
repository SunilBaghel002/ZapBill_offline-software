import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { UtensilsCrossed, User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState('password'); // 'password' or 'pin'
  const [pin, setPin] = useState('');
  
  const { login, loginWithPin, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    
    let result;
    if (loginMode === 'password') {
      result = await login(username, password);
    } else {
      result = await loginWithPin(pin);
    }
    
    if (result.success) {
      navigate('/pos');
    }
  };

  const handlePinInput = (digit) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
    }
  };

  const handlePinClear = () => {
    setPin('');
  };

  const handlePinBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--primary-900) 0%, var(--gray-900) 100%)',
      padding: 'var(--spacing-4)',
    }}>
      <div className="card" style={{ 
        width: '100%', 
        maxWidth: '420px',
        animation: 'slideUp 0.3s ease'
      }}>
        {/* Header */}
        <div style={{
          padding: 'var(--spacing-8)',
          textAlign: 'center',
          background: 'linear-gradient(135deg, var(--primary-600), var(--primary-700))',
          color: 'white',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--spacing-4)',
          }}>
            <UtensilsCrossed size={40} />
          </div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--spacing-2)' }}>
            Restaurant POS
          </h1>
          <p style={{ opacity: 0.9, fontSize: 'var(--font-size-sm)' }}>
            Sign in to continue
          </p>
        </div>

        {/* Login Mode Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--gray-200)',
        }}>
          <button
            type="button"
            onClick={() => { setLoginMode('password'); clearError(); }}
            style={{
              flex: 1,
              padding: 'var(--spacing-3)',
              border: 'none',
              background: loginMode === 'password' ? 'var(--primary-50)' : 'transparent',
              color: loginMode === 'password' ? 'var(--primary-700)' : 'var(--gray-500)',
              fontWeight: 600,
              cursor: 'pointer',
              borderBottom: loginMode === 'password' ? '2px solid var(--primary-600)' : '2px solid transparent',
            }}
          >
            Password Login
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('pin'); clearError(); }}
            style={{
              flex: 1,
              padding: 'var(--spacing-3)',
              border: 'none',
              background: loginMode === 'pin' ? 'var(--primary-50)' : 'transparent',
              color: loginMode === 'pin' ? 'var(--primary-700)' : 'var(--gray-500)',
              fontWeight: 600,
              cursor: 'pointer',
              borderBottom: loginMode === 'pin' ? '2px solid var(--primary-600)' : '2px solid transparent',
            }}
          >
            Quick PIN
          </button>
        </div>

        {/* Form */}
        <div className="card-body">
          {/* Error Message */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-2)',
              padding: 'var(--spacing-3)',
              background: 'var(--error-50)',
              color: 'var(--error-700)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 'var(--spacing-4)',
              fontSize: 'var(--font-size-sm)',
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {loginMode === 'password' ? (
            <form onSubmit={handleSubmit}>
              <div className="input-group" style={{ marginBottom: 'var(--spacing-4)' }}>
                <label className="input-label">Username</label>
                <div style={{ position: 'relative' }}>
                  <User 
                    size={18} 
                    style={{ 
                      position: 'absolute', 
                      left: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: 'var(--gray-400)'
                    }} 
                  />
                  <input
                    type="text"
                    className="input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    style={{ paddingLeft: '40px' }}
                    required
                  />
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: 'var(--spacing-6)' }}>
                <label className="input-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock 
                    size={18} 
                    style={{ 
                      position: 'absolute', 
                      left: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: 'var(--gray-400)'
                    }} 
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    style={{ paddingLeft: '40px', paddingRight: '40px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--gray-400)',
                      padding: '4px',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-lg w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <div>
              {/* PIN Display */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 'var(--spacing-3)',
                marginBottom: 'var(--spacing-6)',
              }}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: 'var(--radius-lg)',
                      border: '2px solid var(--gray-300)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'var(--font-size-2xl)',
                      fontWeight: 700,
                      background: pin[i] ? 'var(--primary-50)' : 'white',
                      borderColor: pin[i] ? 'var(--primary-500)' : 'var(--gray-300)',
                    }}
                  >
                    {pin[i] ? '•' : ''}
                  </div>
                ))}
              </div>

              {/* PIN Keypad */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 'var(--spacing-2)',
                maxWidth: '260px',
                margin: '0 auto',
              }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (key === 'C') handlePinClear();
                      else if (key === '⌫') handlePinBackspace();
                      else handlePinInput(key.toString());
                    }}
                    style={{
                      padding: 'var(--spacing-4)',
                      fontSize: 'var(--font-size-xl)',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: 'var(--radius-lg)',
                      background: typeof key === 'number' ? 'var(--gray-100)' : 'var(--gray-200)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                    onMouseOver={(e) => e.target.style.background = 'var(--gray-200)'}
                    onMouseOut={(e) => e.target.style.background = typeof key === 'number' ? 'var(--gray-100)' : 'var(--gray-200)'}
                  >
                    {key}
                  </button>
                ))}
              </div>

              {/* Submit PIN */}
              <button 
                type="button"
                className="btn btn-primary btn-lg w-full"
                style={{ marginTop: 'var(--spacing-6)' }}
                disabled={isLoading || pin.length !== 4}
                onClick={handleSubmit}
              >
                {isLoading ? 'Signing in...' : 'Sign In with PIN'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: 'var(--spacing-4)',
          textAlign: 'center',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--gray-500)',
          borderTop: '1px solid var(--gray-200)',
        }}>
          Default credentials: admin / admin123 (PIN: 1234)
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
