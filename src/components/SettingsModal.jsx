import React, { useState, useEffect } from 'react';
import { X, Key, Save, AlertCircle, CheckCircle, User, LogIn, LogOut, UserPlus, ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function SettingsModal({ isOpen, onClose, onSaveApiKey, savedApiKey, currentUser, onAuthChange }) {
  const [activeSettingsTab, setActiveSettingsTab] = useState('api'); // 'api' or 'auth'
  
  // API Key State
  const [apiKey, setApiKey] = useState('');
  const [showApiStatus, setShowApiStatus] = useState(false);
  const [apiStatusType, setApiStatusType] = useState('success');

  // Auth State
  const [authTab, setAuthTab] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  useEffect(() => {
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, [savedApiKey, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setAuthError('');
      setAuthSuccess('');
      setEmail('');
      setPassword('');
    }
  }, [isOpen, activeSettingsTab]);

  if (!isOpen) return null;

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    onSaveApiKey(apiKey.trim());
    setApiStatusType(apiKey.trim() ? 'success' : 'removed');
    setShowApiStatus(true);
    setTimeout(() => {
      setShowApiStatus(false);
    }, 1500);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setAuthError('Please fill in all fields.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      setAuthSuccess('Logged in successfully!');
      onAuthChange(data.user);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setAuthError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setAuthError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      // Note: Supabase might require email confirmation.
      if (data.session) {
        setAuthSuccess('Account created and logged in!');
        onAuthChange(data.user);
        setTimeout(() => onClose(), 1000);
      } else {
        setAuthSuccess('Registration successful! Please check your email for a confirmation link, or try logging in.');
        setAuthTab('login');
      }
    } catch (err) {
      setAuthError(err.message || 'Sign up failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      onAuthChange(null);
      setAuthSuccess('Logged out successfully.');
      setTimeout(() => {
        setAuthSuccess('');
      }, 1500);
    } catch (err) {
      setAuthError(err.message || 'Logout failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ paddingBottom: '0.75rem' }}>
          <h2 className="modal-title">Settings</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close settings">
            <X size={20} />
          </button>
        </div>

        {/* Inner Settings Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', padding: '0 2rem' }}>
          <button
            type="button"
            onClick={() => setActiveSettingsTab('api')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeSettingsTab === 'api' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeSettingsTab === 'api' ? '#fff' : 'var(--text-secondary)',
              padding: '0.75rem 1.5rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
          >
            Gemini AI Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveSettingsTab('auth')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeSettingsTab === 'auth' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeSettingsTab === 'auth' ? '#fff' : 'var(--text-secondary)',
              padding: '0.75rem 1.5rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
          >
            Cloud Database Sync
          </button>
        </div>

        <div className="modal-body" style={{ paddingTop: '1.5rem' }}>
          
          {/* TAB 1: Gemini AI Key settings */}
          {activeSettingsTab === 'api' && (
            <form onSubmit={handleSaveApiKey}>
              <div className="alert-banner alert-banner-info" style={{ marginBottom: '1.5rem' }}>
                <AlertCircle size={16} className="alert-banner-icon" />
                <div>
                  <strong>Gemini API Key:</strong> The key is used to auto-populate PC specifications from build text descriptions or photos. Your key is stored locally in your browser's storage and is only sent directly to Google's Gemini API endpoints.
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="api-key-input" className="form-label">
                  Gemini API Key
                </label>
                <div style={{ position: 'relative' }}>
                  <Key size={18} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    id="api-key-input"
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Don't have an API key? You can get a free one from the{' '}
                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--primary)', textDecoration: 'none' }}
                  >
                    Google AI Studio
                  </a>.
                </p>
              </div>

              {showApiStatus && (
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    color: apiStatusType === 'success' ? 'var(--success)' : 'var(--warning)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    margin: '1rem 0'
                  }}
                >
                  <CheckCircle size={16} />
                  {apiStatusType === 'success' ? 'API Key saved successfully!' : 'API Key removed.'}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary btn-sm">
                  <Save size={16} />
                  Save API Settings
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Supabase database sync credentials / login */}
          {activeSettingsTab === 'auth' && (
            <div>
              {currentUser ? (
                // User is already logged in
                <div className="animate-scaleIn">
                  <div className="alert-banner alert-banner-info" style={{ marginBottom: '1.5rem', background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.25)', color: '#a7f3d0' }}>
                    <ShieldCheck size={16} className="alert-banner-icon" style={{ color: 'var(--success)' }} />
                    <div>
                      <strong>Logged In and Synced:</strong> You are currently signed in as <strong>{currentUser.email}</strong>. All PC comparison configurations will be saved automatically to the cloud and synced across all your devices in real-time.
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                      <User size={18} />
                      <span>Account: {currentUser.email}</span>
                    </div>

                    <button 
                      type="button" 
                      className="btn btn-danger btn-sm" 
                      onClick={handleLogout} 
                      disabled={authLoading}
                      style={{ width: '100%', maxWidth: '200px' }}
                    >
                      {authLoading ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                      Log Out
                    </button>
                  </div>
                </div>
              ) : (
                // User is logged out, show Login / Sign Up options
                <div className="animate-scaleIn">
                  <div className="alert-banner alert-banner-warning" style={{ marginBottom: '1.5rem' }}>
                    <AlertCircle size={16} className="alert-banner-icon" />
                    <div>
                      <strong>Cloud Sync Inactive:</strong> You are currently in Guest Mode. Your configurations are saved in your local browser storage. Log in or create a free account to sync builds to the cloud.
                    </div>
                  </div>

                  {/* Auth Tabs */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.25rem', borderRadius: '10px' }}>
                    <button
                      type="button"
                      className={`btn btn-secondary btn-sm`}
                      style={{ flex: 1, border: 'none', background: authTab === 'login' ? 'rgba(255,255,255,0.06)' : 'none', color: authTab === 'login' ? '#fff' : 'var(--text-secondary)' }}
                      onClick={() => { setAuthTab('login'); setAuthError(''); setAuthSuccess(''); }}
                    >
                      <LogIn size={14} style={{ marginRight: '4px' }} />
                      Log In
                    </button>
                    <button
                      type="button"
                      className={`btn btn-secondary btn-sm`}
                      style={{ flex: 1, border: 'none', background: authTab === 'signup' ? 'rgba(255,255,255,0.06)' : 'none', color: authTab === 'signup' ? '#fff' : 'var(--text-secondary)' }}
                      onClick={() => { setAuthTab('signup'); setAuthError(''); setAuthSuccess(''); }}
                    >
                      <UserPlus size={14} style={{ marginRight: '4px' }} />
                      Sign Up
                    </button>
                  </div>

                  {/* Auth Form */}
                  <form onSubmit={authTab === 'login' ? handleLogin : handleSignUp}>
                    <div className="form-group">
                      <label htmlFor="auth-email-input" className="form-label">Email Address</label>
                      <input
                        id="auth-email-input"
                        type="email"
                        className="form-input"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="auth-pass-input" className="form-label">Password</label>
                      <input
                        id="auth-pass-input"
                        type="password"
                        className="form-input"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      {authTab === 'signup' && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Password must be at least 6 characters.
                        </p>
                      )}
                    </div>

                    {authError && (
                      <div style={{ color: 'var(--error)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', gap: '0.375rem', alignItems: 'center', margin: '1rem 0' }}>
                        <AlertCircle size={14} />
                        {authError}
                      </div>
                    )}

                    {authSuccess && (
                      <div style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', gap: '0.375rem', alignItems: 'center', margin: '1rem 0' }}>
                        <CheckCircle size={14} />
                        {authSuccess}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={authLoading}>
                        {authLoading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            {authTab === 'login' ? 'Logging in...' : 'Signing up...'}
                          </>
                        ) : (
                          <>
                            {authTab === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
                            {authTab === 'login' ? 'Log In' : 'Create Account'}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
