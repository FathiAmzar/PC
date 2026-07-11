import React, { useState, useEffect } from 'react';
import { X, Key, Save, AlertCircle, CheckCircle } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, onSave, savedKey }) {
  const [apiKey, setApiKey] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  const [statusType, setStatusType] = useState('success');

  useEffect(() => {
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, [savedKey, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    onSave(apiKey.trim());
    setStatusType(apiKey.trim() ? 'success' : 'removed');
    setShowStatus(true);
    setTimeout(() => {
      setShowStatus(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close settings">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            <div className="alert-banner alert-banner-info">
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

            {showStatus && (
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  color: statusType === 'success' ? 'var(--success)' : 'var(--warning)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginTop: '1rem'
                }}
              >
                <CheckCircle size={16} />
                {statusType === 'success' ? 'API Key saved successfully!' : 'API Key removed.'}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              <Save size={16} />
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
